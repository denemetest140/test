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

  // BERX için özgün marka rozeti
  if (s === "BERX") {
    return (
      <span
        title={title || s}
        className={`inline-flex items-center justify-center rounded-full font-bold ${className}`}
        style={{
          width: size, height: size,
          background: "linear-gradient(135deg, #F5C04D 0%, #D4A017 60%, #B8860B 100%)",
          color: "#1F1A0A",
          fontSize: Math.max(10, Math.round(size * 0.42)),
          boxShadow: "0 1px 2px rgba(15,23,42,.08), inset 0 -1px 0 rgba(0,0,0,.08)",
        }}
      >B</span>
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
