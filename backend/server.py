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
        return
    balances = {"TRY": 0.0}
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


DEFAULT_SETTINGS = {
    "kyc_enforced": True,
    "trading_fee": 0.001,
    "min_deposit_try": 50.0,
    "min_withdrawal_try": 100.0,
}


async def get_settings() -> dict:
    doc = await db.system_settings.find_one({"_id": "global"})
    if not doc:
        await db.system_settings.insert_one({"_id": "global", **DEFAULT_SETTINGS})
        return DEFAULT_SETTINGS.copy()
    return {**DEFAULT_SETTINGS, **{k: v for k, v in doc.items() if k != "_id"}}


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


# Google (Emergent) auth callback
@api.post("/auth/google/session")
async def google_session(response: Response, x_session_id: str = Header(...)):
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Google oturumu doğrulanamadı")
    info = r.json()
    email = info["email"].lower()
    user = await db.users.find_one({"email": email})
    if not user:
        user_id = new_id("usr_")
        user = {
            "user_id": user_id,
            "email": email,
            "name": info.get("name", email.split("@")[0]),
            "avatar_url": info.get("picture"),
            "role": "user",
            "email_verified": True,
            "kyc_status": "none",
            "two_fa_enabled": False,
            "auth_provider": "google",
            "referral_code": "CB" + secrets.token_hex(3).upper(),
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)
    await ensure_wallet(user["user_id"])
    session_token = info["session_token"]
    await db.sessions.insert_one(
        {
            "session_token": session_token,
            "user_id": user["user_id"],
            "expires_at": (now_dt() + timedelta(days=7)).isoformat(),
            "created_at": now_iso(),
        }
    )
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )
    return {"user": clean_user(user)}


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
    # fetch or create stable per-user reference code
    existing = await db.bank_refs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not existing:
        ref = make_ref_code()
        await db.bank_refs.insert_one(
            {"user_id": user["user_id"], "reference_code": ref, "created_at": now_iso()}
        )
    else:
        ref = existing["reference_code"]
    return {
        "iban": PLATFORM_IBAN,
        "bank_name": PLATFORM_BANK_NAME,
        "recipient": PLATFORM_BANK_RECIPIENT,
        "reference_code": ref,
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

    ref = await db.bank_refs.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not ref:
        rc = make_ref_code()
        await db.bank_refs.insert_one({"user_id": user["user_id"], "reference_code": rc})
        ref = {"reference_code": rc}
    await db.deposits.insert_one(
        {
            "deposit_id": dep_id,
            "user_id": user["user_id"],
            "amount": amount,
            "reference_code": ref["reference_code"],
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
    return await mkt.fetch_all_tickers()


@api.get("/markets/{symbol}")
async def market_detail(symbol: str):
    t = await mkt.fetch_ticker(symbol)
    if not t:
        raise HTTPException(status_code=404, detail="Coin bulunamadı")
    return t


@api.get("/markets/{symbol}/sparkline")
async def market_sparkline(symbol: str, points: int = 24):
    return {"symbol": symbol.upper(), "points": await mkt.fetch_sparkline(symbol, points)}


@api.get("/markets/{symbol}/klines")
async def market_klines(symbol: str, interval: str = "1h", limit: int = 200):
    return await mkt.fetch_klines(symbol, interval, limit)


@api.get("/markets/{symbol}/depth")
async def market_depth(symbol: str):
    return await mkt.fetch_order_book(symbol)


@api.get("/markets/{symbol}/trades")
async def market_trades(symbol: str):
    return await mkt.fetch_recent_trades(symbol)


# -------------- Trading --------------
TRADING_FEE = 0.001  # 0.1%


@api.post("/trade/order")
async def create_order(data: OrderIn, user: dict = Depends(get_current_user)):
    symbol = data.symbol.upper()
    if symbol not in mkt.COIN_META:
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
        fee = amount * TRADING_FEE
        if data.side == "buy":
            required = amount + fee
            if wallet["balances"].get("TRY", 0) < required:
                raise HTTPException(status_code=400, detail="Yetersiz TL bakiye")
            await db.wallets.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {f"balances.TRY": -required, f"balances.{symbol}": qty}},
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
                {"$inc": {f"balances.{symbol}": -qty, f"balances.TRY": credit}},
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
async def admin_user_status(user_id: str, payload: AdminStatusIn, admin: dict = Depends(require_admin)):
    await db.users.update_one({"user_id": user_id}, {"$set": {"account_status": payload.status}})
    return {"ok": True}


@api.get("/admin/kyc")
async def admin_kyc(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    rows = await db.kyc_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rows


@api.patch("/admin/kyc/{kyc_id}")
async def admin_kyc_update(kyc_id: str, payload: AdminStatusIn, admin: dict = Depends(require_admin)):
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
    return {"ok": True}


@api.get("/admin/deposits")
async def admin_deposits(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.deposits.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.patch("/admin/deposits/{deposit_id}")
async def admin_deposit_update(deposit_id: str, payload: AdminStatusIn, admin: dict = Depends(require_admin)):
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
                "ref": dep["reference_code"],
                "created_at": now_iso(),
            }
        )
    user = await db.users.find_one({"user_id": dep["user_id"]})
    if user:
        title = "Yatırma Onaylandı" if payload.status == "approved" else "Yatırma Reddedildi"
        body = f"{dep['amount']:,.2f} TL yatırma işleminiz {'onaylandı ve hesabınıza eklendi.' if payload.status == 'approved' else 'reddedildi.'}"
        await push_notification(user["user_id"], title, body, "deposit")
        await send_email(user["email"], f"Coinberx - {title}", render_status(title, f"<p>{body}</p>"))
    return {"ok": True}


@api.get("/admin/withdrawals")
async def admin_withdrawals(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    return await db.withdrawals.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.patch("/admin/withdrawals/{withdrawal_id}")
async def admin_withdrawal_update(withdrawal_id: str, payload: AdminStatusIn, admin: dict = Depends(require_admin)):
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


# -------------- Public --------------
@api.get("/settings")
async def public_settings():
    s = await get_settings()
    return {k: s[k] for k in ["kyc_enforced", "min_deposit_try", "min_withdrawal_try", "trading_fee"]}


@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(require_admin)):
    return await get_settings()


@api.patch("/admin/settings")
async def admin_update_settings(data: SettingsIn, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump(exclude_none=True).items()}
    if upd:
        await db.system_settings.update_one({"_id": "global"}, {"$set": upd}, upsert=True)
    return await get_settings()


@api.get("/")
async def root():
    return {"service": "Coinberx API", "status": "ok"}


app.include_router(api)


# -------------- Startup --------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.sessions.create_index("session_token", unique=True)
    await db.orders.create_index([("user_id", 1), ("created_at", -1)])
    await db.transactions.create_index([("user_id", 1), ("created_at", -1)])
    init_storage()

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
    mongo_client.close()
