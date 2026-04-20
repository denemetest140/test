import { useEffect, useState } from "react";
import { api, formatTRY, formatNumber } from "../lib/api";
import { Link } from "react-router-dom";

export default function Wallet() {
  const [w, setW] = useState(null);
  useEffect(() => { api.get("/wallet").then((r) => setW(r.data)).catch(() => {}); }, []);
  const assets = w?.assets || [];
  const nonzero = assets.filter((a) => a.amount > 0.0000001 || a.symbol === "TRY");

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-6">Cüzdan</h1>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Toplam Bakiye</div>
          <div className="font-display text-3xl tabular mt-1" data-testid="wallet-total">{formatTRY(w?.total_try ?? 0)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Toplam Yatırılan</div>
          <div className="font-display text-3xl tabular mt-1">{formatTRY(w?.invested_try ?? 0)}</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Kâr / Zarar</div>
          <div className={`font-display text-3xl tabular mt-1 ${(w?.pnl_try??0)>=0?"text-[#10B981]":"text-[#EF4444]"}`} data-testid="wallet-pnl">{formatTRY(w?.pnl_try ?? 0)}</div>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <Link to="/deposit" className="btn-primary px-4 py-2 rounded-lg text-sm" data-testid="wallet-deposit">TL Yatır</Link>
        <Link to="/withdraw" className="px-4 py-2 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm" data-testid="wallet-withdraw">TL Çek</Link>
        <Link to="/trade/BTC" className="px-4 py-2 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm" data-testid="wallet-trade">Al-Sat</Link>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#94A3B8] text-left">
            <th className="py-3 px-4">Varlık</th>
            <th className="py-3 px-4 text-right">Toplam</th>
            <th className="py-3 px-4 text-right">Kilitli</th>
            <th className="py-3 px-4 text-right">Güncel Fiyat</th>
            <th className="py-3 px-4 text-right">TL Değeri</th>
            <th className="py-3 px-4 text-right">İşlem</th>
          </tr></thead>
          <tbody className="divide-y divide-[#1F2633]">
            {nonzero.map((a) => (
              <tr key={a.symbol} data-testid={`wallet-row-${a.symbol}`}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1F2633] text-xs flex items-center justify-center font-semibold">{a.symbol.slice(0,2)}</div>
                    <div className="font-medium">{a.symbol}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right tabular">{formatNumber(a.amount)}</td>
                <td className="py-3 px-4 text-right tabular text-[#94A3B8]">{formatNumber(a.locked || 0)}</td>
                <td className="py-3 px-4 text-right tabular">{a.symbol==="TRY"?"-":formatTRY(a.price_try)}</td>
                <td className="py-3 px-4 text-right tabular">{formatTRY(a.value_try)}</td>
                <td className="py-3 px-4 text-right">
                  {a.symbol !== "TRY" && <Link to={`/trade/${a.symbol}`} className="text-[#DCA335] hover:underline text-xs">Al-Sat</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
