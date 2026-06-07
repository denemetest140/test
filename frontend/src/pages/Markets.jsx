import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatPct } from "../lib/api";
import { MagnifyingGlass, Star } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Markets() {
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [watch, setWatch] = useState([]);

  const load = () => {
    api.get("/markets").then((r) => setAll(r.data || [])).catch(() => {});
    api.get("/watchlist").then((r) => setWatch(r.data || [])).catch(() => {});
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const toggle = async (sym) => {
    if (watch.includes(sym)) {
      await api.delete(`/watchlist/${sym}`);
      toast.success(sym + " izleme listesinden çıkarıldı");
    } else {
      await api.post("/watchlist", { symbol: sym });
      toast.success(sym + " izleme listesine eklendi");
    }
    load();
  };

  const filtered = useMemo(() => {
    let list = [...all];
    if (tab === "gainers") list = list.filter((m) => m.change_24h > 0).sort((a, b) => b.change_24h - a.change_24h);
    else if (tab === "losers") list = list.filter((m) => m.change_24h < 0).sort((a, b) => a.change_24h - b.change_24h);
    else if (tab === "watch") list = list.filter((m) => watch.includes(m.symbol));
    if (query) list = list.filter((m) => m.symbol.includes(query.toUpperCase()) || m.name.toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [all, tab, query, watch]);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-1">Piyasalar</h1>
      <p className="text-[#64748B] text-sm mb-6">TRY çiftleriyle 15+ kripto. Gerçek zamanlı fiyat.</p>

      <div className="card-surface p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-3">
          <MagnifyingGlass size={16} className="text-[#64748B]" />
          <input
            data-testid="market-search"
            className="bg-transparent outline-none py-2 text-sm flex-1"
            placeholder="Coin ara (BTC, ETH, ...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center">
          {[["all","Tümü"],["gainers","Yükselenler"],["losers","Düşenler"],["watch","İzleme"]].map(([v,l]) => (
            <div key={v} onClick={() => setTab(v)} className={`tab-btn ${tab===v?"active":""}`} data-testid={`market-tab-${v}`}>{l}</div>
          ))}
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#64748B] text-left">
              <th className="py-3 px-4"></th>
              <th className="py-3 px-4">Coin</th>
              <th className="py-3 px-4 text-right">Fiyat</th>
              <th className="py-3 px-4 text-right">24s Değişim</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">24s Hacim</th>
              <th className="py-3 px-4 text-right hidden md:table-cell">24s Yüksek</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.map((m) => {
              const fav = watch.includes(m.symbol);
              const up = m.change_24h >= 0;
              return (
                <tr key={m.symbol} className="hover:bg-[#F1F5F9]" data-testid={`market-row-${m.symbol}`}>
                  <td className="px-4">
                    <button onClick={() => toggle(m.symbol)} data-testid={`market-fav-${m.symbol}`}>
                      <Star size={16} weight={fav ? "fill" : "regular"} className={fav ? "text-[#16A34A]" : "text-[#64748B]"} />
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-xs flex items-center justify-center font-semibold">{m.symbol.slice(0,2)}</div>
                      <div>
                        <div className="font-medium">{m.symbol}/TRY</div>
                        <div className="text-xs text-[#64748B]">{m.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular">{formatTRY(m.price_try)}</td>
                  <td className={`py-3 px-4 text-right tabular ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>{formatPct(m.change_24h)}</td>
                  <td className="py-3 px-4 text-right tabular hidden md:table-cell text-[#64748B]">{formatTRY(m.volume_24h_try, 0)}</td>
                  <td className="py-3 px-4 text-right tabular hidden md:table-cell text-[#64748B]">{formatTRY(m.high_24h_try)}</td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/trade/${m.symbol}`} className="px-3 py-1.5 rounded-md bg-[#16A34A] text-black text-xs font-medium hover:bg-[#22C55E]" data-testid={`market-trade-${m.symbol}`}>Al-Sat</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-[#64748B]">Sonuç bulunamadı</div>}
      </div>
    </div>
  );
}
