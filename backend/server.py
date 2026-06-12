"""Coinberx - Turkish crypto exchange backend."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import secrets
import logging
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import httpx
import jwt
from bson import ObjectId
from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Depends,
    Request,
    Response,
    UploadFile,
    File,
    Form,
    Header,
    Query,
)
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from storage import init_storage, put_object, get_object
from email_service import send_email, render_verification, render_status
import market_data as mkt
import berx
import networks as nw

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# -------------- Config --------------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
APP_NAME = os.environ.get("APP_NAME", "coinberx")
PLATFORM_IBAN = os.environ.get("PLATFORM_IBAN", "")
PLATFORM_BANK_NAME = os.environ.get("PLATFORM_BANK_NAME", "")
PLATFORM_BANK_RECIPIENT = os.environ.get("PLATFORM_BANK_RECIPIENT", "")

mongo_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = mongo_client[os.environ["DB_NAME"]]

app = FastAPI(title="Coinberx API")
api = APIRouter(prefix="/api")

origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------- Helpers --------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_dt() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"


def make_ref_code() -> str:
    return "CB" + "".join(random.choices(string.digits, k=8))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_dt() + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def clean_user(u: dict) -> dict:
    return {
        "id": u["user_id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "user"),
        "email_verified": u.get("email_verified", False),
        "kyc_status": u.get("kyc_status", "none"),
        "two_fa_enabled": u.get("two_fa_enabled", False),
        "referral_code": u.get("referral_code"),
        "created_at": u.get("created_at"),
        "avatar_url": u.get("avatar_url"),
        "auth_provider": u.get("auth_provider", "email"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_h = request.headers.get("Authorization", "")
        if auth_h.startswith("Bearer "):
            token = auth_h[7:]

    # Google session token fallback (opaque) - look up in sessions
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
            if payload.get("type") == "access":
                user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
                if user:
                    return user
        except jwt.PyJWTError:
            pass

    # Try as opaque google session token
    session_token = request.cookies.get("session_token") or token
    if session_token:
        session = await db.sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires = session.get("expires_at")
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires)
            if expires and expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires and expires >= now_dt():
                user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
                if user:
                    return user
    raise HTTPException(status_code=401, detail="Kimlik doğrulama gerekli")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yetkisiz")
    return user


async def ensure_wallet(user_id: str):
    existing = await db.wallets.find_one({"user_id": user_id})
    if existing:
        # make sure BERX field exists
        if "BERX" not in existing.get("balances", {}):
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$set": {"balances.BERX": 0.0, "locked.BERX": 0.0}},
            )
        return
    balances = {"TRY": 0.0, "BERX": 0.0}
    for coin in mkt.SUPPORTED_COINS:
        balances[coin["symbol"]] = 0.0
    await db.wallets.insert_one(
        {
            "user_id": user_id,
            "balances": balances,
            "locked": {k: 0.0 for k in balances},
            "created_at": now_iso(),
        }
    )


def set_auth_cookies(response: Response, access_token: str):
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


# -------------- Models --------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    referral: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str


class ResendCodeIn(BaseModel):
    email: EmailStr


class WithdrawIn(BaseModel):
    amount: float
    iban: str
    bank_name: str
    account_holder: str


class DepositRequestIn(BaseModel):
    amount: float


class OrderIn(BaseModel):
    symbol: str
    side: str  # buy/sell
    order_type: str  # market/limit
    quantity: Optional[float] = None  # in coin
    amount_try: Optional[float] = None  # for market-buy by TRY
    price: Optional[float] = None  # for limit


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class WatchlistIn(BaseModel):
    symbol: str


class AdminStatusIn(BaseModel):
    status: str  # approved / rejected
    note: Optional[str] = None


class SettingsIn(BaseModel):
    kyc_enforced: Optional[bool] = None
    trading_fee: Optional[float] = None
    min_deposit_try: Optional[float] = None
    min_withdrawal_try: Optional[float] = None


class BerxAdjustIn(BaseModel):
    action: str  # "set" | "adjust"
    value: float  # absolute price for "set", percent for "adjust"


class BerxSimulationIn(BaseModel):
    enabled: Optional[bool] = None        # auto-simulation on/off
    mode: Optional[str] = None             # "manual" | "auto"
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    max_daily_change_pct: Optional[float] = None
    tick_interval_seconds: Optional[int] = None
    volatility: Optional[float] = None     # 0.001 - 0.05 (per-tick stddev)
    trend: Optional[float] = None          # -0.01 .. 0.01 drift per tick


class SupportMessageIn(BaseModel):
    subject: str
    body: str
    category: Optional[str] = "general"


class SupportReplyIn(BaseModel):
    body: str
    close: Optional[bool] = False


class TransferIn(BaseModel):
    recipient: str
    symbol: str
    amount: float
    note: Optional[str] = None


class CryptoWithdrawIn(BaseModel):
    symbol: str
    network: str
    address: str
    amount: float


class NetworkUpdateIn(BaseModel):
    fee_flat_try: Optional[float] = None
    min_withdraw_try: Optional[float] = None
    confirm_minutes: Optional[int] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    name: Optional[str] = None


class CoinNetworksIn(BaseModel):
    networks: list[str]


class PlatformAddressIn(BaseModel):
    symbol: str
    network: str
    address: str
    warning: Optional[str] = ""
    min_deposit: Optional[float] = 0.0
    deposit_enabled: Optional[bool] = True
    withdraw_enabled: Optional[bool] = True


# Live Chat -----------------------------------------------------------
class LiveChatStartIn(BaseModel):
    visitor_id: Optional[str] = None
    name: Optional[str] = None
    contact: Optional[str] = None  # email or phone
    page_url: Optional[str] = None


class LiveChatMessageIn(BaseModel):
    session_id: str
    visitor_id: Optional[str] = None  # required when no auth
    body: str


class LiveChatAdminReplyIn(BaseModel):
    body: str


class LiveChatStatusIn(BaseModel):
    status: str  # open | pending | closed


DEFAULT_SETTINGS = {
    "kyc_enforced": True,
    "trading_fee": 0.001,
    "min_deposit_try": 50.0,
    "min_withdrawal_try": 100.0,
    "transfer_fee_pct": 0.0005,
}


async def get_settings() -> dict:
    doc = await db.system_settings.find_one({"_id": "global"})
    if not doc:
        await db.system_settings.insert_one({"_id": "global", **DEFAULT_SETTINGS})
        return DEFAULT_SETTINGS.copy()
    return {**DEFAULT_SETTINGS, **{k: v for k, v in doc.items() if k != "_id"}}


# -------------- Admin Activity Logging --------------
async def log_admin_action(
    admin: dict,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
):
    """Persist an admin activity log entry. Best-effort, never raises."""
    try:
        ip = ""
        ua = ""
        if request is not None:
            ip = request.client.host if request.client else ""
            fwd = request.headers.get("x-forwarded-for")
            if fwd:
                ip = fwd.split(",")[0].strip()
            ua = (request.headers.get("user-agent") or "")[:240]
        await db.admin_activity_logs.insert_one(
            {
                "log_id": new_id("log_"),
                "admin_user_id": admin.get("user_id"),
                "admin_email": admin.get("email"),
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details or {},
                "ip_address": ip,
                "user_agent": ua,
                "created_at": now_iso(),
            }
        )
    except Exception as e:
        logger.warning("admin log failed: %s", e)


# -------------- Auth routes --------------
@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta ile zaten bir hesap var")
    user_id = new_id("usr_")
    code = "".join(random.choices(string.digits, k=6))
    referral_code = "CB" + secrets.token_hex(3).upper()
    doc = {
        "user_id": user_id,
        "email": email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": "user",
        "email_verified": False,
        "verification_code": code,
        "verification_expiry": (now_dt() + timedelta(minutes=30)).isoformat(),
        "kyc_status": "none",
        "two_fa_enabled": False,
        "auth_provider": "email",
        "referral_code": referral_code,
        "referred_by": data.referral,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await ensure_wallet(user_id)
    # referral bonus demo: credit 10 TRY on referrer upon registration
    if data.referral:
        await db.wallets.update_one(
            {"user_id": data.referral}, {"$inc": {"balances.TRY": 10.0}}
        )
    await send_email(email, "Coinberx E-posta Doğrulama", render_verification(code, data.name))
    token = create_access_token(user_id, email)
    set_auth_cookies(response, token)
    return {"user": clean_user(doc), "token": token}


@api.post("/auth/login")
async def login(data: LoginIn, response: Response, request: Request):
    email = data.email.lower()
    ident = f"{request.client.host}:{email}"
    # brute force check
    attempts = await db.login_attempts.find_one({"identifier": ident})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = attempts.get("locked_until")
        if locked_until:
            lu = datetime.fromisoformat(locked_until) if isinstance(locked_until, str) else locked_until
            if lu.tzinfo is None:
                lu = lu.replace(tzinfo=timezone.utc)
            if lu > now_dt():
                raise HTTPException(status_code=429, detail="Çok fazla hatalı deneme, lütfen 15 dk bekleyin")
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": (now_dt() + timedelta(minutes=15)).isoformat()},
            },
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    await db.login_attempts.delete_one({"identifier": ident})
    await ensure_wallet(user["user_id"])
    # log login
    await db.login_history.insert_one(
        {
            "user_id": user["user_id"],
            "ip": request.client.host,
            "user_agent": request.headers.get("User-Agent", ""),
            "at": now_iso(),
        }
    )
    token = create_access_token(user["user_id"], email)
    set_auth_cookies(response, token)
    return {"user": clean_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean_user(user)


@api.post("/auth/verify-email")
async def verify_email(data: VerifyEmailIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    if user.get("email_verified"):
        return {"ok": True, "message": "Zaten doğrulanmış"}
    if user.get("verification_code") != data.code:
        raise HTTPException(status_code=400, detail="Kod hatalı")
    expiry = user.get("verification_expiry")
    if expiry and datetime.fromisoformat(expiry) < now_dt():
        raise HTTPException(status_code=400, detail="Kodun süresi dolmuş")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_code": "", "verification_expiry": ""}},
    )
    return {"ok": True}


@api.post("/auth/resend-code")
async def resend_code(data: ResendCodeIn):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    code = "".join(random.choices(string.digits, k=6))
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"verification_code": code, "verification_expiry": (now_dt() + timedelta(minutes=30)).isoformat()}},
    )
    await send_email(user["email"], "Coinberx E-posta Doğrulama", render_verification(code, user.get("name", "")))
    return {"ok": True}


# Google (Emergent) auth callback — REMOVED: sadece e-posta+şifre desteği kaldı
@api.post("/auth/google/session")
async def google_session_disabled():
    raise HTTPException(status_code=410, detail="Google ile giriş kaldırıldı")


# -------------- Profile --------------
@api.patch("/user/profile")
async def update_profile(data: ProfileUpdateIn, user: dict = Depends(get_current_user)):
    upd = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return clean_user(fresh)


@api.get("/user/login-history")
async def login_history(user: dict = Depends(get_current_user)):
    rows = await db.login_history.find({"user_id": user["user_id"]}, {"_id": 0}).sort("at", -1).limit(20).to_list(20)
    return rows


# -------------- KYC --------------
@api.post("/kyc/upload")
async def kyc_upload(
    id_front: UploadFile = File(...),
    id_back: UploadFile = File(...),
    selfie: UploadFile = File(...),
    id_number: str = Form(...),
    full_name: str = Form(...),
    birth_date: str = Form(...),
    user: dict = Depends(get_current_user),
):
    uploads = {}
    for field, upl in [("id_front", id_front), ("id_back", id_back), ("selfie", selfie)]:
        data = await upl.read()
        if len(data) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"{field}: dosya 8MB üzerinde")
        ext = (upl.filename or "jpg").split(".")[-1]
        path = f"{APP_NAME}/kyc/{user['user_id']}/{field}_{uuid.uuid4().hex[:8]}.{ext}"
        try:
            put_object(path, data, upl.content_type or "image/jpeg")
        except Exception as exc:
            logger.error("kyc upload failed: %s", exc)
            raise HTTPException(status_code=500, detail="Belge yüklenemedi")
        uploads[field] = path

    kyc_id = new_id("kyc_")
    await db.kyc_requests.insert_one(
        {
            "kyc_id": kyc_id,
            "user_id": user["user_id"],
            "id_number": id_number,
            "full_name": full_name,
            "birth_date": birth_date,
            "files": uploads,
            "status": "pending",
            "created_at": now_iso(),
        }
    )
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"kyc_status": "pending"}})
    return {"ok": True, "kyc_id": kyc_id}


@api.get("/kyc/status")
async def kyc_status(user: dict = Depends(get_current_user)):
    req = await db.kyc_requests.find_one(
        {"user_id": user["user_id"]}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return {"status": user.get("kyc_status", "none"), "request": req}


@api.get("/files/{path:path}")
async def file_proxy(path: str, auth: Optional[str] = Query(None), request: Request = None):
    # Simple access check using access token cookie or query param auth
    token = request.cookies.get("access_token") or auth
    if not token:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Yetkisiz")
    # owner or admin only
    if not path.startswith(f"{APP_NAME}/kyc/{user_id}/") and not path.startswith(
        f"{APP_NAME}/dekont/{user_id}/"
    ) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Yetkisiz dosya")
    try:
        content, ctype = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FastAPIResponse(content=content, media_type=ctype)


# -------------- Wallet --------------
@api.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    await ensure_wallet(user["user_id"])
    w = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    tickers = await mkt.fetch_all_tickers()
    price_map = {t["symbol"]: t["price_try"] for t in tickers}
    price_map["BERX"] = await berx.get_berx_price(db)
    assets = []
    total_try = 0.0
    for sym, amt in w["balances"].items():
        locked = w.get("locked", {}).get(sym, 0.0)
        if sym == "TRY":
            value = amt
        else:
            value = amt * price_map.get(sym, 0)
        total_try += value
        assets.append(
            {
                "symbol": sym,
                "amount": amt,
                "locked": locked,
                "value_try": value,
                "price_try": 1.0 if sym == "TRY" else price_map.get(sym, 0),
            }
        )
    # cost basis
    cost_basis = (await db.cost_basis.find_one({"user_id": user["user_id"]}, {"_id": 0})) or {
        "invested_try": 0.0
    }
    pnl = total_try - cost_basis.get("invested_try", 0.0)
    return {
        "assets": sorted(assets, key=lambda x: x["value_try"], reverse=True),
        "total_try": total_try,
        "invested_try": cost_basis.get("invested_try", 0.0),
        "pnl_try": pnl,
    }


@api.get("/wallet/transactions")
async def wallet_transactions(user: dict = Depends(get_current_user), limit: int = 50):
    rows = (
        await db.transactions.find({"user_id": user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(limit)
    )
    return rows


# -------------- Deposits (IBAN) --------------
@api.get("/deposits/bank-info")
async def bank_info(user: dict = Depends(get_current_user)):
    return {
        "iban": PLATFORM_IBAN,
        "bank_name": PLATFORM_BANK_NAME,
        "recipient": PLATFORM_BANK_RECIPIENT,
    }


@api.post("/deposits")
async def create_deposit(
    amount: float = Form(...),
    receipt: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user),
):
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Geçersiz tutar")
    settings = await get_settings()
    if amount < settings.get("min_deposit_try", 50):
        raise HTTPException(status_code=400, detail=f"Minimum yatırma {settings.get('min_deposit_try')} TL")
    dep_id = new_id("dep_")
    receipt_path = None
    if receipt:
        data = await receipt.read()
        if len(data) > 8 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Dosya 8MB üzerinde")
        ext = (receipt.filename or "jpg").split(".")[-1]
        receipt_path = f"{APP_NAME}/dekont/{user['user_id']}/{uuid.uuid4().hex[:8]}.{ext}"
        try:
            put_object(receipt_path, data, receipt.content_type or "image/jpeg")
        except Exception as exc:
            logger.error("dekont upload failed: %s", exc)
            raise HTTPException(status_code=500, detail="Dekont yüklenemedi")
    await db.deposits.insert_one(
        {
            "deposit_id": dep_id,
            "user_id": user["user_id"],
            "amount": amount,
            "receipt_path": receipt_path,
            "status": "pending",
            "created_at": now_iso(),
        }
    )
    return {"ok": True, "deposit_id": dep_id}


@api.get("/deposits")
async def my_deposits(user: dict = Depends(get_current_user)):
    return await db.deposits.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# -------------- Withdrawals --------------
@api.post("/withdrawals")
async def create_withdrawal(data: WithdrawIn, user: dict = Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Geçersiz tutar")
    iban = data.iban.replace(" ", "").upper()
    if not iban.startswith("TR") or len(iban) != 26:
        raise HTTPException(status_code=400, detail="Geçersiz TR IBAN")
    settings = await get_settings()
    if settings.get("kyc_enforced") and user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Çekim için KYC onayı gerekli")
    if data.amount < settings.get("min_withdrawal_try", 100):
        raise HTTPException(status_code=400, detail=f"Minimum çekim {settings.get('min_withdrawal_try')} TL")
    w = await db.wallets.find_one({"user_id": user["user_id"]})
    if not w or w["balances"].get("TRY", 0) < data.amount:
        raise HTTPException(status_code=400, detail="Yetersiz TL bakiye")
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {"balances.TRY": -data.amount, "locked.TRY": data.amount}},
    )
    wd_id = new_id("wd_")
    await db.withdrawals.insert_one(
        {
            "withdrawal_id": wd_id,
            "user_id": user["user_id"],
            "amount": data.amount,
            "iban": iban,
            "bank_name": data.bank_name,
            "account_holder": data.account_holder,
            "status": "pending",
            "created_at": now_iso(),
        }
    )
    return {"ok": True, "withdrawal_id": wd_id}


@api.get("/withdrawals")
async def my_withdrawals(user: dict = Depends(get_current_user)):
    return await db.withdrawals.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# -------------- Market data --------------
@api.get("/markets")
async def markets():
    rows = await mkt.fetch_all_tickers()
    berx_ticker = await berx.get_ticker(db)
    rows.insert(0, berx_ticker) if False else rows.append(berx_ticker)
    return rows


@api.get("/markets-sparklines")
async def markets_sparklines(limit: int = 24):
    """Return a dict {SYMBOL: [closes]} for the markets list table."""
    out = {}
    try:
        rows = await mkt.fetch_all_tickers()
        for r in rows:
            try:
                pts = await mkt.fetch_sparkline(r["symbol"], limit)
                out[r["symbol"]] = pts or []
            except Exception:
                out[r["symbol"]] = []
        out["BERX"] = await berx.get_sparkline(db, limit)
    except Exception as e:
        logger.warning("sparklines batch failed: %s", e)
    return out


@api.get("/markets/{symbol}")
async def market_detail(symbol: str):
    if symbol.upper() == "BERX":
        return await berx.get_ticker(db)
    t = await mkt.fetch_ticker(symbol)
    if not t:
        raise HTTPException(status_code=404, detail="Coin bulunamadı")
    return t


@api.get("/markets/{symbol}/sparkline")
async def market_sparkline(symbol: str, points: int = 24):
    if symbol.upper() == "BERX":
        return {"symbol": "BERX", "points": await berx.get_sparkline(db, points)}
    return {"symbol": symbol.upper(), "points": await mkt.fetch_sparkline(symbol, points)}


@api.get("/markets/{symbol}/klines")
async def market_klines(symbol: str, interval: str = "1h", limit: int = 200):
    if symbol.upper() == "BERX":
        return await berx.get_klines(db, interval, limit)
    return await mkt.fetch_klines(symbol, interval, limit)


@api.get("/markets/{symbol}/depth")
async def market_depth(symbol: str):
    if symbol.upper() == "BERX":
        return await berx.get_depth(db)
    return await mkt.fetch_order_book(symbol)


@api.get("/markets/{symbol}/trades")
async def market_trades(symbol: str):
    if symbol.upper() == "BERX":
        return await berx.get_recent_trades(db)
    return await mkt.fetch_recent_trades(symbol)


# -------------- Trading --------------
TRADING_FEE = 0.001  # 0.1% default

VIP_TIERS = [
    {"code": "BRONZE", "label": "Bronze", "volume_try_30d": 0,        "berx_min": 0,       "fee_discount": 0.00, "color": "#B08560"},
    {"code": "SILVER", "label": "Silver", "volume_try_30d": 50_000,   "berx_min": 250,     "fee_discount": 0.10, "color": "#94A3B8"},
    {"code": "GOLD",   "label": "Gold",   "volume_try_30d": 500_000,  "berx_min": 1_000,   "fee_discount": 0.20, "color": "#DCA335"},
    {"code": "VIP",    "label": "VIP",    "volume_try_30d": 5_000_000,"berx_min": 5_000,   "fee_discount": 0.25, "color": "#A855F7"},
]


async def compute_user_tier(user_id: str) -> dict:
    since = (now_dt() - timedelta(days=30)).isoformat()
    vol_pipeline = [
        {"$match": {"user_id": user_id, "type": "trade", "created_at": {"$gte": since}}},
        {"$group": {"_id": None, "v": {"$sum": "$amount_try"}}},
    ]
    vol = await db.transactions.aggregate(vol_pipeline).to_list(1)
    volume = vol[0]["v"] if vol else 0
    w = await db.wallets.find_one({"user_id": user_id})
    berx_holding = (w or {}).get("balances", {}).get("BERX", 0) if w else 0
    # highest tier satisfied by EITHER volume OR BERX holding
    tier = VIP_TIERS[0]
    for t in VIP_TIERS:
        if volume >= t["volume_try_30d"] or berx_holding >= t["berx_min"]:
            tier = t
    return {
        "tier": tier,
        "volume_30d": volume,
        "berx_holding": berx_holding,
        "all_tiers": VIP_TIERS,
    }


@api.get("/user/tier")
async def user_tier(user: dict = Depends(get_current_user)):
    return await compute_user_tier(user["user_id"])


@api.post("/trade/order")
async def create_order(data: OrderIn, user: dict = Depends(get_current_user)):
    symbol = data.symbol.upper()
    if symbol != "BERX" and symbol not in mkt.COIN_META:
        raise HTTPException(status_code=400, detail="Desteklenmeyen coin")
    if data.side not in {"buy", "sell"}:
        raise HTTPException(status_code=400, detail="Yön hatalı")
    if data.order_type not in {"market", "limit"}:
        raise HTTPException(status_code=400, detail="Emir tipi hatalı")
    settings = await get_settings()
    if settings.get("kyc_enforced") and user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="İşlem için KYC onayı gerekli")

    ticker = await mkt.fetch_ticker(symbol)
    market_price = ticker["price_try"] if ticker else 0
    price = data.price or market_price

    # Compute quantity / amount
    if data.side == "buy":
        if data.order_type == "market":
            amount = data.amount_try or (data.quantity * market_price if data.quantity else 0)
            if amount <= 0:
                raise HTTPException(status_code=400, detail="Geçersiz tutar")
            qty = amount / market_price
        else:
            if not data.quantity or not data.price:
                raise HTTPException(status_code=400, detail="Adet ve fiyat gerekli")
            qty = data.quantity
            amount = qty * data.price
    else:
        if not data.quantity:
            raise HTTPException(status_code=400, detail="Adet gerekli")
        qty = data.quantity
        amount = qty * (data.price if data.order_type == "limit" else market_price)

    wallet = await db.wallets.find_one({"user_id": user["user_id"]})

    order_id = new_id("ord_")
    order_doc = {
        "order_id": order_id,
        "user_id": user["user_id"],
        "symbol": symbol,
        "side": data.side,
        "order_type": data.order_type,
        "quantity": qty,
        "price": price,
        "amount_try": amount,
        "fee_try": amount * TRADING_FEE,
        "status": "pending",
        "filled_qty": 0.0,
        "created_at": now_iso(),
    }

    if data.order_type == "market":
        # execute immediately against market price
        tier_info = await compute_user_tier(user["user_id"])
        effective_fee_rate = TRADING_FEE * (1 - tier_info["tier"]["fee_discount"])
        fee = amount * effective_fee_rate
        if data.side == "buy":
            required = amount + fee
            if wallet["balances"].get("TRY", 0) < required:
                raise HTTPException(status_code=400, detail="Yetersiz TL bakiye")
            await db.wallets.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"balances.TRY": -required, f"balances.{symbol}": qty}},
            )
            await db.cost_basis.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"invested_try": required}},
                upsert=True,
            )
        else:
            if wallet["balances"].get(symbol, 0) < qty:
                raise HTTPException(status_code=400, detail=f"Yetersiz {symbol} bakiye")
            credit = amount - fee
            await db.wallets.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {f"balances.{symbol}": -qty, "balances.TRY": credit}},
            )
            await db.cost_basis.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"invested_try": -credit}},
                upsert=True,
            )
        order_doc.update({"status": "filled", "filled_qty": qty, "filled_at": now_iso()})
        await db.transactions.insert_one(
            {
                "user_id": user["user_id"],
                "type": "trade",
                "side": data.side,
                "symbol": symbol,
                "quantity": qty,
                "price": market_price,
                "amount_try": amount,
                "fee_try": fee,
                "order_id": order_id,
                "created_at": now_iso(),
            }
        )
    else:
        # limit order: lock funds
        if data.side == "buy":
            required = amount + amount * TRADING_FEE
            if wallet["balances"].get("TRY", 0) < required:
                raise HTTPException(status_code=400, detail="Yetersiz TL bakiye")
            await db.wallets.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {"balances.TRY": -required, "locked.TRY": required}},
            )
        else:
            if wallet["balances"].get(symbol, 0) < qty:
                raise HTTPException(status_code=400, detail=f"Yetersiz {symbol} bakiye")
            await db.wallets.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {f"balances.{symbol}": -qty, f"locked.{symbol}": qty}},
            )
        order_doc["status"] = "open"

    await db.orders.insert_one(order_doc)
    return {"ok": True, "order": {k: v for k, v in order_doc.items() if k != "_id"}}


@api.get("/trade/orders")
async def my_orders(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {"user_id": user["user_id"]}
    if status == "open":
        q["status"] = "open"
    elif status == "history":
        q["status"] = {"$in": ["filled", "cancelled"]}
    rows = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return rows


@api.post("/trade/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"order_id": order_id, "user_id": user["user_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Emir bulunamadı")
    if order["status"] != "open":
        raise HTTPException(status_code=400, detail="Emir iptal edilemez")
    # unlock funds
    if order["side"] == "buy":
        required = order["amount_try"] + order["amount_try"] * TRADING_FEE
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {"balances.TRY": required, "locked.TRY": -required}},
        )
    else:
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {f"balances.{order['symbol']}": order["quantity"], f"locked.{order['symbol']}": -order["quantity"]}},
        )
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "cancelled", "cancelled_at": now_iso()}})
    return {"ok": True}


# -------------- Watchlist --------------
@api.get("/watchlist")
async def get_watchlist(user: dict = Depends(get_current_user)):
    rows = await db.watchlist.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return [r["symbol"] for r in rows]


@api.post("/watchlist")
async def add_watchlist(data: WatchlistIn, user: dict = Depends(get_current_user)):
    await db.watchlist.update_one(
        {"user_id": user["user_id"], "symbol": data.symbol.upper()},
        {"$set": {"added_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/watchlist/{symbol}")
async def remove_watchlist(symbol: str, user: dict = Depends(get_current_user)):
    await db.watchlist.delete_one({"user_id": user["user_id"], "symbol": symbol.upper()})
    return {"ok": True}


# -------------- Notifications --------------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(30).to_list(30)


async def push_notification(user_id: str, title: str, body: str, kind: str = "info"):
    await db.notifications.insert_one(
        {
            "user_id": user_id,
            "title": title,
            "body": body,
            "kind": kind,
            "read": False,
            "created_at": now_iso(),
        }
    )


# -------------- Admin --------------
@api.get("/admin/users")
async def admin_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users


@api.patch("/admin/users/{user_id}/status")
async def admin_user_status(user_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    await db.users.update_one({"user_id": user_id}, {"$set": {"account_status": payload.status}})
    await log_admin_action(admin, "user.status", "user", user_id, {"status": payload.status, "note": payload.note}, request)
    return {"ok": True}


@api.get("/admin/kyc")
async def admin_kyc(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    rows = await db.kyc_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api.patch("/admin/kyc/{kyc_id}")
async def admin_kyc_update(kyc_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    req = await db.kyc_requests.find_one({"kyc_id": kyc_id})
    if not req:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    await db.kyc_requests.update_one(
        {"kyc_id": kyc_id},
        {"$set": {"status": payload.status, "review_note": payload.note, "reviewed_at": now_iso()}},
    )
    await db.users.update_one({"user_id": req["user_id"]}, {"$set": {"kyc_status": payload.status}})
    user = await db.users.find_one({"user_id": req["user_id"]})
    if user:
        title = "KYC Onaylandı" if payload.status == "approved" else "KYC Reddedildi"
        await push_notification(user["user_id"], title, payload.note or "", "kyc")
        await send_email(
            user["email"],
            f"Coinberx - {title}",
            render_status(title, f"<p>{payload.note or 'İşleminiz güncellendi.'}</p>"),
        )
    await log_admin_action(admin, f"kyc.{payload.status}", "kyc", kyc_id, {"target_user": req["user_id"], "note": payload.note}, request)
    return {"ok": True}


@api.get("/admin/deposits")
async def admin_deposits(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.deposits.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.patch("/admin/deposits/{deposit_id}")
async def admin_deposit_update(deposit_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    dep = await db.deposits.find_one({"deposit_id": deposit_id})
    if not dep:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    if dep["status"] != "pending":
        raise HTTPException(status_code=400, detail="Zaten işlenmiş")
    await db.deposits.update_one(
        {"deposit_id": deposit_id},
        {"$set": {"status": payload.status, "review_note": payload.note, "reviewed_at": now_iso()}},
    )
    if payload.status == "approved":
        await ensure_wallet(dep["user_id"])
        await db.wallets.update_one(
            {"user_id": dep["user_id"]}, {"$inc": {"balances.TRY": dep["amount"]}}
        )
        await db.transactions.insert_one(
            {
                "user_id": dep["user_id"],
                "type": "deposit",
                "amount_try": dep["amount"],
                "status": "approved",
                "ref": dep.get("reference_code"),
                "created_at": now_iso(),
            }
        )
    user = await db.users.find_one({"user_id": dep["user_id"]})
    if user:
        title = "Yatırma Onaylandı" if payload.status == "approved" else "Yatırma Reddedildi"
        body = f"{dep['amount']:,.2f} TL yatırma işleminiz {'onaylandı ve hesabınıza eklendi.' if payload.status == 'approved' else 'reddedildi.'}"
        await push_notification(user["user_id"], title, body, "deposit")
        await send_email(user["email"], f"Coinberx - {title}", render_status(title, f"<p>{body}</p>"))
    await log_admin_action(admin, f"deposit.{payload.status}", "deposit", deposit_id, {"amount": dep["amount"], "target_user": dep["user_id"], "note": payload.note}, request)
    return {"ok": True}


@api.get("/admin/withdrawals")
async def admin_withdrawals(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.withdrawals.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.patch("/admin/withdrawals/{withdrawal_id}")
async def admin_withdrawal_update(withdrawal_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    wd = await db.withdrawals.find_one({"withdrawal_id": withdrawal_id})
    if not wd:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    if wd["status"] != "pending":
        raise HTTPException(status_code=400, detail="Zaten işlenmiş")
    if payload.status == "approved":
        await db.wallets.update_one(
            {"user_id": wd["user_id"]}, {"$inc": {"locked.TRY": -wd["amount"]}}
        )
        await db.transactions.insert_one(
            {
                "user_id": wd["user_id"],
                "type": "withdrawal",
                "amount_try": wd["amount"],
                "status": "approved",
                "iban": wd["iban"],
                "created_at": now_iso(),
            }
        )
    else:
        # refund locked
        await db.wallets.update_one(
            {"user_id": wd["user_id"]},
            {"$inc": {"balances.TRY": wd["amount"], "locked.TRY": -wd["amount"]}},
        )
    await db.withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {"status": payload.status, "review_note": payload.note, "reviewed_at": now_iso()}},
    )
    user = await db.users.find_one({"user_id": wd["user_id"]})
    if user:
        title = "Çekme Onaylandı" if payload.status == "approved" else "Çekme Reddedildi"
        await push_notification(user["user_id"], title, payload.note or "", "withdrawal")
        await send_email(user["email"], f"Coinberx - {title}", render_status(title, f"<p>{payload.note or ''}</p>"))
    await log_admin_action(admin, f"withdrawal.{payload.status}", "withdrawal", withdrawal_id, {"amount": wd["amount"], "target_user": wd["user_id"], "iban": wd.get("iban"), "note": payload.note}, request)
    return {"ok": True}


@api.get("/admin/analytics")
async def admin_analytics(admin: dict = Depends(require_admin)):
    users_count = await db.users.count_documents({})
    verified = await db.users.count_documents({"email_verified": True})
    kyc_approved = await db.users.count_documents({"kyc_status": "approved"})
    kyc_pending = await db.kyc_requests.count_documents({"status": "pending"})
    deposits_pending = await db.deposits.count_documents({"status": "pending"})
    withdrawals_pending = await db.withdrawals.count_documents({"status": "pending"})
    total_orders = await db.orders.count_documents({})
    # sum TRY volume today
    day_ago = (now_dt() - timedelta(days=1)).isoformat()
    volume_pipeline = [
        {"$match": {"created_at": {"$gte": day_ago}, "type": "trade"}},
        {"$group": {"_id": None, "v": {"$sum": "$amount_try"}}},
    ]
    vol = await db.transactions.aggregate(volume_pipeline).to_list(1)
    volume_24h = vol[0]["v"] if vol else 0
    return {
        "users_count": users_count,
        "verified_users": verified,
        "kyc_approved": kyc_approved,
        "kyc_pending": kyc_pending,
        "deposits_pending": deposits_pending,
        "withdrawals_pending": withdrawals_pending,
        "total_orders": total_orders,
        "volume_24h": volume_24h,
    }


# -------------- Networks & Multi-chain Wallets --------------
ALL_COIN_SYMBOLS = [c["symbol"] for c in mkt.SUPPORTED_COINS] + ["BERX"]


@api.get("/networks")
async def public_networks():
    rows = await nw.list_networks(db)
    return [n for n in rows if n.get("enabled", True)]


@api.get("/coins/{symbol}/networks")
async def coin_network_list(symbol: str):
    return await nw.coin_networks_full(db, symbol, ALL_COIN_SYMBOLS)


@api.get("/wallet/deposit-address")
async def deposit_address(symbol: str, network: str, user: dict = Depends(get_current_user)):
    nets = await nw.coin_networks(db, symbol, ALL_COIN_SYMBOLS)
    if not any(n["code"] == network.upper() for n in nets):
        raise HTTPException(status_code=400, detail="Bu coin için bu ağ desteklenmiyor")
    try:
        doc = await nw.get_or_create_address(db, user["user_id"], symbol.upper(), network.upper())
        return doc
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@api.post("/crypto-withdrawals")
async def crypto_withdraw(data: CryptoWithdrawIn, user: dict = Depends(get_current_user)):
    sym = data.symbol.upper()
    net_code = data.network.upper()
    if sym == "TRY":
        raise HTTPException(status_code=400, detail="TRY için /withdrawals kullanın")
    settings = await get_settings()
    if settings.get("kyc_enforced") and user.get("kyc_status") != "approved":
        raise HTTPException(status_code=403, detail="Çekim için KYC onayı gerekli")
    nets = await nw.coin_networks(db, sym, ALL_COIN_SYMBOLS)
    net = next((n for n in nets if n["code"] == net_code), None)
    if not net:
        raise HTTPException(status_code=400, detail="Bu ağ bu coin için aktif değil")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Geçersiz tutar")
    # compute coin-equivalent of fee (fee is in TRY, convert using current price)
    if sym == "BERX":
        price = await berx.get_berx_price(db)
    else:
        t = await mkt.fetch_ticker(sym)
        price = t["price_try"] if t else 0
    if price <= 0:
        raise HTTPException(status_code=400, detail="Fiyat alınamadı")
    fee_coin = net["fee_flat_try"] / price
    min_coin = net["min_withdraw_try"] / price
    if data.amount < min_coin:
        raise HTTPException(status_code=400, detail=f"Min çekim: {min_coin:.8f} {sym}")
    total_need = data.amount + fee_coin
    w = await db.wallets.find_one({"user_id": user["user_id"]})
    if not w or (w["balances"].get(sym, 0) < total_need):
        raise HTTPException(status_code=400, detail=f"Yetersiz {sym} bakiyesi (ücret dahil)")
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {"$inc": {f"balances.{sym}": -total_need, f"locked.{sym}": data.amount}},
    )
    wd_id = new_id("cwd_")
    await db.crypto_withdrawals.insert_one(
        {
            "withdrawal_id": wd_id,
            "user_id": user["user_id"],
            "symbol": sym,
            "network": net_code,
            "address": data.address,
            "amount": data.amount,
            "fee_coin": fee_coin,
            "fee_try": net["fee_flat_try"],
            "status": "pending",
            "created_at": now_iso(),
        }
    )
    return {"ok": True, "withdrawal_id": wd_id, "fee_coin": fee_coin}


@api.get("/crypto-withdrawals")
async def my_crypto_withdrawals(user: dict = Depends(get_current_user)):
    return await db.crypto_withdrawals.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


# Wallet-prefixed alias routes (used by new Wallet/Deposit/Withdraw UIs)
@api.get("/wallet/crypto-withdrawals")
async def my_crypto_withdrawals_alias(user: dict = Depends(get_current_user)):
    return await my_crypto_withdrawals(user=user)


@api.post("/wallet/crypto-withdrawals")
async def wallet_crypto_withdraw(data: CryptoWithdrawIn, user: dict = Depends(get_current_user)):
    return await crypto_withdraw(data=data, user=user)


# Crypto deposit claims (user submits proof, admin approves)
class CryptoDepositClaimIn(BaseModel):
    symbol: str
    network: str
    tx_hash: str
    amount: Optional[float] = None


@api.post("/wallet/crypto-deposits")
async def wallet_crypto_deposit(data: CryptoDepositClaimIn, request: Request, user: dict = Depends(get_current_user)):
    sym = data.symbol.upper()
    net_code = data.network.upper()
    if not data.tx_hash.strip():
        raise HTTPException(status_code=400, detail="Tx hash zorunlu")
    nets = await nw.coin_networks(db, sym, ALL_COIN_SYMBOLS)
    if not any(n["code"] == net_code for n in nets):
        raise HTTPException(status_code=400, detail="Bu ağ bu coin için aktif değil")
    plat = await nw.get_platform_address(db, sym, net_code)
    if not plat or not plat.get("address"):
        raise HTTPException(status_code=400, detail="Yönetici bu coin/ağ için adres tanımlamamış")
    dep_id = new_id("cdep_")
    doc = {
        "deposit_id": dep_id,
        "user_id": user["user_id"],
        "user_email": user.get("email"),
        "symbol": sym,
        "network": net_code,
        "tx_hash": data.tx_hash.strip(),
        "amount": float(data.amount or 0),
        "platform_address": plat["address"],
        "status": "pending",
        "ip_address": _client_ip(request),
        "created_at": now_iso(),
    }
    await db.crypto_deposits.insert_one(doc)
    return {"ok": True, "deposit_id": dep_id}


@api.get("/wallet/crypto-deposits")
async def wallet_crypto_deposits(user: dict = Depends(get_current_user)):
    return await db.crypto_deposits.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/admin/crypto-deposits")
async def admin_crypto_deposits(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {}
    if status:
        q["status"] = status
    return await db.crypto_deposits.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.patch("/admin/crypto-deposits/{deposit_id}")
async def admin_crypto_deposit_update(deposit_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    dep = await db.crypto_deposits.find_one({"deposit_id": deposit_id})
    if not dep:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    if dep["status"] != "pending":
        raise HTTPException(status_code=400, detail="Talep zaten işlendi")
    set_fields = {"status": payload.status, "admin_note": payload.note, "reviewed_at": now_iso()}
    if payload.status == "approved":
        amt = float(dep.get("amount") or 0)
        if amt > 0:
            await db.wallets.update_one(
                {"user_id": dep["user_id"]},
                {"$inc": {f"balances.{dep['symbol']}": amt}},
            )
            await db.transactions.insert_one({
                "user_id": dep["user_id"],
                "type": "crypto_deposit",
                "symbol": dep["symbol"],
                "network": dep["network"],
                "quantity": amt,
                "status": "approved",
                "tx_hash": dep.get("tx_hash"),
                "created_at": now_iso(),
            })
    await db.crypto_deposits.update_one({"deposit_id": deposit_id}, {"$set": set_fields})
    user = await db.users.find_one({"user_id": dep["user_id"]})
    if user:
        title = f"{dep['symbol']} Yatırma {'Onaylandı' if payload.status=='approved' else 'Reddedildi'}"
        await push_notification(user["user_id"], title, payload.note or "", "deposit")
    await log_admin_action(admin, f"crypto_deposit.{payload.status}", "crypto_deposit", deposit_id, {"symbol": dep["symbol"], "network": dep["network"], "target_user": dep["user_id"]}, request)
    return {"ok": True}


@api.post("/transfers")
async def create_transfer(data: TransferIn, user: dict = Depends(get_current_user)):
    sym = data.symbol.upper()
    if sym == "TRY":
        raise HTTPException(status_code=400, detail="Bu fonksiyon sadece kripto transferi içindir")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Geçersiz tutar")
    q = data.recipient.strip().lower()
    recipient = None
    # lookup by email, user_id, or referral_code
    recipient = await db.users.find_one(
        {"$or": [
            {"email": q},
            {"user_id": data.recipient.strip()},
            {"referral_code": data.recipient.strip().upper()},
            {"name": {"$regex": f"^{data.recipient.strip()}$", "$options": "i"}},
        ]},
        {"_id": 0, "password_hash": 0},
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Alıcı bulunamadı")
    if recipient["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Kendinize transfer yapamazsınız")
    settings = await get_settings()
    fee_pct = settings.get("transfer_fee_pct", 0.0005)
    fee = data.amount * fee_pct
    total_need = data.amount + fee
    w = await db.wallets.find_one({"user_id": user["user_id"]})
    if not w or w["balances"].get(sym, 0) < total_need:
        raise HTTPException(status_code=400, detail=f"Yetersiz {sym} bakiyesi")
    await ensure_wallet(recipient["user_id"])
    await db.wallets.update_one(
        {"user_id": user["user_id"]}, {"$inc": {f"balances.{sym}": -total_need}}
    )
    await db.wallets.update_one(
        {"user_id": recipient["user_id"]}, {"$inc": {f"balances.{sym}": data.amount}}
    )
    tid = new_id("tr_")
    doc = {
        "transfer_id": tid,
        "sender_id": user["user_id"],
        "sender_email": user["email"],
        "receiver_id": recipient["user_id"],
        "receiver_email": recipient["email"],
        "symbol": sym,
        "amount": data.amount,
        "fee": fee,
        "note": data.note or "",
        "status": "completed",
        "created_at": now_iso(),
    }
    await db.internal_transfers.insert_one(doc)
    await push_notification(
        recipient["user_id"],
        "Transfer Alındı",
        f"{user['email']} kullanıcısından {data.amount} {sym} aldınız.",
        "transfer",
    )
    return {"ok": True, "transfer": {k: v for k, v in doc.items() if k != "_id"}, "receiver_name": recipient.get("name")}


@api.get("/transfers")
async def my_transfers(user: dict = Depends(get_current_user)):
    sent = await db.internal_transfers.find({"sender_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    received = await db.internal_transfers.find({"receiver_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"sent": sent, "received": received}


@api.get("/users/lookup")
async def user_lookup(q: str, user: dict = Depends(get_current_user)):
    query = q.strip()
    if len(query) < 3:
        return None
    recipient = await db.users.find_one(
        {"$or": [
            {"email": query.lower()},
            {"user_id": query},
            {"referral_code": query.upper()},
            {"name": {"$regex": f"^{query}$", "$options": "i"}},
        ]},
        {"_id": 0, "email": 1, "name": 1, "user_id": 1, "referral_code": 1},
    )
    if not recipient or recipient["user_id"] == user["user_id"]:
        return None
    return recipient


# -------------- Admin Networks & Transfers --------------
@api.get("/admin/networks")
async def admin_networks(admin: dict = Depends(require_admin)):
    return await nw.list_networks(db)


@api.patch("/admin/networks/{code}")
async def admin_network_update(code: str, data: NetworkUpdateIn, request: Request, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    result = await nw.update_network(db, code, upd)
    await log_admin_action(admin, "network.update", "network", code, upd, request)
    return result


@api.get("/admin/coins/{symbol}/networks")
async def admin_coin_networks(symbol: str, admin: dict = Depends(require_admin)):
    override = await db.coin_networks.find_one({"symbol": symbol.upper()}, {"_id": 0})
    default = nw.DEFAULT_COIN_NETWORKS.get(symbol.upper()) or nw.DEFAULT_FALLBACK
    return {"symbol": symbol.upper(), "enabled": (override or {}).get("networks") or default, "default": default}


@api.put("/admin/coins/{symbol}/networks")
async def admin_set_coin_networks(symbol: str, data: CoinNetworksIn, request: Request, admin: dict = Depends(require_admin)):
    await nw.set_coin_networks(db, symbol, data.networks)
    await log_admin_action(admin, "coin_networks.update", "coin_networks", symbol.upper(), {"networks": data.networks}, request)
    return {"ok": True}


# -------- Admin: platform deposit address management (per coin + network) --------
@api.get("/admin/platform-addresses")
async def admin_platform_addresses(admin: dict = Depends(require_admin)):
    return await nw.list_platform_addresses(db)


@api.put("/admin/platform-addresses")
async def admin_platform_address_upsert(data: PlatformAddressIn, request: Request, admin: dict = Depends(require_admin)):
    if not data.address.strip():
        raise HTTPException(status_code=400, detail="Adres boş olamaz")
    nets = await nw.list_networks(db)
    if not any(n["code"] == data.network.upper() for n in nets):
        raise HTTPException(status_code=400, detail="Network bulunamadı")
    saved = await nw.upsert_platform_address(
        db,
        data.symbol,
        data.network,
        address=data.address,
        warning=data.warning or "",
        min_deposit=data.min_deposit or 0.0,
        deposit_enabled=data.deposit_enabled if data.deposit_enabled is not None else True,
        withdraw_enabled=data.withdraw_enabled if data.withdraw_enabled is not None else True,
    )
    await log_admin_action(admin, "platform_address.upsert", "platform_address", f"{data.symbol.upper()}:{data.network.upper()}", {"address": data.address[:20] + "...", "deposit_enabled": data.deposit_enabled, "withdraw_enabled": data.withdraw_enabled}, request)
    return saved


@api.delete("/admin/platform-addresses/{symbol}/{network}")
async def admin_platform_address_delete(symbol: str, network: str, request: Request, admin: dict = Depends(require_admin)):
    ok = await nw.delete_platform_address(db, symbol, network)
    if not ok:
        raise HTTPException(status_code=404, detail="Kayıt yok")
    await log_admin_action(admin, "platform_address.delete", "platform_address", f"{symbol.upper()}:{network.upper()}", {}, request)
    return {"ok": True}


@api.get("/admin/transfers")
async def admin_transfers(admin: dict = Depends(require_admin)):
    return await db.internal_transfers.find({}, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


@api.get("/admin/crypto-withdrawals")
async def admin_crypto_withdrawals(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.crypto_withdrawals.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.patch("/admin/crypto-withdrawals/{withdrawal_id}")
async def admin_crypto_withdrawal_update(withdrawal_id: str, payload: AdminStatusIn, request: Request, admin: dict = Depends(require_admin)):
    wd = await db.crypto_withdrawals.find_one({"withdrawal_id": withdrawal_id})
    if not wd:
        raise HTTPException(status_code=404, detail="Bulunamadı")
    if wd["status"] != "pending":
        raise HTTPException(status_code=400, detail="Zaten işlenmiş")
    sym = wd["symbol"]
    if payload.status == "approved":
        await db.wallets.update_one(
            {"user_id": wd["user_id"]}, {"$inc": {f"locked.{sym}": -wd["amount"]}}
        )
    else:
        await db.wallets.update_one(
            {"user_id": wd["user_id"]},
            {"$inc": {f"balances.{sym}": wd["amount"] + wd["fee_coin"], f"locked.{sym}": -wd["amount"]}},
        )
    await db.crypto_withdrawals.update_one(
        {"withdrawal_id": withdrawal_id},
        {"$set": {"status": payload.status, "review_note": payload.note, "reviewed_at": now_iso()}},
    )
    user = await db.users.find_one({"user_id": wd["user_id"]})
    if user:
        title = f"{sym} Çekme {'Onaylandı' if payload.status=='approved' else 'Reddedildi'}"
        await push_notification(user["user_id"], title, payload.note or "", "withdrawal")
    await log_admin_action(admin, f"crypto_withdrawal.{payload.status}", "crypto_withdrawal", withdrawal_id, {"symbol": sym, "amount": wd["amount"], "target_user": wd["user_id"], "network": wd.get("network")}, request)
    return {"ok": True}


# -------------- BERX (admin-controlled) --------------
DEFAULT_BERX_SIM = {
    "enabled": False,
    "mode": "manual",                # "manual" | "auto"
    "min_price": 0.50,
    "max_price": 5.00,
    "max_daily_change_pct": 8.0,
    "tick_interval_seconds": 30,
    "volatility": 0.004,             # per-tick stddev
    "trend": 0.0,                    # per-tick drift
}


async def get_berx_sim() -> dict:
    doc = await db.berx_settings.find_one({"_id": "global"})
    sim = (doc or {}).get("simulation") or {}
    return {**DEFAULT_BERX_SIM, **sim}


async def update_berx_sim(updates: dict) -> dict:
    cur = await get_berx_sim()
    cur.update({k: v for k, v in updates.items() if v is not None})
    await db.berx_settings.update_one(
        {"_id": "global"}, {"$set": {"simulation": cur}}, upsert=True
    )
    return cur


@api.get("/admin/berx")
async def admin_berx(admin: dict = Depends(require_admin)):
    ticker = await berx.get_ticker(db)
    sim = await get_berx_sim()
    return {**ticker, "simulation": sim}


@api.post("/admin/berx/price")
async def admin_berx_price(data: BerxAdjustIn, request: Request, admin: dict = Depends(require_admin)):
    if data.action == "set":
        new_price = await berx.set_price(db, data.value)
    elif data.action == "adjust":
        new_price = await berx.adjust_price(db, data.value)
    else:
        raise HTTPException(status_code=400, detail="Geçersiz işlem")
    await log_admin_action(admin, f"berx.{data.action}", "berx", None, {"value": data.value, "new_price": new_price}, request)
    return {"ok": True, "price_try": new_price}


@api.patch("/admin/berx/simulation")
async def admin_berx_simulation(data: BerxSimulationIn, request: Request, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if "mode" in upd and upd["mode"] not in {"manual", "auto"}:
        raise HTTPException(status_code=400, detail="Mod 'manual' veya 'auto' olmalı")
    if "min_price" in upd and upd["min_price"] <= 0:
        raise HTTPException(status_code=400, detail="min_price > 0 olmalı")
    if "max_price" in upd and upd["max_price"] <= 0:
        raise HTTPException(status_code=400, detail="max_price > 0 olmalı")
    new_sim = await update_berx_sim(upd)
    await log_admin_action(admin, "berx.simulation", "berx", None, upd, request)
    return new_sim


# -------------- Admin Activity Logs --------------
@api.get("/admin/activity-logs")
async def admin_activity_logs(
    limit: int = 100,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    admin: dict = Depends(require_admin),
):
    q = {}
    if action:
        q["action"] = action
    if entity_type:
        q["entity_type"] = entity_type
    rows = await db.admin_activity_logs.find(q, {"_id": 0}).sort("created_at", -1).limit(min(limit, 500)).to_list(500)
    return rows


# -------------- Platform recent trades (real, anonymised) --------------
@api.get("/platform/recent-trades")
async def platform_recent_trades(limit: int = 5):
    """Return latest real spot trades across the platform with masked user labels."""
    limit = max(1, min(limit, 25))
    rows = await db.transactions.find(
        {"type": "trade"}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    out = []
    for r in rows:
        # mask email/name into "K***"
        user = await db.users.find_one({"user_id": r["user_id"]}, {"_id": 0, "email": 1, "name": 1})
        label = (user or {}).get("email") or (user or {}).get("name") or "Kullanıcı"
        out.append({
            "id": r.get("order_id") or new_id("ev_"),
            "user_label": label,
            "symbol": r.get("symbol"),
            "side": r.get("side"),
            "amount_try": r.get("amount_try", 0.0),
            "quantity": r.get("quantity", 0.0),
            "created_at": r.get("created_at"),
        })
    return out


# -------------- Support --------------
@api.post("/support/message")
async def support_send(data: SupportMessageIn, user: dict = Depends(get_current_user)):
    msg_id = new_id("msg_")
    doc = {
        "message_id": msg_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "user_name": user.get("name", ""),
        "subject": data.subject,
        "body": data.body,
        "category": data.category or "general",
        "status": "open",
        "replies": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.support_messages.insert_one(doc)
    return {"ok": True, "message_id": msg_id}


@api.get("/support/messages")
async def support_my(user: dict = Depends(get_current_user)):
    rows = await db.support_messages.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return rows


@api.get("/admin/support")
async def admin_support_list(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.support_messages.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/admin/support/{message_id}/reply")
async def admin_support_reply(message_id: str, data: SupportReplyIn, admin: dict = Depends(require_admin)):
    msg = await db.support_messages.find_one({"message_id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    reply = {
        "from": "admin",
        "by": admin.get("email", "admin"),
        "body": data.body,
        "at": now_iso(),
    }
    update = {"$push": {"replies": reply}, "$set": {"updated_at": now_iso(), "status": "closed" if data.close else "answered"}}
    await db.support_messages.update_one({"message_id": message_id}, update)
    await push_notification(
        msg["user_id"], "Destek Cevaplandı", data.body[:120], "support"
    )
    return {"ok": True}


# -------------- Live Chat (visitor + user) --------------
async def _get_chat_user(request: Request):
    """Try to identify an authenticated user, otherwise return None."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def _resolve_session(db_, *, session_id: str | None, visitor_id: str | None, user: dict | None):
    """Find session by (auth user_id) or by (visitor_id + session_id) tuple."""
    q = {"session_id": session_id} if session_id else None
    if not q:
        return None
    sess = await db_.live_chat_sessions.find_one(q, {"_id": 0})
    if not sess:
        return None
    if user and sess.get("user_id") == user.get("user_id"):
        return sess
    if visitor_id and sess.get("visitor_id") == visitor_id:
        return sess
    return None


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


