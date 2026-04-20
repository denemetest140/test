import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatTRY, formatPct } from "../lib/api";
import { Star } from "@phosphor-icons/react";

export default function Watchlist() {
  const [list, setList] = useState([]);
  const [markets, setMarkets] = useState([]);
  const load = () => {
    api.get("/watchlist").then((r) => setList(r.data || []));
    api.get("/markets").then((r) => setMarkets(r.data || []));
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const rows = markets.filter((m) => list.includes(m.symbol));
  const remove = async (s) => { await api.delete(`/watchlist/${s}`); load(); };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-6">İzleme Listem</h1>
      {rows.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <Star size={40} className="text-[#DCA335] mx-auto" />
          <div className="text-sm text-[#94A3B8] mt-3">İzleme listenizde coin yok. <Link to="/markets" className="text-[#DCA335]">Piyasalardan ekleyin</Link></div>
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="py-3 px-4">Coin</th><th className="text-right">Fiyat</th><th className="text-right">24s</th><th className="text-right">İşlem</th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {rows.map((m) => (
                <tr key={m.symbol}>
                  <td className="py-3 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1F2633] text-xs flex items-center justify-center font-semibold">{m.symbol.slice(0,2)}</div>
                    <div><div className="font-medium">{m.symbol}/TRY</div><div className="text-xs text-[#94A3B8]">{m.name}</div></div>
                  </td>
                  <td className="text-right tabular">{formatTRY(m.price_try)}</td>
                  <td className={`text-right tabular ${m.change_24h>=0?"text-[#10B981]":"text-[#EF4444]"}`}>{formatPct(m.change_24h)}</td>
                  <td className="text-right pr-4">
                    <Link to={`/trade/${m.symbol}`} className="text-[#DCA335] text-xs mr-3">Al-Sat</Link>
                    <button onClick={() => remove(m.symbol)} className="text-[#EF4444] text-xs">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
