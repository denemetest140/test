"""Binance public API proxy with in-memory caching."""
import time
import logging
import httpx

logger = logging.getLogger(__name__)

BINANCE_BASE = "https://data-api.binance.vision"

# Symbols we expose in Coinberx (USDT markets; TRY pair computed with USDT/TRY).
SUPPORTED_COINS = [
    {"symbol": "BTC", "name": "Bitcoin"},
    {"symbol": "ETH", "name": "Ethereum"},
    {"symbol": "USDT", "name": "Tether"},
    {"symbol": "BNB", "name": "Binance Coin"},
    {"symbol": "SOL", "name": "Solana"},
    {"symbol": "XRP", "name": "Ripple"},
    {"symbol": "ADA", "name": "Cardano"},
    {"symbol": "DOGE", "name": "Dogecoin"},
    {"symbol": "AVAX", "name": "Avalanche"},
    {"symbol": "TRX", "name": "TRON"},
    {"symbol": "LINK", "name": "Chainlink"},
    {"symbol": "DOT", "name": "Polkadot"},
    {"symbol": "MATIC", "name": "Polygon"},
    {"symbol": "LTC", "name": "Litecoin"},
    {"symbol": "SHIB", "name": "Shiba Inu"},
]

COIN_META = {c["symbol"]: c for c in SUPPORTED_COINS}

# Cache: {key: (timestamp, data)}
_cache: dict = {}
_CACHE_TTL = 5  # seconds for tickers
_KLINES_TTL = 8


def _cache_get(key: str, ttl: int):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < ttl:
        return entry[1]
    return None


def _cache_set(key: str, data):
    _cache[key] = (time.time(), data)


async def _fetch(url: str, params: dict | None = None):
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params or {})
        resp.raise_for_status()
        return resp.json()


async def fetch_all_tickers() -> list[dict]:
    """Returns 24h ticker data for all supported coins, including TRY price."""
    cached = _cache_get("tickers", _CACHE_TTL)
    if cached is not None:
        return cached

    # Use a single batch call with symbols array
    symbols = [f"{c['symbol']}USDT" for c in SUPPORTED_COINS if c["symbol"] != "USDT"]
    symbols_param = '[' + ','.join(f'"{s}"' for s in symbols) + ']'

    try:
        # ticker/24hr accepts symbols param
        usdt_data = await _fetch(
            f"{BINANCE_BASE}/api/v3/ticker/24hr", {"symbols": symbols_param}
        )
        # USDT/TRY for converting
        try_ticker = await _fetch(
            f"{BINANCE_BASE}/api/v3/ticker/24hr", {"symbol": "USDTTRY"}
        )
        usdt_try_price = float(try_ticker["lastPrice"])
    except Exception as exc:
        logger.error("Binance fetch failed: %s", exc)
        return cached or []

    result = []
    by_symbol = {d["symbol"]: d for d in usdt_data}
    for coin in SUPPORTED_COINS:
        sym = coin["symbol"]
        if sym == "USDT":
            price_usdt = 1.0
            change = float(try_ticker.get("priceChangePercent", 0))
            volume = float(try_ticker.get("quoteVolume", 0))
            high = float(try_ticker.get("highPrice", 0))
            low = float(try_ticker.get("lowPrice", 0))
        else:
            t = by_symbol.get(f"{sym}USDT")
            if not t:
                continue
            price_usdt = float(t["lastPrice"])
            change = float(t["priceChangePercent"])
            volume = float(t["quoteVolume"])
            high = float(t["highPrice"])
            low = float(t["lowPrice"])

        price_try = price_usdt * usdt_try_price if sym != "USDT" else usdt_try_price
        result.append(
            {
                "symbol": sym,
                "name": coin["name"],
                "price_usdt": price_usdt,
                "price_try": price_try,
                "change_24h": change,
                "volume_24h_try": volume * (usdt_try_price if sym != "USDT" else 1),
                "high_24h_try": high * (usdt_try_price if sym != "USDT" else 1),
                "low_24h_try": low * (usdt_try_price if sym != "USDT" else 1),
            }
        )
    # Cache usdt_try rate too
    _cache_set("usdt_try", usdt_try_price)
    _cache_set("tickers", result)
    return result


async def get_usdt_try() -> float:
    cached = _cache_get("usdt_try", _CACHE_TTL)
    if cached is not None:
        return cached
    await fetch_all_tickers()
    return _cache_get("usdt_try", _CACHE_TTL) or 34.0


async def fetch_ticker(symbol: str) -> dict | None:
    tickers = await fetch_all_tickers()
    for t in tickers:
        if t["symbol"] == symbol.upper():
            return t
    return None


async def fetch_klines(symbol: str, interval: str = "1h", limit: int = 200) -> list[dict]:
    """Returns OHLCV candles in TRY denomination using live USDT/TRY scaling."""
    cache_key = f"klines:{symbol}:{interval}:{limit}"
    cached = _cache_get(cache_key, _KLINES_TTL)
    if cached is not None:
        return cached

    symbol = symbol.upper()
    if symbol == "USDT":
        binance_symbol = "USDTTRY"
        scale = 1.0
    else:
        binance_symbol = f"{symbol}USDT"
        scale = await get_usdt_try()

    try:
        raw = await _fetch(
            f"{BINANCE_BASE}/api/v3/klines",
            {"symbol": binance_symbol, "interval": interval, "limit": limit},
        )
    except Exception as exc:
        logger.error("Klines fetch failed for %s: %s", symbol, exc)
        return []

    candles = [
        {
            "time": int(c[0] / 1000),
            "open": float(c[1]) * scale,
            "high": float(c[2]) * scale,
            "low": float(c[3]) * scale,
            "close": float(c[4]) * scale,
            "volume": float(c[5]),
        }
        for c in raw
    ]
    _cache_set(cache_key, candles)
    return candles


async def fetch_order_book(symbol: str, limit: int = 20) -> dict:
    """Returns bids/asks in TRY denomination."""
    symbol = symbol.upper()
    if symbol == "USDT":
        binance_symbol = "USDTTRY"
        scale = 1.0
    else:
        binance_symbol = f"{symbol}USDT"
        scale = await get_usdt_try()
    try:
        raw = await _fetch(
            f"{BINANCE_BASE}/api/v3/depth",
            {"symbol": binance_symbol, "limit": limit},
        )
    except Exception as exc:
        logger.error("Depth fetch failed: %s", exc)
        return {"bids": [], "asks": []}

    return {
        "bids": [[float(p) * scale, float(q)] for p, q in raw["bids"]],
        "asks": [[float(p) * scale, float(q)] for p, q in raw["asks"]],
    }


async def fetch_recent_trades(symbol: str, limit: int = 30) -> list[dict]:
    symbol = symbol.upper()
    if symbol == "USDT":
        binance_symbol = "USDTTRY"
        scale = 1.0
    else:
        binance_symbol = f"{symbol}USDT"
        scale = await get_usdt_try()
    try:
        raw = await _fetch(
            f"{BINANCE_BASE}/api/v3/trades",
            {"symbol": binance_symbol, "limit": limit},
        )
    except Exception as exc:
        logger.error("Trades fetch failed: %s", exc)
        return []

    return [
        {
            "time": int(t["time"] / 1000),
            "price": float(t["price"]) * scale,
            "qty": float(t["qty"]),
            "is_buyer_maker": t["isBuyerMaker"],
        }
        for t in raw
    ]
