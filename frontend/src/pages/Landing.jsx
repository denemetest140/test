import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatPct } from "../lib/api";
import { CoinIcon } from "../lib/coinIcons.jsx";
import { useAuth } from "../contexts/AuthContext";
import { usePageSeo, useSettings } from "../contexts/SettingsContext";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendUp,
  TrendDown,
  Flame,
  Sparkle,
  Lightning,
  ShieldCheck,
  CreditCard,
  ChartLineUp,
  Users,
  Lock,
  Headset,
  Globe,
  CaretRight,
  CheckCircle,
  MagnifyingGlass,
  Star,
  TwitterLogo,
  TelegramLogo,
  InstagramLogo,
  YoutubeLogo,
} from "@phosphor-icons/react";
import { ResponsiveContainer, AreaChart, Area, LineChart, Line } from "recharts";

// --- Hero with live price card ----------------------------------------------
function HeroPriceCard({ coin, spark }) {
  if (!coin) return (
    <div className="card-surface p-6 w-full max-w-md h-[340px] animate-pulse" />
  );
  const up = coin.change_24h >= 0;
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-radial-gold blur-2xl opacity-50 pointer-events-none" />
      <div className="card-surface relative p-6 w-full max-w-md backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={coin.symbol} size={40}/>
            <div>
              <div className="font-display text-lg text-[#0F172A]">{coin.symbol}<span className="text-[#94A3B8]">/TRY</span></div>
              <div className="text-xs text-[#64748B]">{coin.name}</div>
            </div>
          </div>
          <div className={`chip ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            {up ? <TrendUp size={12} weight="fill"/> : <TrendDown size={12} weight="fill"/>}
            {formatPct(coin.change_24h)}
          </div>
        </div>
        <div className="font-display text-4xl tabular mt-4 text-[#0F172A]" data-testid="hero-btc-price">{formatTRY(coin.price_try)}</div>
        <div className="text-xs text-[#64748B] mt-1 tabular">24s hacim {formatTRY(coin.volume_24h_try, 0)}</div>

        <div className="h-20 mt-5 -mx-2">
          <ResponsiveContainer>
            <AreaChart data={(spark||[]).map((c,i) => ({i, c}))}>
              <defs>
                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up?"#16A34A":"#DC2626"} stopOpacity={0.5}/>
                  <stop offset="100%" stopColor={up?"#16A34A":"#DC2626"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area dataKey="c" stroke={up?"#16A34A":"#DC2626"} strokeWidth={2} fill="url(#heroSpark)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link to="/register" className="py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold text-center" data-testid="hero-card-buy">Al</Link>
          <Link to="/register" className="py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#DC2626] text-white text-sm font-semibold text-center" data-testid="hero-card-sell">Sat</Link>
        </div>
      </div>

      {/* Small floating satellites */}
      <div className="hidden xl:block absolute -top-6 -left-20 card-surface px-3 py-2 backdrop-blur-xl animate-float" style={{ animationDelay: "0.5s" }}>
        <div className="text-[10px] text-[#64748B]">ETH</div>
        <div className="tabular text-sm">{coin.symbol === "ETH" ? "-" : ""}</div>
      </div>
    </div>
  );
}

// --- Ticker bar ---------------------------------------------------------------
function TickerBar({ coins }) {
  if (!coins || coins.length === 0) return null;
  const rail = [...coins, ...coins]; // duplicate for seamless scroll
  return (
    <div className="relative overflow-hidden border-y border-[#E2E8F0] bg-[#FFFFFF]">
      <div className="animate-ticker flex whitespace-nowrap py-3">
        {rail.map((c, i) => {
          const up = c.change_24h >= 0;
          return (
            <Link to={`/trade/${c.symbol}`} key={i} className="flex items-center gap-2 px-6 text-sm">
              <CoinIcon symbol={c.symbol} size={20}/>
              <span className="font-medium">{c.symbol}</span>
              <span className="tabular text-[#64748B]">{formatTRY(c.price_try)}</span>
              <span className={`tabular text-xs ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>{formatPct(c.change_24h)}</span>
              <span className="w-px h-4 bg-[#E2E8F0] ml-3"/>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// --- Highlight card with mini sparkline -------------------------------------
function HighlightCard({ title, icon: Icon, tint, coin, spark }) {
  if (!coin) return <div className="card-surface p-5 h-[180px] animate-pulse" />;
  const up = coin.change_24h >= 0;
  const data = (spark || []).map((c, i) => ({ i, c }));
  return (
    <Link to={`/trade/${coin.symbol}`} className="card-surface p-5 block hover:border-[#16A34A]/60 transition-all group relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${tint} opacity-20 blur-2xl`} />
      <div className="flex items-center gap-2 text-xs text-[#64748B]">
        <Icon size={14} weight="fill" className={tint.replace("bg-","text-")} />
        {title}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <CoinIcon symbol={coin.symbol} size={36}/>
        <div>
          <div className="font-display text-base">{coin.symbol}</div>
          <div className="text-[11px] text-[#64748B]">{coin.name}</div>
        </div>
      </div>
      <div className="flex items-end justify-between mt-3">
        <div>
          <div className="tabular text-sm">{formatTRY(coin.price_try)}</div>
          <div className={`tabular text-xs ${up?"text-[#16A34A]":"text-[#DC2626]"} flex items-center gap-0.5`}>
            {up?<ArrowUpRight size={10} weight="bold"/>:<ArrowDownRight size={10} weight="bold"/>}
            {formatPct(coin.change_24h)}
          </div>
        </div>
        <div className="w-24 h-10">
          <ResponsiveContainer>
            <LineChart data={data}>
              <Line dataKey="c" stroke={up?"#16A34A":"#DC2626"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs text-[#16A34A] opacity-0 group-hover:opacity-100 transition">
        Al-Sat <CaretRight size={10} weight="bold"/>
      </div>
    </Link>
  );
}

// --- Heatmap tile --------------------------------------------------------------
function HeatTile({ coin }) {
  const ch = coin.change_24h || 0;
  const mag = Math.min(Math.abs(ch) / 8, 1); // saturate at 8%
  const bg = ch >= 0
    ? `rgba(16,185,129, ${0.15 + mag * 0.55})`
    : `rgba(239,68,68, ${0.15 + mag * 0.55})`;
  const size = Math.max(1, Math.log10(coin.volume_24h_try || 1));
  const span = size > 9 ? "col-span-2 row-span-2" : size > 8 ? "col-span-2" : "";
  return (
    <Link
      to={`/trade/${coin.symbol}`}
      className={`relative rounded-md p-3 flex flex-col justify-between min-h-[72px] ${span} transition-transform hover:scale-[1.03]`}
      style={{ background: bg, border: "1px solid #E2E8F0" }}
    >
      <div className="text-sm font-bold">{coin.symbol}</div>
      <div>
        <div className="tabular text-xs">{formatTRY(coin.price_try)}</div>
        <div className="tabular text-[11px] font-medium">{formatPct(ch)}</div>
      </div>
    </Link>
  );
}

// --- Horizontal scroll rail ---------------------------------------------------
function RailCard({ coin, spark }) {
  if (!coin) return null;
  const up = coin.change_24h >= 0;
  const data = (spark || []).map((c, i) => ({ i, c }));
  return (
    <Link
      to={`/trade/${coin.symbol}`}
      className="shrink-0 w-[240px] card-surface p-4 hover:border-[#16A34A]/60 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center gap-3">
        <CoinIcon symbol={coin.symbol} size={36}/>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base truncate text-[#0F172A]">{coin.symbol}</div>
          <div className="text-[11px] text-[#64748B] truncate">{coin.name}</div>
        </div>
        <Star size={14} className="text-[#CBD5E1] group-hover:text-[#16A34A]"/>
      </div>
      <div className="mt-3">
        <div className="tabular text-lg">{formatTRY(coin.price_try, coin.price_try < 1 ? 6 : 2)}</div>
        <div className={`tabular text-xs flex items-center gap-0.5 mt-0.5 ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>
          {up?<ArrowUpRight size={10} weight="bold"/>:<ArrowDownRight size={10} weight="bold"/>}
          {formatPct(coin.change_24h)}
        </div>
      </div>
      <div className="h-12 mt-3 -mx-2">
        <ResponsiveContainer>
          <LineChart data={data}>
            <Line dataKey="c" stroke={up?"#16A34A":"#DC2626"} strokeWidth={1.8} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 py-1.5 rounded-md bg-[#16A34A] text-black text-xs font-semibold text-center opacity-0 group-hover:opacity-100 transition">
        Al-Sat
      </div>
    </Link>
  );
}

function CoinRail({ title, icon: Icon, tint, coins, sparks, onMount }) {
  useEffect(() => { onMount && onMount(coins); }, [coins, onMount]);
  const ref = useRef(null);
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} weight="fill" className={tint}/>
          <h3 className="font-display text-xl">{title}</h3>
        </div>
        <div className="hidden sm:flex gap-1">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded border border-[#E2E8F0] flex items-center justify-center hover:bg-[#FFFFFF]"><CaretRight size={12} weight="bold" className="rotate-180"/></button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded border border-[#E2E8F0] flex items-center justify-center hover:bg-[#FFFFFF]"><CaretRight size={12} weight="bold"/></button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-thin pb-2 snap-x">
        {coins.slice(0, 15).map((c) => <div key={c.symbol} className="snap-start"><RailCard coin={c} spark={sparks[c.symbol]}/></div>)}
      </div>
    </div>
  );
}

// --- BERX Spotlight Card -----------------------------------------------------
function BerxSpotlightCard({ sparks }) {
  const [berx, setBerx] = useState(null);
  useEffect(() => {
    const load = () => api.get("/markets/BERX").then((r) => setBerx(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);
  if (!berx) return <div className="card-surface p-6 h-[360px] animate-pulse"/>;
  const up = berx.change_24h >= 0;
  const spark = sparks["BERX"] || [];
  const data = spark.map((c, i) => ({ i, c }));
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-radial-gold blur-2xl opacity-80"/>
      <div className="relative card-surface p-7 backdrop-blur-xl border-[#D4A017]/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A017]/15 text-[#D4A017] flex items-center justify-center font-display text-xl font-bold">B</div>
            <div>
              <div className="font-display text-xl text-[#0F172A]">BERX</div>
              <div className="text-xs text-[#64748B]">Berx Token · Coinberx İç Ağı</div>
            </div>
          </div>
          <div className={`chip ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>
            {up?<TrendUp size={12} weight="fill"/>:<TrendDown size={12} weight="fill"/>}
            {formatPct(berx.change_24h)}
          </div>
        </div>
        <div className="font-display text-4xl tabular mt-5 text-[#D4A017]">{formatTRY(berx.price_try, 6)}</div>
        <div className="text-xs text-[#64748B] tabular mt-1">24s Hacim {formatTRY(berx.volume_24h_try, 0)}</div>
        <div className="h-24 mt-4 -mx-2">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="berxFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4A017" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="#D4A017" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area dataKey="c" stroke="#D4A017" strokeWidth={2} fill="url(#berxFill)" isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Link to="/trade/BERX" className="py-2.5 rounded-lg bg-[#D4A017] hover:bg-[#B8860B] text-white text-sm font-semibold text-center transition" data-testid="berx-spot-buy">Al-Sat</Link>
          <Link to="/transfer" className="py-2.5 rounded-lg border border-[#D4A017]/50 hover:bg-[#D4A017]/10 text-sm text-center text-[#0F172A]">Gönder</Link>
        </div>
      </div>
    </div>
  );
}

// --- Main Landing -----------------------------------------------------------
export default function Landing() {
  usePageSeo("home");
  const { user } = useAuth();
  const { settings } = useSettings();
  const [coins, setCoins] = useState([]);
  const [sparks, setSparks] = useState({});
  const [query, setQuery] = useState("");
  const prevPrices = useRef({});
  const [flashes, setFlashes] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/markets");
        // price flashes
        const flash = {};
        data.forEach((c) => {
          const prev = prevPrices.current[c.symbol];
          if (prev && prev !== c.price_try) flash[c.symbol] = c.price_try > prev ? "up" : "down";
          prevPrices.current[c.symbol] = c.price_try;
        });
        setFlashes(flash);
        setCoins(data);
      } catch { /* ignore */ }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  // Fetch sparklines for a curated set (top 8 by volume + BERX)
  useEffect(() => {
    if (coins.length === 0) return;
    const top = [...coins].sort((a,b)=>b.volume_24h_try-a.volume_24h_try).slice(0,8).map(c=>c.symbol);
    const forceBerx = coins.find((c) => c.symbol === "BERX") ? ["BERX"] : [];
    const symbols = Array.from(new Set([...top, ...forceBerx]));
    symbols.forEach(async (sym) => {
      if (sparks[sym]) return;
      try {
        const { data } = await api.get(`/markets/${sym}/sparkline?points=24`);
        setSparks((s) => ({ ...s, [sym]: data.points }));
      } catch { /* ignore */ }
    });
    // eslint-disable-next-line
  }, [coins.length]);

  const btc = coins.find((c) => c.symbol === "BTC");
  const topGainer = useMemo(() => coins.slice().sort((a,b)=>b.change_24h-a.change_24h)[0], [coins]);
  const topLoser = useMemo(() => coins.slice().sort((a,b)=>a.change_24h-b.change_24h)[0], [coins]);
  const topVolume = useMemo(() => coins.slice().sort((a,b)=>b.volume_24h_try-a.volume_24h_try)[0], [coins]);
  const trending = useMemo(() => coins.slice().sort((a,b)=>Math.abs(b.change_24h)-Math.abs(a.change_24h))[1] || topGainer, [coins, topGainer]);

  const gainersList = useMemo(() => coins.slice().sort((a,b)=>b.change_24h-a.change_24h).slice(0,15), [coins]);
  const losersList = useMemo(() => coins.slice().sort((a,b)=>a.change_24h-b.change_24h).slice(0,15), [coins]);
  const trendingList = useMemo(() => coins.slice().sort((a,b)=>b.volume_24h_try-a.volume_24h_try).slice(0,15), [coins]);

  const loadSparksFor = (list) => {
    list.slice(0, 8).forEach(async (c) => {
      if (sparks[c.symbol]) return;
      try {
        const { data } = await api.get(`/markets/${c.symbol}/sparkline?points=24`);
        setSparks((s) => ({ ...s, [c.symbol]: data.points }));
      } catch { /* ignore */ }
    });
  };

  const filteredTable = useMemo(() => {
    const list = coins.slice().sort((a,b)=>b.volume_24h_try-a.volume_24h_try);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((c)=>c.symbol.toLowerCase().includes(q)||c.name.toLowerCase().includes(q));
  }, [coins, query]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0F172A]">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name || "Coinberx"} className="h-9 max-w-[170px] object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center text-white font-bold text-xl shadow-sm">C</div>
                  <span className="font-display text-xl tracking-tight">Coinberx</span>
                </>
              )}
            </Link>
            <nav className="hidden lg:flex items-center gap-6 text-sm text-[#475569]">
              <Link to="/markets" className="hover:text-[#16A34A] font-medium">Piyasalar</Link>
              <Link to={user ? "/trade/BTC" : "/login"} className="hover:text-[#16A34A] font-medium">Spot İşlem</Link>
              <Link to={user ? "/trade/BTC" : "/login"} className="hover:text-[#16A34A] font-medium">Kolay Al/Sat</Link>
              <Link to="/deposit" className="hover:text-[#16A34A] font-medium">Yatır/Çek</Link>
              <a href="#security" className="hover:text-[#16A34A] font-medium">Güvenlik</a>
              <Link to="/support" className="hover:text-[#16A34A] font-medium">Destek</Link>
              <Link to="/blog" className="hover:text-[#16A34A] font-medium">Blog</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/wallet" data-testid="landing-wallet" className="px-4 py-2 text-sm rounded-lg hover:bg-[#F1F5F9] text-[#0F172A] font-medium">Cüzdanım</Link>
                <Link to="/dashboard" data-testid="landing-dashboard" className="btn-primary px-4 py-2 text-sm rounded-lg shadow-sm">Panele Git</Link>
              </>
            ) : (
              <>
                <Link to="/login" data-testid="landing-login" className="px-4 py-2 text-sm rounded-lg hover:bg-[#F1F5F9] text-[#0F172A] font-medium">Giriş Yap</Link>
                <Link to="/register" data-testid="landing-register" className="btn-primary px-4 py-2 text-sm rounded-lg shadow-sm">Hesap Aç</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative hero-glow overflow-hidden">
        <div className="absolute inset-0 dotted opacity-40 pointer-events-none" />
        <div className="absolute top-40 -left-32 w-[500px] h-[500px] rounded-full bg-[#16A34A]/15 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-[420px] h-[420px] rounded-full bg-[#16A34A]/10 blur-3xl animate-blob pointer-events-none" style={{animationDelay:"3s"}} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-24 pb-12 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 anim-fade-up">
            <div className="chip">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse-gold"/>
              TR lira ile kriptoya 60 saniyede başla
            </div>
            <h1 className="font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl mt-6 leading-[1.05]">
              Coinberx ile kriptoya
              <br/>
              <span className="bg-gradient-to-r from-[#16A34A] via-[#22C55E] to-[#16A34A] bg-clip-text text-transparent">anında başla.</span>
            </h1>
            <p className="text-[#64748B] text-base sm:text-lg mt-6 max-w-2xl">
              Hızlı, güvenli ve tamamen Türkçe kripto al-sat platformu. IBAN ile dakikalar içinde TL yatırın, geniş coin seçenekleriyle düşük komisyonla işlem yapın.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              {user ? (
                <>
                  <Link to="/trade/BTC" data-testid="hero-trade-now" className="btn-primary px-6 py-3.5 rounded-lg text-sm flex items-center gap-2">
                    Hemen Al-Sat <ArrowUpRight size={14} weight="bold"/>
                  </Link>
                  <Link to="/dashboard" data-testid="hero-go-dashboard" className="px-6 py-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm flex items-center gap-2">
                    Hesap Panelim <ChartLineUp size={14} weight="fill"/>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" data-testid="hero-register" className="btn-primary px-6 py-3.5 rounded-lg text-sm flex items-center gap-2">
                    Ücretsiz Hesap Aç <ArrowUpRight size={14} weight="bold"/>
                  </Link>
                  <Link to="/login" data-testid="hero-trade" className="px-6 py-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm flex items-center gap-2">
                    Hemen Al-Sat <ChartLineUp size={14} weight="fill"/>
                  </Link>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-6 mt-10 text-sm text-[#64748B]">
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#16A34A]"/>%0,1 komisyon</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#16A34A]"/>7/24 Türkçe destek</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#16A34A]"/>KYC/AML uyumlu</div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <HeroPriceCard coin={btc} spark={sparks["BTC"]} />
          </div>
        </div>
      </section>

      {/* Live Ticker */}
      <TickerBar coins={coins.slice(0, 20)} />

      {/* Market highlights */}
      <section id="markets" className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="chip mb-3"><Flame size={12} weight="fill" className="text-[#16A34A]"/>Canlı Piyasa</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Bugün öne çıkan coinler</h2>
          </div>
          <Link to="/markets" className="hidden sm:inline-flex chip hover:text-[#0F172A]" data-testid="see-all-markets">Tüm piyasalar <CaretRight size={10} weight="bold"/></Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HighlightCard title="Top Gainer" icon={TrendUp} tint="bg-[#16A34A]" coin={topGainer} spark={sparks[topGainer?.symbol]} />
          <HighlightCard title="Top Loser" icon={TrendDown} tint="bg-[#DC2626]" coin={topLoser} spark={sparks[topLoser?.symbol]} />
          <HighlightCard title="En Çok Hacim" icon={Flame} tint="bg-[#16A34A]" coin={topVolume} spark={sparks[topVolume?.symbol]} />
          <HighlightCard title="Trend Coin" icon={Sparkle} tint="bg-[#3B82F6]" coin={trending} spark={sparks[trending?.symbol]} />
        </div>

        {/* Horizontal coin rails */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-2xl">Gruplar halinde piyasa</h3>
            <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-3">
              <MagnifyingGlass size={14} className="text-[#64748B]"/>
              <input
                value={query}
                onChange={(e)=>setQuery(e.target.value)}
                placeholder="Coin ara..."
                className="bg-transparent outline-none py-2 text-sm w-40 sm:w-60"
                data-testid="landing-search"
              />
            </div>
          </div>

          {query ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredTable.slice(0, 20).map((c) => <RailCard key={c.symbol} coin={c} spark={sparks[c.symbol]}/>)}
              {filteredTable.length === 0 && <div className="col-span-full text-sm text-[#64748B] py-6 text-center">Sonuç yok</div>}
            </div>
          ) : (
            <>
              <CoinRail
                title="Yükselenler"
                icon={TrendUp}
                tint="text-[#16A34A]"
                coins={gainersList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
              <CoinRail
                title="Düşenler"
                icon={TrendDown}
                tint="text-[#DC2626]"
                coins={losersList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
              <CoinRail
                title="Trend Coinler"
                icon={Flame}
                tint="text-[#16A34A]"
                coins={trendingList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
            </>
          )}
        </div>

        {/* BERX Spotlight + VIP tiers - replaces heatmap to keep landing clean */}
      </section>

      {/* BERX Spotlight */}
      <section className="relative overflow-hidden border-y border-[#E2E8F0] bg-gradient-to-br from-[#FFFFFF] via-[#F7F9FC] to-[#FFFFFF]">
        <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-[#16A34A]/15 blur-3xl"/>
        <div className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-[#16A34A]/10 blur-3xl"/>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="chip mb-3"><Sparkle size={12} weight="fill" className="text-[#16A34A]"/>Coinberx Yerel Coini</div>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">
              <span className="text-[#D4A017]">BERX</span> ile Coinberx ekosisteminin parçası ol
            </h2>
            <p className="text-[#64748B] mt-5 text-base sm:text-lg">
              BERX, Coinberx'in yerel coinidir. Platform içi transferlerde, kampanyalarda ve gelecekteki ödüllerde kullanılır. Şeffaf fiyat takibi ve canlı mum grafik ile her an erişilebilir.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-7">
              {[
                ["%0,1","Düşük Komisyon","Tüm spot işlemler"],
                ["TR","Yerel Coin","Türk altyapısı"],
                ["7/24","Likidite","Anında alım-satım"],
              ].map(([d, lvl, req]) => (
                <div key={lvl} className="card-surface p-4 text-center hover:border-[#D4A017]/60 transition">
                  <div className="font-display text-2xl text-[#D4A017]">{d}</div>
                  <div className="text-xs text-[#0F172A] mt-1">{lvl}</div>
                  <div className="text-[10px] text-[#64748B] tabular mt-1">{req}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-7">
              <Link to="/trade/BERX" className="btn-primary px-5 py-3 rounded-lg text-sm flex items-center gap-2" data-testid="berx-trade-cta">BERX Al-Sat <ArrowUpRight size={14} weight="bold"/></Link>
              <Link to="/faq" className="px-5 py-3 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm">Nasıl çalışır?</Link>
            </div>
          </div>
          <div className="relative">
            <BerxSpotlightCard sparks={sparks}/>
          </div>
        </div>
      </section>

      {/* Why Coinberx */}
      <section id="why" className="bg-[#FFFFFF] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="chip mb-3"><Sparkle size={12} weight="fill" className="text-[#16A34A]"/>Neden Coinberx</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Türkiye için tasarlanmış premium kripto borsası</h2>
            <p className="text-[#64748B] mt-4">IBAN'dan spot alım-satıma kadar tüm deneyim Türkçe, hızlı ve güvenli.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {[
              {icon: ShieldCheck, title: "Güvenli Altyapı", desc: "JWT kimlik doğrulama, bcrypt şifreleme, locked balance yönetimi. KYC/AML uyumlu admin onayı."},
              {icon: Headset, title: "7/24 Türkçe Destek", desc: "Saniyeler içinde dönüş alın. Her işlem adımı anadilinizde."},
              {icon: CreditCard, title: "Hızlı IBAN Yatır/Çek", desc: "Kişisel referans kodu + dekont ile Havale/EFT. Admin onaylı çekme."},
              {icon: Lightning, title: "Gerçek Zamanlı Veri", desc: "Binance seviyesinde likidite, canlı candlestick + emir defteri."},
              {icon: ChartLineUp, title: "Kolay Al-Sat", desc: "Market ve Limit emirleri, açık emir yönetimi, portföy P/L takibi."},
              {icon: Globe, title: "Geniş Coin Seçenekleri", desc: "BTC, ETH, USDT, SOL, BNB, XRP ve popüler altcoinler. TRY ve USDT çiftleriyle."},
            ].map(({icon: Icon, title, desc}) => (
              <div key={title} className="card-surface p-6 hover:border-[#16A34A]/50 transition">
                <div className="w-11 h-11 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
                  <Icon size={22} weight="fill"/>
                </div>
                <div className="font-display font-semibold mt-4 text-lg">{title}</div>
                <div className="text-sm text-[#64748B] mt-1.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="chip mb-3 mx-auto"><Sparkle size={12} weight="fill" className="text-[#16A34A]"/>Nasıl Çalışır</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">3 basit adımda başlayın</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-12 relative">
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-[#16A34A]/40 to-transparent" />
          {[
            {n: "01", title: "Ücretsiz Hesap Aç", desc: "E-posta veya Google ile saniyeler içinde kaydolun."},
            {n: "02", title: "TL Yatır (IBAN)", desc: "Banka hesabınızdan referans kodu ile havale yapın."},
            {n: "03", title: "Kripto Al-Sat", desc: "Geniş coin seçenekleriyle anlık alım-satım, limit emirler."},
          ].map((s) => (
            <div key={s.n} className="card-surface p-8 text-center relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#16A34A] text-black font-display font-bold text-lg relative">
                {s.n}
                <span className="absolute inset-0 rounded-full animate-pulse-gold"/>
              </div>
              <div className="font-display text-xl mt-5">{s.title}</div>
              <div className="text-sm text-[#64748B] mt-2">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="bg-[#FFFFFF] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="chip mb-3"><Lock size={12} weight="fill" className="text-[#16A34A]"/>Güvenlik & Uyum</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Varlıklarınız üst düzey güvence altında</h2>
            <p className="text-[#64748B] mt-4">JWT kimlik doğrulama, bcrypt şifre özetleme, IP bazlı brute-force koruması ve admin onaylı para akışı ile işlemleriniz koruma altındadır.</p>
            <div className="space-y-3 mt-6">
              {[
                "Tüm trafik TLS 1.3 ile uçtan uca şifrelenir",
                "Para çekme işlemleri çift katmanlı admin onayı gerektirir",
                "KYC/AML prosedürleri yerel mevzuata uyumludur",
                "Locked balance mantığı ile anlık hesap tutarsızlığı engellenir",
                "Dahili fraud tespit sinyalleri ve giriş geçmişi kayıt altındadır",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle size={18} weight="fill" className="text-[#16A34A] mt-0.5 shrink-0"/>
                  <span className="text-[#0F172A]">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 bg-radial-gold opacity-60 blur-2xl"/>
            <div className="relative card-surface p-8">
              <div className="flex items-center gap-4 pb-4 border-b border-[#E2E8F0]">
                <div className="w-14 h-14 rounded-2xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center">
                  <ShieldCheck size={28} weight="fill"/>
                </div>
                <div>
                  <div className="font-display text-xl">SOC 2 benzeri altyapı</div>
                  <div className="text-xs text-[#64748B]">Bağımsız denetim hazır mimari</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {[
                  ["%99,9","Uptime hedefi"],
                  ["256-bit","AES şifreleme"],
                  ["24sa","Ortalama KYC süresi"],
                  ["%0","Kullanıcı fon kaybı"],
                ].map(([v,l]) => (
                  <div key={l} className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-4">
                    <div className="font-display text-2xl text-[#16A34A]">{v}</div>
                    <div className="text-xs text-[#64748B] mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog / Eğitim */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="chip mb-3"><Sparkle size={12} weight="fill" className="text-[#16A34A]"/>Coinberx Akademi</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Kripto dünyasına başlamak için rehberler</h2>
            <p className="text-[#64748B] mt-3 max-w-2xl">Türkçe içeriklerle kripto temelleri, güvenli işlem yöntemleri ve platform kullanımı.</p>
          </div>
          <Link to="/blog" className="chip hover:text-[#0F172A]">Tüm yazılar <CaretRight size={10} weight="bold"/></Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {tag:"Başlangıç", t:"Kripto Para Nedir, Nasıl Çalışır?", d:"Blockchain teknolojisinin temelleri ve kriptoyla ilk tanışma rehberi.", c:"#16A34A"},
            {tag:"Güvenlik", t:"Hesabınızı Güvenli Tutmanın 7 Yolu", d:"2FA, güçlü parola, oturum yönetimi ve oltalama saldırılarına karşı önlemler.", c:"#D4A017"},
            {tag:"İşlem", t:"Spot Al-Sat & Limit Emir Kullanımı", d:"Market ve limit emirler arasındaki farklar, emir defteri okuma teknikleri.", c:"#2563EB"},
          ].map((p) => (
            <Link key={p.t} to="/blog" className="card-surface p-6 hover:border-[#16A34A]/60 transition group block">
              <div className="h-32 rounded-lg flex items-center justify-center mb-4" style={{background: `linear-gradient(135deg, ${p.c}15, ${p.c}05)`}}>
                <ChartLineUp size={42} weight="fill" style={{color: p.c}}/>
              </div>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full" style={{background: `${p.c}15`, color: p.c}}>{p.tag}</span>
              <div className="font-display text-lg mt-3 text-[#0F172A] group-hover:text-[#16A34A] transition">{p.t}</div>
              <div className="text-sm text-[#64748B] mt-2 line-clamp-2">{p.d}</div>
              <div className="text-xs text-[#16A34A] mt-3 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">Devamını oku <CaretRight size={10} weight="bold"/></div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl border border-[#E2E8F0] bg-gradient-to-br from-[#FFFFFF] via-[#FFFFFF] to-[#F7F9FC] p-10 lg:p-16 text-center">
          <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-[#16A34A]/20 blur-3xl animate-blob"/>
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-[#16A34A]/15 blur-3xl animate-blob" style={{animationDelay:"2s"}}/>
          <div className="relative">
            <div className="chip mx-auto mb-4"><Lightning size={12} weight="fill" className="text-[#16A34A]"/>Hemen katıl</div>
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight max-w-3xl mx-auto">
              Hemen <span className="text-[#16A34A]">Coinberx</span>'e katılın, kripto yolculuğunuza başlayın.
            </h2>
            <p className="text-[#64748B] mt-5 max-w-xl mx-auto">30 saniyede hesap oluşturun. İlk ay IBAN yatırma ücretsiz.</p>
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
              {user ? (
                <>
                  <Link to="/trade/BTC" data-testid="cta-trade" className="btn-primary px-7 py-3.5 rounded-lg text-sm flex items-center gap-2">Hemen İşlem Yap <ArrowUpRight size={14} weight="bold"/></Link>
                  <Link to="/markets" data-testid="cta-markets" className="px-7 py-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm">Piyasaları Keşfet</Link>
                </>
              ) : (
                <>
                  <Link to="/register" data-testid="cta-register" className="btn-primary px-7 py-3.5 rounded-lg text-sm flex items-center gap-2">Ücretsiz Hesap Aç <ArrowUpRight size={14} weight="bold"/></Link>
                  <Link to="/markets" data-testid="cta-markets" className="px-7 py-3.5 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm">Piyasaları Keşfet</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt={settings.site_name || "Coinberx"} className="h-9 max-w-[170px] object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center text-black font-bold text-xl">C</div>
                  <span className="font-display text-xl tracking-tight">Coinberx</span>
                </>
              )}
            </div>
            <p className="text-sm text-[#64748B] mt-4 max-w-sm">Türkiye'nin premium kripto borsası. Hızlı, güvenli, tamamen Türkçe. IBAN ile TL yatırın, geniş coin seçenekleriyle işlem yapın.</p>
            <div className="flex gap-3 mt-5">
              {[TwitterLogo, TelegramLogo, InstagramLogo, YoutubeLogo].map((I, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg border border-[#E2E8F0] hover:border-[#16A34A] hover:text-[#16A34A] flex items-center justify-center text-[#64748B] transition"><I size={16} weight="fill"/></a>
              ))}
            </div>
          </div>
          {[
            {h:"Ürün", links:[["Piyasalar","/markets"],["Al-Sat","/trade/BTC"],["TL Yatır","/deposit"],["Cüzdan","/wallet"]]},
            {h:"Şirket", links:[["Hakkımızda","/about"],["Blog","/blog"],["Kariyer","/career"],["Basın","/press"]]},
            {h:"Destek", links:[["Yardım Merkezi","/help"],["SSS","/faq"],["İletişim","/contact"]]},
          ].map((col) => (
            <div key={col.h}>
              <div className="font-display text-sm text-[#0F172A] mb-4">{col.h}</div>
              <ul className="space-y-2 text-sm text-[#64748B]">
                {col.links.map(([t,h]) => (
                  <li key={t}><Link to={h} className="hover:text-[#0F172A]">{t}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#E2E8F0]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-wrap gap-4 items-center justify-between text-xs text-[#64748B]">
            <div>© {new Date().getFullYear()} Coinberx. Tüm hakları saklıdır.</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-[#0F172A]">Kullanım Koşulları</a>
              <a href="#" className="hover:text-[#0F172A]">Gizlilik Politikası</a>
              <a href="#" className="hover:text-[#0F172A]">Risk Bildirimi</a>
              <a href="#" className="hover:text-[#0F172A]">KVKK</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
