"""Network & address helpers for multi-network wallet system.

Architecture is designed to be production-ready: actual blockchain nodes
would plug into generate_address / process_deposit / broadcast_withdraw later.
Currently uses deterministic pseudo-addresses and in-platform ledgers.
"""
import hashlib
from datetime import datetime, timezone


DEFAULT_NETWORKS = [
    {"code": "TRC20", "name": "Tron (TRC20)", "fee_flat_try": 5.0, "min_withdraw_try": 10.0, "confirm_minutes": 2, "address_format": "tron", "description": "Hızlı ve ucuz. USDT için önerilir."},
    {"code": "ERC20", "name": "Ethereum (ERC20)", "fee_flat_try": 150.0, "min_withdraw_try": 200.0, "confirm_minutes": 10, "address_format": "evm", "description": "Ethereum ana ağı. Yüksek ücret."},
    {"code": "BEP20", "name": "BNB Smart Chain (BEP20)", "fee_flat_try": 3.0, "min_withdraw_try": 10.0, "confirm_minutes": 3, "address_format": "evm", "description": "BNB Smart Chain. Düşük ücret."},
    {"code": "BTC",   "name": "Bitcoin",               "fee_flat_try": 400.0, "min_withdraw_try": 500.0, "confirm_minutes": 30, "address_format": "btc", "description": "Bitcoin ana ağı."},
    {"code": "SOL",   "name": "Solana",                "fee_flat_try": 2.0,   "min_withdraw_try": 5.0,   "confirm_minutes": 1, "address_format": "sol", "description": "Çok hızlı, düşük ücret."},
    {"code": "BERX",  "name": "Coinberx İç Ağı",       "fee_flat_try": 0.0,   "min_withdraw_try": 1.0,   "confirm_minutes": 0, "address_format": "berx", "description": "Platform içi; anında, ücretsiz."},
]


# Default coin → list of enabled network codes
DEFAULT_COIN_NETWORKS = {
    "BTC":   ["BTC"],
    "ETH":   ["ERC20"],
    "USDT":  ["TRC20", "ERC20", "BEP20"],
    "BNB":   ["BEP20"],
    "SOL":   ["SOL"],
    "BERX":  ["BERX"],
}
# All other coins default to ERC20 + BEP20
DEFAULT_FALLBACK = ["ERC20", "BEP20"]


async def seed_networks(db):
    for n in DEFAULT_NETWORKS:
        existing = await db.networks.find_one({"code": n["code"]})
        if not existing:
            await db.networks.insert_one({**n, "enabled": True, "created_at": datetime.now(timezone.utc).isoformat()})


async def list_networks(db) -> list[dict]:
    rows = await db.networks.find({}, {"_id": 0}).to_list(100)
    return rows


async def get_network(db, code: str) -> dict | None:
    return await db.networks.find_one({"code": code.upper()}, {"_id": 0})


async def update_network(db, code: str, updates: dict) -> dict | None:
    allowed = {k: v for k, v in updates.items() if k in {"fee_flat_try", "min_withdraw_try", "confirm_minutes", "description", "enabled", "name"}}
    if allowed:
        await db.networks.update_one({"code": code.upper()}, {"$set": allowed})
    return await get_network(db, code)


async def coin_networks(db, symbol: str, all_known_coins: list[str]) -> list[dict]:
    """Return the enabled networks for a coin as rich dicts."""
    symbol = symbol.upper()
    override = await db.coin_networks.find_one({"symbol": symbol})
    codes = (override or {}).get("networks") or DEFAULT_COIN_NETWORKS.get(symbol) or DEFAULT_FALLBACK
    out = []
    for code in codes:
        n = await get_network(db, code)
        if n and n.get("enabled", True):
            out.append(n)
    return out


async def set_coin_networks(db, symbol: str, codes: list[str]):
    await db.coin_networks.update_one(
        {"symbol": symbol.upper()},
        {"$set": {"symbol": symbol.upper(), "networks": codes}},
        upsert=True,
    )


def _hex(seed: str, length: int) -> str:
    h = hashlib.sha256(seed.encode()).hexdigest()
    while len(h) < length:
        h += hashlib.sha256(h.encode()).hexdigest()
    return h[:length]


def generate_address(user_id: str, symbol: str, network_code: str, address_format: str) -> str:
    seed = f"{user_id}:{symbol}:{network_code}"
    fmt = (address_format or "evm").lower()
    if fmt == "evm":
        return "0x" + _hex(seed, 40)
    if fmt == "tron":
        return "T" + _hex(seed, 33)
    if fmt == "btc":
        return "bc1q" + _hex(seed, 38)
    if fmt == "sol":
        return _hex(seed + "sol", 44)
    if fmt == "berx":
        return "bx1" + _hex(seed, 34)
    return _hex(seed, 42)


async def get_or_create_address(db, user_id: str, symbol: str, network_code: str) -> dict:
    net = await get_network(db, network_code)
    if not net:
        raise ValueError("Network not found")
    existing = await db.deposit_addresses.find_one(
        {"user_id": user_id, "symbol": symbol.upper(), "network": network_code.upper()}, {"_id": 0}
    )
    if existing:
        return existing
    addr = generate_address(user_id, symbol, network_code, net["address_format"])
    doc = {
        "user_id": user_id,
        "symbol": symbol.upper(),
        "network": network_code.upper(),
        "address": addr,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.deposit_addresses.insert_one(doc)
    return doc