@api.post("/live-chat/start")
async def live_chat_start(data: LiveChatStartIn, request: Request):
    user = await _get_chat_user(request)
    visitor_id = data.visitor_id or new_id("vis_")
    # Reuse the most recent open session belonging to this caller
    query = {}
    if user:
        query["user_id"] = user["user_id"]
    else:
        query["visitor_id"] = visitor_id
    query["status"] = {"$in": ["open", "pending"]}
    existing = await db.live_chat_sessions.find_one(query, {"_id": 0}, sort=[("created_at", -1)])
    if existing:
        return {"session": existing, "visitor_id": visitor_id, "user": clean_user(user) if user else None}

    name = (user.get("name") if user else None) or data.name or "Ziyaretçi"
    contact = (user.get("email") if user else None) or data.contact or ""
    sess = {
        "session_id": new_id("chat_"),
        "user_id": user["user_id"] if user else None,
        "user_email": user["email"] if user else None,
        "visitor_id": None if user else visitor_id,
        "name": name,
        "contact": contact,
        "status": "open",
        "page_url": (data.page_url or "")[:240],
        "ip_address": _client_ip(request),
        "user_agent": (request.headers.get("user-agent") or "")[:240],
        "unread_admin_count": 0,
        "unread_user_count": 0,
        "last_message_at": now_iso(),
        "created_at": now_iso(),
    }
    await db.live_chat_sessions.insert_one(sess)
    return {"session": {k: v for k, v in sess.items() if k != "_id"}, "visitor_id": visitor_id, "user": clean_user(user) if user else None}


