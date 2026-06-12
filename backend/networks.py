"""Network & address helpers for multi-network wallet system.

Architecture is designed to be production-ready: actual blockchain nodes
would plug into deposit/withdraw broadcasting later.
Deposit addresses are admin-managed (no fake auto-generation).
"""
from datetime import datetime, timezone


DEFAULT_NETWORKS = [
    {"code": "TRC20", "name": "Tron (TRC20)", "fee_flat_try": 5.0, "min_withdraw_try": 10.0, "confirm_minutes": 2, "address_format": "tron", "description": "Hızlı ve ucuz. USDT için önerilir."},
    {"code": "ERC20", "name": "Ethereum (ERC20)", "fee_flat_try": 150.0, "min_withdraw_try": 200.0, "confirm_minutes": 10, "address_format": "evm", "description": "Ethereum ana ağı. Yüksek ücret."},
    {"code": "BEP20", "name": "BNB Smart Chain (BEP20)", "fee_flat_try": 3.0, "min_withdraw_try": 10.0, "confirm_minutes": 3, "address_format": "evm", "description": "BNB Smart Chain. Düşük ücret."},
    {"code": "BTC",   "name": "Bitcoin",               "fee_flat_try": 400.0, "min_withdraw_try": 500.0, "confirm_minutes": 30, "address_format": "btc", "description": "Bitcoin ana ağı."},
    {"code": "SOL",   "name": "Solana",                "fee_flat_try": 2.0,   "min_withdraw_try": 5.0,   "confirm_minutes": 1, "address_format": "sol", "description": "Çok hızlı, düşük ücret."},
    {"code": "POLYGON","name": "Polygon",              "fee_flat_try": 2.0,   "min_withdraw_try": 10.0,  "confirm_minutes": 3, "address_format": "evm", "description": "Polygon PoS ana ağı."},
    {"code": "ARBITRUM","name":"Arbitrum One",         "fee_flat_try": 8.0,   "min_withdraw_try": 20.0,  "confirm_minutes": 5, "address_format": "evm", "description": "Ethereum L2."},
    {"code": "OPTIMISM","name":"Optimism",             "fee_flat_try": 8.0,   "min_withdraw_try": 20.0,  "confirm_minutes": 5, "address_format": "evm", "description": "Ethereum L2."},
    {"code": "BASE",   "name": "Base",                 "fee_flat_try": 5.0,   "min_withdraw_try": 15.0,  "confirm_minutes": 5, "address_format": "evm", "description": "Coinbase L2."},
    {"code": "AVAX",   "name": "Avalanche C-Chain",    "fee_flat_try": 4.0,   "min_withdraw_try": 10.0,  "confirm_minutes": 2, "address_format": "evm", "description": "Avalanche."},
    {"code": "BERX",   "name": "Coinberx İç Ağı",      "fee_flat_try": 0.0,   "min_withdraw_try": 1.0,   "confirm_minutes": 0, "address_format": "berx", "description": "Platform içi; anında, ücretsiz."},
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


async def get_platform_address(db, symbol: str, network_code: str) -> dict | None:
    """Return the admin-configured platform deposit address for a coin+network."""
    return await db.platform_addresses.find_one(
        {"symbol": symbol.upper(), "network": network_code.upper()}, {"_id": 0}
    )


async def list_platform_addresses(db) -> list[dict]:
    return await db.platform_addresses.find({}, {"_id": 0}).sort("symbol", 1).to_list(500)


async def upsert_platform_address(db, symbol: str, network_code: str, *, address: str, warning: str = "", min_deposit: float = 0.0, deposit_enabled: bool = True, withdraw_enabled: bool = True) -> dict:
    symbol = symbol.upper()
    network_code = network_code.upper()
    doc = {
        "symbol": symbol,
        "network": network_code,
        "address": (address or "").strip(),
        "warning": warning or "",
        "min_deposit": float(min_deposit or 0.0),
        "deposit_enabled": bool(deposit_enabled),
        "withdraw_enabled": bool(withdraw_enabled),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.platform_addresses.update_one(
        {"symbol": symbol, "network": network_code},
        {"$set": doc, "$setOnInsert": {"created_at": doc["updated_at"]}},
        upsert=True,
    )
    return await get_platform_address(db, symbol, network_code)


async def delete_platform_address(db, symbol: str, network_code: str) -> bool:
    res = await db.platform_addresses.delete_one({"symbol": symbol.upper(), "network": network_code.upper()})
    return res.deleted_count > 0


async def coin_networks_full(db, symbol: str, all_known_coins: list[str]) -> list[dict]:
    """Returns enabled networks for a coin plus the platform deposit address (if any)."""
    nets = await coin_networks(db, symbol, all_known_coins)
    out = []
    for n in nets:
        addr = await get_platform_address(db, symbol, n["code"])
        out.append({**n, "platform_address": addr})
    return out


async def get_or_create_address(db, user_id: str, symbol: str, network_code: str) -> dict:
    """Return the admin-configured platform deposit address.

    No fake auto-generation is performed. If the admin hasn't configured an
    address for this coin+network the call raises a clear error so the UI can
    surface "Bu ağ için yatırma adresi henüz tanımlanmamış" to the user.
    """
    net = await get_network(db, network_code)
    if not net:
        raise ValueError("Network not found")
    plat = await get_platform_address(db, symbol, network_code)
    if not plat or not plat.get("address"):
        raise ValueError("Bu coin/ağ için yatırma adresi henüz tanımlanmamış. Lütfen yöneticiye bildirin veya başka bir ağ seçin.")
    if not plat.get("deposit_enabled", True):
        raise ValueError("Bu coin için bu ağda yatırma şu anda kapalı.")
    return {
        "user_id": user_id,
        "symbol": symbol.upper(),
        "network": network_code.upper(),
        "address": plat["address"],
        "warning": plat.get("warning", ""),
        "min_deposit": plat.get("min_deposit", 0.0),
        "confirm_minutes": net.get("confirm_minutes", 0),
    }
