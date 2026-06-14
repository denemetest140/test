// Merkezi coin ikon sistemi.
// Resmi sembolleri spothq/cryptocurrency-icons CDN'inden alıyor,
// bulunamayan semboller için temiz harf avatarına düşüyor.

const CDN = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color";

// Sembol -> CDN dosya adı eşleme. Bilinmeyenler doğrudan lowercase sembolle deneniyor.
const SYMBOL_MAP = {
  BTC: "btc", ETH: "eth", USDT: "usdt", BNB: "bnb", SOL: "sol",
  XRP: "xrp", ADA: "ada", DOGE: "doge", TRX: "trx", AVAX: "avax",
  MATIC: "matic", POL: "matic", LINK: "link", DOT: "dot", LTC: "ltc",
  BCH: "bch", UNI: "uni", AAVE: "aave", SHIB: "shib", TON: "ton",
  ATOM: "atom", NEAR: "near", FIL: "fil", ETC: "etc", XLM: "xlm",
  ALGO: "algo", APT: "apt", ICP: "icp", VET: "vet", SAND: "sand",
  MANA: "mana", AXS: "axs", FTM: "ftm", HBAR: "hbar", EOS: "eos",
  USDC: "usdc", DAI: "dai", BUSD: "busd", TUSD: "tusd",
};

// Marka renk paleti (fallback avatar arka planı için).
const BRAND_TINTS = {
  BTC: "#F7931A", ETH: "#627EEA", USDT: "#26A17B", BNB: "#F0B90B",
  SOL: "#9945FF", XRP: "#23292F", ADA: "#0033AD", DOGE: "#C2A633",
  TRX: "#FF060A", AVAX: "#E84142", MATIC: "#8247E5", LINK: "#2A5ADA",
  DOT: "#E6007A", LTC: "#345D9D", SHIB: "#FFA409", TON: "#0098EA",
  ARB: "#28A0F0", OP: "#FF0420", INJ: "#00F0FF", BERX: "#D4A017",
  AAVE: "#B6509E", UNI: "#FF007A", PEPE: "#469F47",
};

export function coinIconUrl(symbol) {
  if (!symbol) return null;
  const s = String(symbol).toUpperCase();
  const key = SYMBOL_MAP[s] || s.toLowerCase();
  return `${CDN}/${key}.svg`;
}

export function coinTint(symbol) {
  const s = String(symbol || "").toUpperCase();
  return BRAND_TINTS[s] || "#16A34A";
}

// React görseli — gerçek ikon yüklenemezse fallback olarak harf avatarı.
import { useState } from "react";

export function CoinIcon({ symbol, size = 28, className = "", title }) {
  const [failed, setFailed] = useState(false);
  const s = String(symbol || "?").toUpperCase();

  // BERX için özgün marka rozeti — premium gold coin SVG
  if (s === "BERX") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={`inline-block ${className}`}
        title={title || s}
        aria-label="BERX"
      >
        <defs>
          <radialGradient id="berxBg" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F8DA80" />
            <stop offset="55%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#9A6E0A" />
          </radialGradient>
          <linearGradient id="berxRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="30" fill="url(#berxBg)" />
        <circle cx="32" cy="32" r="30" fill="url(#berxRim)" />
        <circle cx="32" cy="32" r="24.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M22 16 H35 a10 10 0 0 1 7.6 16.4 A10.6 10.6 0 0 1 36 49 H22 V16 Z M28 22 V30 H34 a4 4 0 0 0 0-8 H28 Z M28 35 V43 H35 a4 4 0 0 0 0-8 H28 Z"
              fill="#1F1A0A" />
        <circle cx="50" cy="14" r="3" fill="#FFFFFF" opacity="0.85" />
        <circle cx="14" cy="50" r="2" fill="#FFFFFF" opacity="0.55" />
      </svg>
    );
  }

  if (failed) {
    const tint = coinTint(s);
    return (
      <span
        title={title || s}
        className={`inline-flex items-center justify-center rounded-full font-semibold ${className}`}
        style={{
          width: size, height: size, background: `${tint}1A`, color: tint,
          fontSize: Math.max(9, Math.round(size * 0.40)),
        }}
      >{s.slice(0, s.length > 4 ? 3 : 2)}</span>
    );
  }
  return (
    <img
      src={coinIconUrl(s)}
      alt={s}
      title={title || s}
      width={size}
      height={size}
      className={`inline-block rounded-full ${className}`}
      onError={() => setFailed(true)}
      loading="lazy"
      style={{ background: "#FFF" }}
    />
  );
}