@api.post("/live-chat/message")
async def live_chat_send(data: LiveChatMessageIn, request: Request):
    user = await _get_chat_user(request)
    sess = await _resolve_session(db, session_id=data.session_id, visitor_id=data.visitor_id, user=user)
    if not sess:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Boş mesaj gönderilemez")
    msg = {
        "message_id": new_id("lm_"),
        "session_id": sess["session_id"],
        "sender": "user",
        "sender_label": (user["email"] if user else sess.get("name")) or "Ziyaretçi",
        "body": body[:4000],
        "created_at": now_iso(),
        "read_by_admin": False,
    }
    await db.live_chat_messages.insert_one(msg)
    await db.live_chat_sessions.update_one(
        {"session_id": sess["session_id"]},
        {"$set": {"last_message_at": now_iso(), "status": "pending"}, "$inc": {"unread_admin_count": 1}},
    )
    return {"ok": True, "message": {k: v for k, v in msg.items() if k != "_id"}}


@api.get("/live-chat/poll")
async def live_chat_poll(session_id: str, request: Request, visitor_id: Optional[str] = None, since: Optional[str] = None):
    user = await _get_chat_user(request)
    sess = await _resolve_session(db, session_id=session_id, visitor_id=visitor_id, user=user)
    if not sess:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    q = {"session_id": session_id}
    if since:
        q["created_at"] = {"$gt": since}
    msgs = await db.live_chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    # mark admin->user messages as read by user
    if msgs:
        await db.live_chat_messages.update_many(
            {"session_id": session_id, "sender": "admin", "read_by_user": {"$ne": True}},
            {"$set": {"read_by_user": True}},
        )
        await db.live_chat_sessions.update_one(
            {"session_id": session_id}, {"$set": {"unread_user_count": 0}}
        )
    sess_fresh = await db.live_chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return {"session": sess_fresh, "messages": msgs}


