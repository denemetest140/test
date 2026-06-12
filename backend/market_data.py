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
    {"symbol": "ATOM", "name": "Cosmos"},
    {"symbol": "NEAR", "name": "NEAR Protocol"},
    {"symbol": "UNI", "name": "Uniswap"},
    {"symbol": "APT", "name": "Aptos"},
    {"symbol": "ARB", "name": "Arbitrum"},
    {"symbol": "OP", "name": "Optimism"},
    {"symbol": "FIL", "name": "Filecoin"},
    {"symbol": "ICP", "name": "Internet Computer"},
    {"symbol": "ETC", "name": "Ethereum Classic"},
    {"symbol": "XLM", "name": "Stellar"},
    {"symbol": "HBAR", "name": "Hedera"},
    {"symbol": "VET", "name": "VeChain"},
    {"symbol": "ALGO", "name": "Algorand"},
    {"symbol": "INJ", "name": "Injective"},
    {"symbol": "AAVE", "name": "Aave"},
    {"symbol": "SUI", "name": "Sui"},
    {"symbol": "RNDR", "name": "Render"},
    {"symbol": "GRT", "name": "The Graph"},
    {"symbol": "SAND", "name": "The Sandbox"},
    {"symbol": "PEPE", "name": "Pepe"},
    {"symbol": "TON", "name": "Toncoin"},
    {"symbol": "MKR", "name": "Maker"},
    {"symbol": "FET", "name": "Fetch.ai"},
    {"symbol": "TIA", "name": "Celestia"},
    {"symbol": "STX", "name": "Stacks"},
    {"symbol": "CHZ", "name": "Chiliz"},
    {"symbol": "CRV", "name": "Curve"},
    {"symbol": "LDO", "name": "Lido DAO"},
    {"symbol": "IMX", "name": "Immutable"},
    {"symbol": "FLOW", "name": "Flow"},
    {"symbol": "APE", "name": "ApeCoin"},
    {"symbol": "MANA", "name": "Decentraland"},
    {"symbol": "CAKE", "name": "PancakeSwap"},
    {"symbol": "AXS", "name": "Axie Infinity"},
    {"symbol": "GALA", "name": "Gala"},
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


def _binance_symbols_param(coins: list[dict]) -> str:
    """Build the JSON array string Binance expects for batch ticker calls."""
    symbols = [f"{c['symbol']}USDT" for c in coins if c["symbol"] != "USDT"]
    return '[' + ','.join(f'"{s}"' for s in symbols) + ']'


def _assemble_ticker_row(coin: dict, raw: dict | None, try_ticker: dict, usdt_try_price: float) -> dict | None:
    """Convert a raw Binance row into a Coinberx ticker dict (in TRY)."""
    sym = coin["symbol"]
    if sym == "USDT":
        price_usdt = 1.0
        change = float(try_ticker.get("priceChangePercent", 0))
        volume = float(try_ticker.get("quoteVolume", 0))
        high = float(try_ticker.get("highPrice", 0))
        low = float(try_ticker.get("lowPrice", 0))
    else:
        if not raw:
            return None
        price_usdt = float(raw["lastPrice"])
        change = float(raw["priceChangePercent"])
        volume = float(raw["quoteVolume"])
        high = float(raw["highPrice"])
        low = float(raw["lowPrice"])

    scale = 1.0 if sym == "USDT" else usdt_try_price
    price_try = usdt_try_price if sym == "USDT" else price_usdt * usdt_try_price
    return {
        "symbol": sym,
        "name": coin["name"],
        "price_usdt": price_usdt,
        "price_try": price_try,
        "change_24h": change,
        "volume_24h_try": volume * scale,
        "high_24h_try": high * scale,
        "low_24h_try": low * scale,
    }


async def fetch_all_tickers() -> list[dict]:
    """Returns 24h ticker data for all supported coins, including TRY price."""
    cached = _cache_get("tickers", _CACHE_TTL)
    if cached is not None:
        return cached

    symbols_param = _binance_symbols_param(SUPPORTED_COINS)
    try:
        usdt_data = await _fetch(
            f"{BINANCE_BASE}/api/v3/ticker/24hr", {"symbols": symbols_param}
        )
        try_ticker = await _fetch(
            f"{BINANCE_BASE}/api/v3/ticker/24hr", {"symbol": "USDTTRY"}
        )
        usdt_try_price = float(try_ticker["lastPrice"])
    except Exception as exc:
        logger.error("Binance fetch failed: %s", exc)
        return cached or []

    by_symbol = {d["symbol"]: d for d in usdt_data}
    result: list[dict] = []
    for coin in SUPPORTED_COINS:
        raw = by_symbol.get(f"{coin['symbol']}USDT")
        row = _assemble_ticker_row(coin, raw, try_ticker, usdt_try_price)
        if row is not None:
            result.append(row)

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
    raw: dict = {"bids": [], "asks": []}
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


async def fetch_sparkline(symbol: str, points: int = 24) -> list[float]:
    """Returns last `points` hourly closes in TRY, cached for 1 minute."""
    cache_key = f"spark:{symbol}:{points}"
    cached = _cache_get(cache_key, 60)
    if cached is not None:
        return cached
    symbol = symbol.upper()
    if symbol == "USDT":
        binance_symbol = "USDTTRY"
        scale = 1.0
    else:
        binance_symbol = f"{symbol}USDT"
        scale = await get_usdt_try()
    raw: list = []
    try:
        raw = await _fetch(
            f"{BINANCE_BASE}/api/v3/klines",
            {"symbol": binance_symbol, "interval": "1h", "limit": points},
        )
    except Exception:
        return []
    closes = [float(c[4]) * scale for c in raw]
    _cache_set(cache_key, closes)
    return closes


async def fetch_recent_trades(symbol: str, limit: int = 30) -> list[dict]:
    symbol = symbol.upper()
    if symbol == "USDT":
        binance_symbol = "USDTTRY"
        scale = 1.0
    else:
        binance_symbol = f"{symbol}USDT"
        scale = await get_usdt_try()
    raw: list = []
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
