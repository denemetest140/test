import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatPct } from "../lib/api";
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
      <div className="absolute -inset-6 bg-radial-gold blur-2xl opacity-70 pointer-events-none" />
      <div className="card-surface relative p-6 w-full max-w-md backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DCA335]/15 text-[#DCA335] text-sm flex items-center justify-center font-bold">{coin.symbol.slice(0,2)}</div>
            <div>
              <div className="font-display text-lg">{coin.symbol}/TRY</div>
              <div className="text-xs text-[#94A3B8]">{coin.name}</div>
            </div>
          </div>
          <div className={`chip ${up ? "text-[#10B981]" : "text-[#EF4444]"}`}>
            {up ? <TrendUp size={12} weight="fill"/> : <TrendDown size={12} weight="fill"/>}
            {formatPct(coin.change_24h)}
          </div>
        </div>
        <div className="font-display text-4xl tabular mt-4" data-testid="hero-btc-price">{formatTRY(coin.price_try)}</div>
        <div className="text-xs text-[#94A3B8] mt-1 tabular">24s hacim {formatTRY(coin.volume_24h_try, 0)}</div>

        <div className="h-20 mt-5 -mx-2">
          <ResponsiveContainer>
            <AreaChart data={(spark||[]).map((c,i) => ({i, c}))}>
              <defs>
                <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up?"#10B981":"#EF4444"} stopOpacity={0.5}/>
                  <stop offset="100%" stopColor={up?"#10B981":"#EF4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area dataKey="c" stroke={up?"#10B981":"#EF4444"} strokeWidth={2} fill="url(#heroSpark)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link to="/register" className="py-2.5 rounded-lg bg-[#10B981] hover:bg-[#0EA272] text-white text-sm font-semibold text-center" data-testid="hero-card-buy">Al</Link>
          <Link to="/register" className="py-2.5 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white text-sm font-semibold text-center" data-testid="hero-card-sell">Sat</Link>
        </div>
      </div>

      {/* Small floating satellites */}
      <div className="hidden xl:block absolute -top-6 -left-20 card-surface px-3 py-2 backdrop-blur-xl animate-float" style={{ animationDelay: "0.5s" }}>
        <div className="text-[10px] text-[#94A3B8]">ETH</div>
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
    <div className="relative overflow-hidden border-y border-[#1F2633] bg-[#0B0E14]">
      <div className="animate-ticker flex whitespace-nowrap py-3">
        {rail.map((c, i) => {
          const up = c.change_24h >= 0;
          return (
            <Link to={`/trade/${c.symbol}`} key={i} className="flex items-center gap-2 px-6 text-sm">
              <span className="w-6 h-6 rounded-full bg-[#1F2633] text-[10px] flex items-center justify-center font-semibold">{c.symbol.slice(0,2)}</span>
              <span className="font-medium">{c.symbol}</span>
              <span className="tabular text-[#94A3B8]">{formatTRY(c.price_try)}</span>
              <span className={`tabular text-xs ${up?"text-[#10B981]":"text-[#EF4444]"}`}>{formatPct(c.change_24h)}</span>
              <span className="w-px h-4 bg-[#1F2633] ml-3"/>
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
    <Link to={`/trade/${coin.symbol}`} className="card-surface p-5 block hover:border-[#DCA335]/60 transition-all group relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full ${tint} opacity-20 blur-2xl`} />
      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
        <Icon size={14} weight="fill" className={tint.replace("bg-","text-")} />
        {title}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#1F2633] text-xs flex items-center justify-center font-semibold">{coin.symbol.slice(0,2)}</div>
        <div>
          <div className="font-display text-base">{coin.symbol}</div>
          <div className="text-[11px] text-[#94A3B8]">{coin.name}</div>
        </div>
      </div>
      <div className="flex items-end justify-between mt-3">
        <div>
          <div className="tabular text-sm">{formatTRY(coin.price_try)}</div>
          <div className={`tabular text-xs ${up?"text-[#10B981]":"text-[#EF4444]"} flex items-center gap-0.5`}>
            {up?<ArrowUpRight size={10} weight="bold"/>:<ArrowDownRight size={10} weight="bold"/>}
            {formatPct(coin.change_24h)}
          </div>
        </div>
        <div className="w-24 h-10">
          <ResponsiveContainer>
            <LineChart data={data}>
              <Line dataKey="c" stroke={up?"#10B981":"#EF4444"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1 text-xs text-[#DCA335] opacity-0 group-hover:opacity-100 transition">
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
      style={{ background: bg, border: "1px solid #1F2633" }}
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
      className="shrink-0 w-[240px] card-surface p-4 hover:border-[#DCA335]/60 transition-all group relative overflow-hidden"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${coin.symbol==="BERX"?"bg-[#DCA335]/20 text-[#DCA335]":"bg-[#1F2633]"}`}>{coin.symbol.slice(0,2)}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base truncate">{coin.symbol}</div>
          <div className="text-[11px] text-[#94A3B8] truncate">{coin.name}</div>
        </div>
        <Star size={14} className="text-[#2A3344] group-hover:text-[#DCA335]"/>
      </div>
      <div className="mt-3">
        <div className="tabular text-lg">{formatTRY(coin.price_try, coin.price_try < 1 ? 6 : 2)}</div>
        <div className={`tabular text-xs flex items-center gap-0.5 mt-0.5 ${up?"text-[#10B981]":"text-[#EF4444]"}`}>
          {up?<ArrowUpRight size={10} weight="bold"/>:<ArrowDownRight size={10} weight="bold"/>}
          {formatPct(coin.change_24h)}
        </div>
      </div>
      <div className="h-12 mt-3 -mx-2">
        <ResponsiveContainer>
          <LineChart data={data}>
            <Line dataKey="c" stroke={up?"#10B981":"#EF4444"} strokeWidth={1.8} dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 py-1.5 rounded-md bg-[#DCA335] text-black text-xs font-semibold text-center opacity-0 group-hover:opacity-100 transition">
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
          <span className="chip text-[11px]">{coins.length}</span>
        </div>
        <div className="hidden sm:flex gap-1">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded border border-[#1F2633] flex items-center justify-center hover:bg-[#11151E]"><CaretRight size={12} weight="bold" className="rotate-180"/></button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded border border-[#1F2633] flex items-center justify-center hover:bg-[#11151E]"><CaretRight size={12} weight="bold"/></button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-thin pb-2 snap-x">
        {coins.slice(0, 15).map((c) => <div key={c.symbol} className="snap-start"><RailCard coin={c} spark={sparks[c.symbol]}/></div>)}
      </div>
    </div>
  );
}

// --- Main Landing -----------------------------------------------------------
export default function Landing() {
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

  // Fetch sparklines for a curated set (top 8 by volume)
  useEffect(() => {
    if (coins.length === 0) return;
    const top = [...coins].sort((a,b)=>b.volume_24h_try-a.volume_24h_try).slice(0,8).map(c=>c.symbol);
    top.forEach(async (sym) => {
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
    <div className="min-h-screen bg-[#070A0F] text-[#F8FAFC]">
      {/* Nav */}
      <header className="sticky top-0 z-40 glass border-b border-[#1F2633]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#DCA335] flex items-center justify-center text-black font-bold text-xl">C</div>
            <span className="font-display text-xl tracking-tight">Coinberx</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
            <a href="#markets" className="hover:text-white">Piyasalar</a>
            <a href="#why" className="hover:text-white">Neden Coinberx</a>
            <a href="#how" className="hover:text-white">Nasıl Çalışır</a>
            <a href="#security" className="hover:text-white">Güvenlik</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" data-testid="landing-login" className="px-4 py-2 text-sm rounded-lg hover:bg-[#11151E]">Giriş Yap</Link>
            <Link to="/register" data-testid="landing-register" className="btn-primary px-4 py-2 text-sm rounded-lg">Hesap Aç</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative hero-glow overflow-hidden">
        <div className="absolute inset-0 dotted opacity-40 pointer-events-none" />
        <div className="absolute top-40 -left-32 w-[500px] h-[500px] rounded-full bg-[#DCA335]/15 blur-3xl animate-blob pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-[420px] h-[420px] rounded-full bg-[#10B981]/10 blur-3xl animate-blob pointer-events-none" style={{animationDelay:"3s"}} />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-16 lg:pt-24 pb-12 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 anim-fade-up">
            <div className="chip">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-gold"/>
              TR lira ile kriptoya 60 saniyede başla
            </div>
            <h1 className="font-display font-bold tracking-tight text-5xl sm:text-6xl lg:text-7xl mt-6 leading-[1.05]">
              Coinberx ile kriptoya
              <br/>
              <span className="bg-gradient-to-r from-[#DCA335] via-[#F5B841] to-[#DCA335] bg-clip-text text-transparent">anında başla.</span>
            </h1>
            <p className="text-[#94A3B8] text-base sm:text-lg mt-6 max-w-2xl">
              Hızlı, güvenli ve tamamen Türkçe kripto al-sat platformu. IBAN ile dakikalar içinde TL yatırın, 35+ coin ile düşük komisyonla işlem yapın.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/register" data-testid="hero-register" className="btn-primary px-6 py-3.5 rounded-lg text-sm flex items-center gap-2">
                Ücretsiz Hesap Aç <ArrowUpRight size={14} weight="bold"/>
              </Link>
              <Link to="/login" data-testid="hero-trade" className="px-6 py-3.5 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm flex items-center gap-2">
                Hemen Al-Sat <ChartLineUp size={14} weight="fill"/>
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 mt-10 text-sm text-[#94A3B8]">
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#DCA335]"/>%0,1 komisyon</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#DCA335]"/>7/24 Türkçe destek</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[#DCA335]"/>KYC/AML uyumlu</div>
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
            <div className="chip mb-3"><Flame size={12} weight="fill" className="text-[#DCA335]"/>Canlı Piyasa</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Bugün öne çıkan coinler</h2>
          </div>
          <Link to="/markets" className="hidden sm:inline-flex chip hover:text-white" data-testid="see-all-markets">Tüm piyasalar <CaretRight size={10} weight="bold"/></Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <HighlightCard title="Top Gainer" icon={TrendUp} tint="bg-[#10B981]" coin={topGainer} spark={sparks[topGainer?.symbol]} />
          <HighlightCard title="Top Loser" icon={TrendDown} tint="bg-[#EF4444]" coin={topLoser} spark={sparks[topLoser?.symbol]} />
          <HighlightCard title="En Çok Hacim" icon={Flame} tint="bg-[#DCA335]" coin={topVolume} spark={sparks[topVolume?.symbol]} />
          <HighlightCard title="Trend Coin" icon={Sparkle} tint="bg-[#3B82F6]" coin={trending} spark={sparks[trending?.symbol]} />
        </div>

        {/* Horizontal coin rails */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-display text-2xl">Gruplar halinde piyasa</h3>
            <div className="flex items-center gap-2 bg-[#0B0E14] border border-[#1F2633] rounded-lg px-3">
              <MagnifyingGlass size={14} className="text-[#94A3B8]"/>
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
              {filteredTable.length === 0 && <div className="col-span-full text-sm text-[#94A3B8] py-6 text-center">Sonuç yok</div>}
            </div>
          ) : (
            <>
              <CoinRail
                title="Yükselenler"
                icon={TrendUp}
                tint="text-[#10B981]"
                coins={gainersList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
              <CoinRail
                title="Düşenler"
                icon={TrendDown}
                tint="text-[#EF4444]"
                coins={losersList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
              <CoinRail
                title="Trend Coinler"
                icon={Flame}
                tint="text-[#DCA335]"
                coins={trendingList}
                sparks={sparks}
                onMount={loadSparksFor}
              />
            </>
          )}
        </div>

        {/* Heatmap */}
        <div className="mt-12">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="chip mb-3"><Sparkle size={12} weight="fill" className="text-[#DCA335]"/>Piyasa Isı Haritası</div>
              <h3 className="font-display text-2xl">Piyasa genel durumu</h3>
            </div>
            <div className="text-xs text-[#94A3B8] hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{background:"rgba(16,185,129,0.55)"}}/>Yükseliş</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{background:"rgba(239,68,68,0.55)"}}/>Düşüş</span>
            </div>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 auto-rows-[72px] gap-2">
            {coins.slice(0, 24).map((c) => <HeatTile key={c.symbol} coin={c}/>)}
          </div>
        </div>
      </section>

      {/* Why Coinberx */}
      <section id="why" className="bg-[#0B0E14] border-y border-[#1F2633]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="max-w-2xl">
            <div className="chip mb-3"><Sparkle size={12} weight="fill" className="text-[#DCA335]"/>Neden Coinberx</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Türkiye için tasarlanmış premium kripto borsası</h2>
            <p className="text-[#94A3B8] mt-4">IBAN'dan spot alım-satıma kadar tüm deneyim Türkçe, hızlı ve güvenli.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {[
              {icon: ShieldCheck, title: "Güvenli Altyapı", desc: "JWT kimlik doğrulama, bcrypt şifreleme, locked balance yönetimi. KYC/AML uyumlu admin onayı."},
              {icon: Headset, title: "7/24 Türkçe Destek", desc: "Saniyeler içinde dönüş alın. Her işlem adımı anadilinizde."},
              {icon: CreditCard, title: "Hızlı IBAN Yatır/Çek", desc: "Kişisel referans kodu + dekont ile Havale/EFT. Admin onaylı çekme."},
              {icon: Lightning, title: "Gerçek Zamanlı Veri", desc: "Binance seviyesinde likidite, canlı candlestick + emir defteri."},
              {icon: ChartLineUp, title: "Kolay Al-Sat", desc: "Market ve Limit emirleri, açık emir yönetimi, portföy P/L takibi."},
              {icon: Globe, title: "35+ Coin Desteği", desc: "BTC, ETH, USDT, SOL, BNB, XRP ve daha fazlası. TRY çiftleriyle."},
            ].map(({icon: Icon, title, desc}) => (
              <div key={title} className="card-surface p-6 hover:border-[#DCA335]/50 transition">
                <div className="w-11 h-11 rounded-lg bg-[#DCA335]/10 text-[#DCA335] flex items-center justify-center">
                  <Icon size={22} weight="fill"/>
                </div>
                <div className="font-display font-semibold mt-4 text-lg">{title}</div>
                <div className="text-sm text-[#94A3B8] mt-1.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="chip mb-3 mx-auto"><Sparkle size={12} weight="fill" className="text-[#DCA335]"/>Nasıl Çalışır</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">3 basit adımda başlayın</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mt-12 relative">
          <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-[#DCA335]/40 to-transparent" />
          {[
            {n: "01", title: "Ücretsiz Hesap Aç", desc: "E-posta veya Google ile saniyeler içinde kaydolun."},
            {n: "02", title: "TL Yatır (IBAN)", desc: "Banka hesabınızdan referans kodu ile havale yapın."},
            {n: "03", title: "Kripto Al-Sat", desc: "35+ coin arasında anlık alım-satım, limit emirler."},
          ].map((s) => (
            <div key={s.n} className="card-surface p-8 text-center relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#DCA335] text-black font-display font-bold text-lg relative">
                {s.n}
                <span className="absolute inset-0 rounded-full animate-pulse-gold"/>
              </div>
              <div className="font-display text-xl mt-5">{s.title}</div>
              <div className="text-sm text-[#94A3B8] mt-2">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="bg-[#0B0E14] border-y border-[#1F2633]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="chip mb-3"><Lock size={12} weight="fill" className="text-[#DCA335]"/>Güvenlik & Uyum</div>
            <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Varlıklarınız üst düzey güvence altında</h2>
            <p className="text-[#94A3B8] mt-4">JWT kimlik doğrulama, bcrypt şifre özetleme, IP bazlı brute-force koruması ve admin onaylı para akışı ile işlemleriniz koruma altındadır.</p>
            <div className="space-y-3 mt-6">
              {[
                "Tüm trafik TLS 1.3 ile uçtan uca şifrelenir",
                "Para çekme işlemleri çift katmanlı admin onayı gerektirir",
                "KYC/AML prosedürleri yerel mevzuata uyumludur",
                "Locked balance mantığı ile anlık hesap tutarsızlığı engellenir",
                "Dahili fraud tespit sinyalleri ve giriş geçmişi kayıt altındadır",
              ].map((t) => (
                <div key={t} className="flex items-start gap-2 text-sm">
                  <CheckCircle size={18} weight="fill" className="text-[#10B981] mt-0.5 shrink-0"/>
                  <span className="text-[#F8FAFC]">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-10 bg-radial-gold opacity-60 blur-2xl"/>
            <div className="relative card-surface p-8">
              <div className="flex items-center gap-4 pb-4 border-b border-[#1F2633]">
                <div className="w-14 h-14 rounded-2xl bg-[#DCA335]/10 text-[#DCA335] flex items-center justify-center">
                  <ShieldCheck size={28} weight="fill"/>
                </div>
                <div>
                  <div className="font-display text-xl">SOC 2 benzeri altyapı</div>
                  <div className="text-xs text-[#94A3B8]">Bağımsız denetim hazır mimari</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {[
                  ["%99,9","Uptime hedefi"],
                  ["256-bit","AES şifreleme"],
                  ["24sa","Ortalama KYC süresi"],
                  ["%0","Kullanıcı fon kaybı"],
                ].map(([v,l]) => (
                  <div key={l} className="bg-[#070A0F] border border-[#1F2633] rounded-lg p-4">
                    <div className="font-display text-2xl text-[#DCA335]">{v}</div>
                    <div className="text-xs text-[#94A3B8] mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <div className="chip mb-3"><Users size={12} weight="fill" className="text-[#DCA335]"/>Topluluk</div>
          <h2 className="font-display text-3xl sm:text-4xl tracking-tight">Binlerce Türk yatırımcının tercihi</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-6 mb-10">
          {[
            ["10.000+", "Aktif Kullanıcı"],
            ["₺850M+", "24s İşlem Hacmi"],
            ["35+", "Desteklenen Coin"],
          ].map(([v, l]) => (
            <div key={l} className="card-surface p-6 text-center">
              <div className="font-display text-3xl text-[#DCA335]">{v}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{l}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {n:"Ayşe D.", t:"Freelance", q:"IBAN ile yatırma hiç bu kadar hızlı olmamıştı. 3 dakikada BTC aldım. Türkçe arayüz çok rahat."},
            {n:"Mert K.", t:"Mühendis", q:"Grafikler ve emir defteri gerçekten Binance seviyesinde. Düşük komisyon da ekstra bonus."},
            {n:"Selin A.", t:"Öğrenci", q:"KYC onayı 20 dakikada geldi. İlk kripto deneyimim için bundan iyisi olamazdı."},
            {n:"Burak T.", t:"Trader", q:"Limit emirleri çalışıyor, portföy P/L takibi temiz. Profesyonel hissettiriyor."},
            {n:"Hakan Y.", t:"Yatırımcı", q:"Destek ekibi 7/24 ulaşılabilir, çekim işlemleri aynı gün onaylandı."},
            {n:"Elif M.", t:"Girişimci", q:"Admin panelinin şeffaflığı ve locked balance mantığı gerçekten güven veriyor."},
          ].map((r, i) => (
            <div key={i} className="card-surface p-6">
              <div className="flex items-center gap-1 text-[#DCA335] mb-3">
                {[...Array(5)].map((_,k) => <Star key={k} size={14} weight="fill"/>)}
              </div>
              <p className="text-sm text-[#F8FAFC] leading-relaxed">"{r.q}"</p>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-[#1F2633]">
                <div className="w-9 h-9 rounded-full bg-[#DCA335]/15 text-[#DCA335] flex items-center justify-center text-sm font-semibold">{r.n[0]}</div>
                <div>
                  <div className="text-sm font-medium">{r.n}</div>
                  <div className="text-xs text-[#94A3B8]">{r.t}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-2xl border border-[#1F2633] bg-gradient-to-br from-[#11151E] via-[#0B0E14] to-[#070A0F] p-10 lg:p-16 text-center">
          <div className="absolute -top-20 left-1/4 w-80 h-80 rounded-full bg-[#DCA335]/20 blur-3xl animate-blob"/>
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full bg-[#10B981]/15 blur-3xl animate-blob" style={{animationDelay:"2s"}}/>
          <div className="relative">
            <div className="chip mx-auto mb-4"><Lightning size={12} weight="fill" className="text-[#DCA335]"/>Hemen katıl</div>
            <h2 className="font-display text-3xl sm:text-5xl tracking-tight max-w-3xl mx-auto">
              Hemen <span className="text-[#DCA335]">Coinberx</span>'e katılın, kripto yolculuğunuza başlayın.
            </h2>
            <p className="text-[#94A3B8] mt-5 max-w-xl mx-auto">30 saniyede hesap oluşturun. İlk ay IBAN yatırma ücretsiz.</p>
            <div className="flex flex-wrap gap-3 mt-8 justify-center">
              <Link to="/register" data-testid="cta-register" className="btn-primary px-7 py-3.5 rounded-lg text-sm flex items-center gap-2">Ücretsiz Hesap Aç <ArrowUpRight size={14} weight="bold"/></Link>
              <Link to="/markets" data-testid="cta-markets" className="px-7 py-3.5 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm">Piyasaları Keşfet</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F2633] bg-[#0B0E14]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-14 grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#DCA335] flex items-center justify-center text-black font-bold text-xl">C</div>
              <span className="font-display text-xl tracking-tight">Coinberx</span>
            </div>
            <p className="text-sm text-[#94A3B8] mt-4 max-w-sm">Türkiye'nin premium kripto borsası. Hızlı, güvenli, tamamen Türkçe. IBAN ile TL yatırın, 35+ coin ile işlem yapın.</p>
            <div className="flex gap-3 mt-5">
              {[TwitterLogo, TelegramLogo, InstagramLogo, YoutubeLogo].map((I, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg border border-[#1F2633] hover:border-[#DCA335] hover:text-[#DCA335] flex items-center justify-center text-[#94A3B8] transition"><I size={16} weight="fill"/></a>
              ))}
            </div>
          </div>
          {[
            {h:"Ürün", links:[["Piyasalar","/markets"],["Al-Sat","/trade/BTC"],["TL Yatır","/deposit"],["Cüzdan","/wallet"]]},
            {h:"Şirket", links:[["Hakkımızda","#"],["Blog","#"],["Kariyer","#"],["Basın","#"]]},
            {h:"Destek", links:[["Yardım Merkezi","#"],["SSS","#"],["İletişim","#"],["API Dokümanı","#"]]},
          ].map((col) => (
            <div key={col.h}>
              <div className="font-display text-sm text-[#F8FAFC] mb-4">{col.h}</div>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                {col.links.map(([t,h]) => (
                  <li key={t}><Link to={h} className="hover:text-white">{t}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[#1F2633]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex flex-wrap gap-4 items-center justify-between text-xs text-[#94A3B8]">
            <div>© {new Date().getFullYear()} Coinberx. Tüm hakları saklıdır.</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white">Kullanım Koşulları</a>
              <a href="#" className="hover:text-white">Gizlilik Politikası</a>
              <a href="#" className="hover:text-white">Risk Bildirimi</a>
              <a href="#" className="hover:text-white">KVKK</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
