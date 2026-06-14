// Coinberx — Markets (Piyasa Verileri)
// CoinTR ilhamlı açık tema; favoriler/spot tabları, TRY/USDT filtreleri,
// resmi coin ikonları, sparkline mini grafik, satır sonunda İşlem butonu.
import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatPct } from "../lib/api";
import { MagnifyingGlass, Star, CaretUp, CaretDown, ArrowRight } from "@phosphor-icons/react";
import { toast } from "sonner";
import { CoinIcon } from "../lib/coinIcons.jsx";
import { usePageSeo } from "../contexts/SettingsContext";

function Sparkline({ data, up }) {
  if (!data || data.length < 2) return <div className="h-7 w-20"/>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 80, h = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / Math.max(max - min, 1e-9)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const color = up ? "#16A34A" : "#DC2626";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export default function Markets() {
  usePageSeo("markets");
  const [all, setAll] = useState([]);
  const [sparks, setSparks] = useState({});
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("spot"); // favorites | spot
  const [quote, setQuote] = useState("TRY"); // TRY | USDT | BERX
  const [sort, setSort] = useState({ key: "volume", dir: "desc" });
  const [watch, setWatch] = useState([]);

  const load = () => {
    api.get("/markets").then((r) => setAll(r.data || [])).catch(() => {});
    api.get("/watchlist").then((r) => setWatch(r.data || [])).catch(() => {});
    api.get("/markets-sparklines?limit=24").then((r) => setSparks(r.data || {})).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const toggle = async (sym) => {
    if (watch.includes(sym)) {
      await api.delete(`/watchlist/${sym}`);
      toast.success(sym + " favorilerden çıkarıldı");
    } else {
      await api.post("/watchlist", { symbol: sym });
      toast.success(sym + " favorilere eklendi");
    }
    load();
  };

  // USD ≈ from BTC/TRY for approximate USDT pair display
  const usdtRate = all.find((m) => m.symbol === "USDT")?.price_try || 0;

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === "favorites") list = list.filter((m) => watch.includes(m.symbol));
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.symbol.toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q));
    }
    const k = sort.key, dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const va = k === "name" ? a.symbol : k === "price" ? a.price_try : k === "change" ? a.change_24h : a.volume_24h_try;
      const vb = k === "name" ? b.symbol : k === "price" ? b.price_try : k === "change" ? b.change_24h : b.volume_24h_try;
      if (k === "name") return va.localeCompare(vb) * dir;
      return (va - vb) * dir;
    });
    return list;
  }, [all, tab, query, watch, sort]);

  const setSortKey = (k) => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }));
  const SortArrow = ({ k }) => sort.key === k ? (sort.dir === "desc" ? <CaretDown size={10} weight="bold"/> : <CaretUp size={10} weight="bold"/>) : null;

  return (
    <div className="p-4 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <div className="text-xs text-[#64748B] mb-2">Coinberx / Piyasalar / Piyasa Verileri</div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl text-[#0F172A]">Piyasa Verileri</h1>
          <p className="text-[#64748B] text-xs mt-1">Gerçek zamanlı kripto piyasası · Geniş coin seçenekleri</p>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-md min-w-[200px] bg-white border border-[#E2E8F0] rounded-lg px-3 hover:border-[#16A34A] transition">
          <MagnifyingGlass size={16} className="text-[#64748B]"/>
          <input
            data-testid="market-search"
            className="bg-transparent outline-none py-2 text-sm flex-1"
            placeholder="Coin ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-surface p-3 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex">
          {[["favorites","Favoriler"],["spot","Spot"]].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab===v?"active":""}`} data-testid={`market-tab-${v}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {["TRY","USDT","BERX"].map((q) => (
            <button
              key={q}
              onClick={() => setQuote(q)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${quote===q?"bg-[#16A34A] text-white":"text-[#475569] hover:bg-[#F1F5F9]"}`}
              data-testid={`market-quote-${q}`}
            >{q}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr className="text-xs text-[#64748B] text-left">
                <th className="py-3 px-2 w-8"></th>
                <th className="py-3 px-3 cursor-pointer hover:text-[#0F172A]" onClick={() => setSortKey("name")}><span className="inline-flex items-center gap-1">İşlem Çifti <SortArrow k="name"/></span></th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-[#0F172A]" onClick={() => setSortKey("price")}><span className="inline-flex items-center gap-1">Son Fiyat <SortArrow k="price"/></span></th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-[#0F172A]" onClick={() => setSortKey("change")}><span className="inline-flex items-center gap-1">24s Değişim <SortArrow k="change"/></span></th>
                <th className="py-3 px-3 text-right hidden lg:table-cell cursor-pointer hover:text-[#0F172A]" onClick={() => setSortKey("volume")}><span className="inline-flex items-center gap-1">24s Hacim <SortArrow k="volume"/></span></th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Son 24s</th>
                <th className="py-3 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((m) => {
                const fav = watch.includes(m.symbol);
                const up = m.change_24h >= 0;
                const usdt = usdtRate ? m.price_try / usdtRate : 0;
                const showPrice = quote === "TRY" ? formatTRY(m.price_try) : quote === "USDT" ? `${usdt.toLocaleString("tr-TR",{maximumFractionDigits: usdt<1 ? 6 : 2})} USDT` : `${(m.price_try / (all.find(x=>x.symbol==="BERX")?.price_try || 1)).toFixed(4)} BERX`;
                const spark = sparks[m.symbol] || [];
                return (
                  <tr key={m.symbol} className="hover:bg-[#F8FAFC] transition-colors" data-testid={`market-row-${m.symbol}`}>
                    <td className="px-2">
                      <button onClick={() => toggle(m.symbol)} data-testid={`market-fav-${m.symbol}`} className="p-1.5 rounded hover:bg-[#F1F5F9]" aria-label={fav?"Favoriden çıkar":"Favoriye ekle"}>
                        <Star size={14} weight={fav ? "fill" : "regular"} className={fav ? "text-[#D4A017]" : "text-[#94A3B8]"}/>
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <CoinIcon symbol={m.symbol} size={28}/>
                        <div>
                          <div className="font-medium text-[#0F172A] text-sm">{m.symbol}<span className="text-[#94A3B8]">/{quote}</span></div>
                          <div className="text-[10px] text-[#64748B]">{m.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right tabular text-sm">{showPrice}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium tabular ${up?"bg-green-50 text-[#16A34A]":"bg-red-50 text-[#DC2626]"}`}>{formatPct(m.change_24h)}</span>
                    </td>
                    <td className="py-3 px-3 text-right tabular text-xs hidden lg:table-cell text-[#64748B]">{formatTRY(m.volume_24h_try, 0)}</td>
                    <td className="py-3 px-3 text-right hidden md:table-cell">
                      <Sparkline data={spark} up={up}/>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link to={`/trade/${m.symbol}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#16A34A] text-white text-xs font-medium hover:bg-[#15803D] transition" data-testid={`market-trade-${m.symbol}`}>
                        İşlem Yap <ArrowRight size={10} weight="bold"/>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-sm text-[#64748B]">{tab==="favorites"?"Favori coin yok. Listeden ⭐ ekleyebilirsiniz.":"Sonuç bulunamadı"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