@api.get("/admin/live-chat/sessions")
async def admin_live_chat_sessions(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {}
    if status:
        q["status"] = status
    rows = await db.live_chat_sessions.find(q, {"_id": 0}).sort("last_message_at", -1).to_list(500)
    return rows


@api.get("/admin/live-chat/sessions/{session_id}")
async def admin_live_chat_session(session_id: str, admin: dict = Depends(require_admin)):
    sess = await db.live_chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    msgs = await db.live_chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    # Admin opened the chat -> mark user messages as read
    await db.live_chat_messages.update_many(
        {"session_id": session_id, "sender": "user", "read_by_admin": {"$ne": True}},
        {"$set": {"read_by_admin": True}},
    )
    await db.live_chat_sessions.update_one(
        {"session_id": session_id}, {"$set": {"unread_admin_count": 0}}
    )
    return {"session": sess, "messages": msgs}


@api.post("/admin/live-chat/sessions/{session_id}/reply")
async def admin_live_chat_reply(session_id: str, data: LiveChatAdminReplyIn, request: Request, admin: dict = Depends(require_admin)):
    sess = await db.live_chat_sessions.find_one({"session_id": session_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    body = (data.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Boş yanıt")
    msg = {
        "message_id": new_id("lm_"),
        "session_id": session_id,
        "sender": "admin",
        "sender_label": admin.get("email", "Coinberx Destek"),
        "body": body[:4000],
        "created_at": now_iso(),
        "read_by_user": False,
    }
    await db.live_chat_messages.insert_one(msg)
    await db.live_chat_sessions.update_one(
        {"session_id": session_id},
        {"$set": {"last_message_at": now_iso(), "status": "open"}, "$inc": {"unread_user_count": 1}},
    )
    # also push a notification when associated with a logged-in user
    if sess.get("user_id"):
        await push_notification(sess["user_id"], "Destek Yanıtı", body[:120], "support")
    await log_admin_action(admin, "live_chat.reply", "live_chat", session_id, {"body_len": len(body)}, request)
    return {"ok": True, "message": {k: v for k, v in msg.items() if k != "_id"}}


@api.patch("/admin/live-chat/sessions/{session_id}/status")
async def admin_live_chat_status(session_id: str, data: LiveChatStatusIn, request: Request, admin: dict = Depends(require_admin)):
    if data.status not in {"open", "pending", "closed"}:
        raise HTTPException(status_code=400, detail="Geçersiz durum")
    await db.live_chat_sessions.update_one(
        {"session_id": session_id}, {"$set": {"status": data.status, "last_message_at": now_iso()}}
    )
    await log_admin_action(admin, f"live_chat.{data.status}", "live_chat", session_id, {}, request)
    return {"ok": True}


@api.get("/admin/live-chat/stats")
async def admin_live_chat_stats(admin: dict = Depends(require_admin)):
    open_n = await db.live_chat_sessions.count_documents({"status": "open"})
    pending_n = await db.live_chat_sessions.count_documents({"status": "pending"})
    closed_n = await db.live_chat_sessions.count_documents({"status": "closed"})
    day_ago = (now_dt() - timedelta(hours=24)).isoformat()
    today = await db.live_chat_messages.count_documents({"created_at": {"$gte": day_ago}})
    recent_msgs = await db.live_chat_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(8).to_list(8)
    return {
        "open": open_n,
        "pending": pending_n,
        "closed": closed_n,
        "messages_24h": today,
        "recent": recent_msgs,
    }


# -------------- Public --------------
@api.get("/settings")
async def public_settings():
    s = await get_settings()
    return {k: s[k] for k in ["kyc_enforced", "min_deposit_try", "min_withdrawal_try", "trading_fee"]}


@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    return await get_settings()


@api.patch("/admin/settings")
async def admin_update_settings(data: SettingsIn, request: Request, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if upd:
        await db.system_settings.update_one({"_id": "global"}, {"$set": upd}, upsert=True)
    await log_admin_action(admin, "settings.update", "settings", "global", upd, request)
    return await get_settings()


@api.get("/")
async def root():
    return {"service": "Coinberx API", "status": "ok"}


app.include_router(api)


# -------------- BERX auto-simulation background task --------------
import asyncio


async def _berx_simulation_loop():
    """Tick BERX price using configurable random walk when sim.enabled and mode == 'auto'."""
    # Track day start price for daily-cap enforcement.
    day_start_price = None
    day_start_at = None
    while True:
        try:
            sim = await get_berx_sim()
            interval = max(5, int(sim.get("tick_interval_seconds", 30)))
            if sim.get("enabled") and sim.get("mode") == "auto":
                cur = await berx.get_berx_price(db)
                if day_start_price is None or (day_start_at and (now_dt() - day_start_at).total_seconds() > 86400):
                    day_start_price = cur
                    day_start_at = now_dt()
                # random walk with drift + volatility
                vol = float(sim.get("volatility", 0.004))
                trend = float(sim.get("trend", 0.0))
                step = trend + random.gauss(0, vol)
                new_price = cur * (1 + step)
                # clamp to min/max
                mn = float(sim.get("min_price", 0.1))
                mx = float(sim.get("max_price", 100.0))
                new_price = max(mn, min(mx, new_price))
                # enforce daily change cap
                cap = float(sim.get("max_daily_change_pct", 8.0)) / 100.0
                if day_start_price:
                    upper = day_start_price * (1 + cap)
                    lower = day_start_price * (1 - cap)
                    new_price = max(lower, min(upper, new_price))
                await berx.push_tick(db, new_price)
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning("berx sim tick failed: %s", e)
            await asyncio.sleep(10)


# -------------- Startup --------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.sessions.create_index("session_token", unique=True)
    await db.orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    await db.berx_ticks.create_index([("ts", 1)])
    await db.support_messages.create_index([("user_id", 1), ("created_at", -1)])
    await db.internal_transfers.create_index([("sender_id", 1), ("created_at", -1)])
    await db.internal_transfers.create_index([("receiver_id", 1), ("created_at", -1)])
    await db.deposit_addresses.create_index([("user_id", 1), ("symbol", 1), ("network", 1)], unique=True)
    await db.admin_activity_logs.create_index([("created_at", -1)])
    await db.live_chat_sessions.create_index([("status", 1), ("last_message_at", -1)])
    await db.live_chat_sessions.create_index("session_id", unique=True)
    await db.live_chat_sessions.create_index("visitor_id")
    await db.live_chat_messages.create_index([("session_id", 1), ("created_at", 1)])
    await db.platform_addresses.create_index([("symbol", 1), ("network", 1)], unique=True)
    init_storage()
    await berx.seed_berx(db)
    await nw.seed_networks(db)
    # start BERX auto-simulation loop (no-op until enabled by admin)
    app.state.berx_sim_task = asyncio.create_task(_berx_simulation_loop())

    # seed admin
    admin_email = os.environ.get("ADMIN_EMAIL")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            uid = new_id("usr_")
            await db.users.insert_one(
                {
                    "user_id": uid,
                    "email": admin_email,
                    "name": "Admin",
                    "password_hash": hash_password(admin_password),
                    "role": "admin",
                    "email_verified": True,
                    "kyc_status": "approved",
                    "auth_provider": "email",
                    "created_at": now_iso(),
                }
            )
            await ensure_wallet(uid)
            logger.info("Seeded admin %s", admin_email)
        elif not verify_password(admin_password, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )
            logger.info("Updated admin password")


@app.on_event("shutdown")
async def on_shutdown():
    task = getattr(app.state, "berx_sim_task", None)
    if task:
        task.cancel()
        try:
            await task
        except Exception:
            pass
    mongo_client.close()
