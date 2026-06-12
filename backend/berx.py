"""BERX — the platform's in-house virtual coin (admin-controlled price)."""
import random
import time
from datetime import datetime, timezone, timedelta
from typing import Any, List, Dict, Optional


BERX_META: Dict[str, str] = {"symbol": "BERX", "name": "Berx Token"}


async def seed_berx(db: Any) -> None:
    """Create initial BERX state + backfill 72h of historical ticks (random walk)."""
    existing = await db.berx_settings.find_one({"_id": "global"})
    if existing:
        return
    start_price: float = 1.00
    await db.berx_settings.insert_one(
        {"_id": "global", "price_try": start_price, "created_at": datetime.now(timezone.utc).isoformat()}
    )
    # backfill 72h of hourly ticks
    now = datetime.now(timezone.utc)
    price: float = start_price
    ticks: List[Dict[str, Any]] = []
    for i in range(72, 0, -1):
        price = max(0.1, price * (1 + random.uniform(-0.025, 0.028)))
        ts = (now - timedelta(hours=i)).isoformat()
        ticks.append({"ts": ts, "price": round(price, 6)})
    # final tick at current time
    ticks.append({"ts": now.isoformat(), "price": round(price, 6)})
    await db.berx_ticks.insert_many(ticks)
    await db.berx_settings.update_one({"_id": "global"}, {"$set": {"price_try": round(price, 6)}})


async def get_berx_price(db: Any) -> float:
    doc = await db.berx_settings.find_one({"_id": "global"})
    return float(doc["price_try"]) if doc else 1.0


async def push_tick(db: Any, price: float) -> None:
    await db.berx_ticks.insert_one(
        {"ts": datetime.now(timezone.utc).isoformat(), "price": round(float(price), 6)}
    )
    await db.berx_settings.update_one(
        {"_id": "global"}, {"$set": {"price_try": round(float(price), 6)}}, upsert=True
    )


async def set_price(db: Any, new_price: float) -> float:
    new_price = max(0.0001, float(new_price))
    await push_tick(db, new_price)
    return new_price


async def adjust_price(db: Any, pct: float) -> float:
    cur: float = await get_berx_price(db)
    new_price: float = cur * (1 + (pct / 100.0))
    new_price = max(0.0001, new_price)
    await push_tick(db, new_price)
    return new_price


async def get_ticker(db: Any) -> Dict[str, Any]:
    cur: float = await get_berx_price(db)
    # 24h ago reference
    day_ago: str = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    past: Optional[Dict[str, Any]] = await db.berx_ticks.find_one({"ts": {"$lte": day_ago}}, sort=[("ts", -1)])
    past_price: float = float(past["price"]) if past else cur
    change: float = ((cur - past_price) / past_price * 100.0) if past_price else 0.0
    # 24h high/low
    high = await db.berx_ticks.find_one(
        {"ts": {"$gte": day_ago}}, sort=[("price", -1)], projection={"price": 1}
    )
    low = await db.berx_ticks.find_one(
        {"ts": {"$gte": day_ago}}, sort=[("price", 1)], projection={"price": 1}
    )
    volume_pipeline = [
        {"$match": {"type": "trade", "symbol": "BERX", "created_at": {"$gte": day_ago}}},
        {"$group": {"_id": None, "v": {"$sum": "$amount_try"}}},
    ]
    vol: List[Dict[str, Any]] = await db.transactions.aggregate(volume_pipeline).to_list(1)
    return {
        "symbol": "BERX",
        "name": BERX_META["name"],
        "price_usdt": 0.0,
        "price_try": cur,
        "change_24h": round(change, 2),
        "volume_24h_try": vol[0]["v"] if vol else 0.0,
        "high_24h_try": float(high["price"]) if high else cur,
        "low_24h_try": float(low["price"]) if low else cur,
    }


async def get_klines(db: Any, interval: str = "1h", limit: int = 200) -> List[Dict[str, Any]]:
    """Bucket ticks into candles at the requested interval."""
    bucket_seconds: int = {
        "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400,
    }.get(interval, 3600)
    # Fetch recent ticks (generous window)
    since: str = (datetime.now(timezone.utc) - timedelta(seconds=bucket_seconds * limit * 2)).isoformat()
    ticks: List[Dict[str, Any]] = await db.berx_ticks.find(
        {"ts": {"$gte": since}}, {"_id": 0}
    ).sort("ts", 1).to_list(5000)
    if not ticks:
        return []
    buckets: Dict[int, Dict[str, float]] = {}
    for t in ticks:
        ts_dt = datetime.fromisoformat(t["ts"])
        ts_epoch = int(ts_dt.timestamp())
        key = ts_epoch - (ts_epoch % bucket_seconds)
        p = float(t["price"])
        b = buckets.setdefault(key, {"open": p, "high": p, "low": p, "close": p, "volume": 0.0})
        b["high"] = max(b["high"], p)
        b["low"] = min(b["low"], p)
        b["close"] = p
    rows: List[Dict[str, Any]] = [{"time": k, **v} for k, v in sorted(buckets.items())]
    return rows[-limit:]


async def get_sparkline(db: Any, points: int = 24) -> List[float]:
    candles = await get_klines(db, interval="1h", limit=points)
    return [c["close"] for c in candles]


async def get_depth(db: Any) -> Dict[str, List[List[float]]]:
    cur: float = await get_berx_price(db)
    bids: List[List[float]] = []
    asks: List[List[float]] = []
    for i in range(1, 11):
        spread = 0.002 * i
        bids.append([round(cur * (1 - spread), 6), round(random.uniform(100, 2000), 2)])
        asks.append([round(cur * (1 + spread), 6), round(random.uniform(100, 2000), 2)])
    return {"bids": bids, "asks": asks}


async def get_recent_trades(db: Any) -> List[Dict[str, Any]]:
    cur: float = await get_berx_price(db)
    now_ts: int = int(time.time())
    out: List[Dict[str, Any]] = []
    for i in range(20):
        jitter = 1 + random.uniform(-0.004, 0.004)
        out.append({
            "time": now_ts - i * 60,
            "price": round(cur * jitter, 6),
            "qty": round(random.uniform(10, 500), 2),
            "is_buyer_maker": bool(random.getrandbits(1)),
        })
    return out
