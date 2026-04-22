import { useEffect, useState } from "react";
import { api, formatTRY, formatNumber, formatPct } from "../lib/api";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDown, ArrowUp, PaperPlaneTilt } from "@phosphor-icons/react";
import AssetDetailModal from "../components/AssetDetailModal";

const COLORS = ["#DCA335", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4", "#F97316"];

export default function Wallet() {
  const [w, setW] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [selected, setSelected] = useState(null);

  const reload = () => {
    api.get("/wallet").then((r) => setW(r.data)).catch(() => {});
    api.get("/markets").then((r) => setMarkets(r.data || [])).catch(() => {});
  };
  useEffect(() => {
    reload();
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, []);

  const change = (sym) => markets.find((m) => m.symbol === sym)?.change_24h ?? 0;
  const assets = (w?.assets || []).filter((a) => a.amount > 0.0000001 || a.symbol === "TRY");
  const pieData = assets.filter((a) => a.value_try > 1);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl">Cüzdan</h1>
          <p className="text-[#94A3B8] text-sm mt-1">Tüm varlıklarınız tek ekranda · TL ve 50+ kripto</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/deposit" className="btn-primary px-4 py-2 rounded-lg text-sm" data-testid="wallet-deposit">TL Yatır</Link>
          <Link to="/withdraw" className="px-4 py-2 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm" data-testid="wallet-withdraw">TL Çek</Link>
          <Link to="/transfer" className="px-4 py-2 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm flex items-center gap-1" data-testid="wallet-transfer"><PaperPlaneTilt size={14}/> Transfer</Link>
          <Link to="/trade/BTC" className="px-4 py-2 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm" data-testid="wallet-trade">Al-Sat</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Toplam Portföy</div>
          <div className="font-display text-3xl tabular mt-1" data-testid="wallet-total">{formatTRY(w?.total_try ?? 0)}</div>
          <div className="text-xs text-[#94A3B8] mt-2 tabular">{assets.length} varlık</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Toplam Yatırılan</div>
          <div className="font-display text-3xl tabular mt-1">{formatTRY(w?.invested_try ?? 0)}</div>
          <div className="text-xs text-[#94A3B8] mt-2">Kümülatif alış tutarı</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8]">Kâr / Zarar</div>
          <div className={`font-display text-3xl tabular mt-1 ${(w?.pnl_try??0)>=0?"text-[#10B981]":"text-[#EF4444]"}`} data-testid="wallet-pnl">
            {(w?.pnl_try??0)>=0?"+":""}{formatTRY(w?.pnl_try ?? 0)}
          </div>
          <div className="text-xs text-[#94A3B8] mt-2">Piyasa fiyatlarıyla</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card-surface p-5 lg:col-span-2">
          <div className="text-xs text-[#94A3B8] mb-3">Varlıklarım</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[#94A3B8] text-left border-b border-[#1F2633]">
                  <th className="pb-3">Varlık</th>
                  <th className="pb-3 text-right">Miktar</th>
                  <th className="pb-3 text-right hidden md:table-cell">Fiyat</th>
                  <th className="pb-3 text-right hidden md:table-cell">24s</th>
                  <th className="pb-3 text-right">TL Değeri</th>
                  <th className="pb-3 text-right">Hızlı İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2633]">
                {assets.map((a) => {
                  const ch = change(a.symbol);
                  const up = ch >= 0;
                  return (
                    <tr key={a.symbol} data-testid={`wallet-row-${a.symbol}`}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${a.symbol==="TRY"?"bg-[#DCA335] text-black":a.symbol==="BERX"?"bg-[#DCA335]/20 text-[#DCA335]":"bg-[#1F2633]"}`}>{a.symbol === "TRY" ? "₺" : a.symbol.slice(0,2)}</div>
                          <div>
                            <div className="font-medium">{a.symbol === "TRY" ? "Türk Lirası" : a.symbol}</div>
                            <div className="text-xs text-[#94A3B8]">{a.symbol === "TRY" ? "TL" : (a.symbol === "BERX" ? "Berx Token" : (markets.find(m=>m.symbol===a.symbol)?.name || ""))}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right tabular">{formatNumber(a.amount)}{a.locked>0 && <span className="text-[10px] text-[#F59E0B] ml-2">+{formatNumber(a.locked)} kilitli</span>}</td>
                      <td className="py-3 text-right tabular hidden md:table-cell">{a.symbol==="TRY"?"-":formatTRY(a.price_try, a.price_try < 1 ? 6 : 2)}</td>
                      <td className={`py-3 text-right tabular hidden md:table-cell ${up?"text-[#10B981]":"text-[#EF4444]"}`}>{a.symbol==="TRY"?"-":(
                        <span className="inline-flex items-center gap-1">{up?<ArrowUp size={10} weight="bold"/>:<ArrowDown size={10} weight="bold"/>}{formatPct(ch)}</span>
                      )}</td>
                      <td className="py-3 text-right tabular font-medium">{formatTRY(a.value_try)}</td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {a.symbol === "TRY" ? (
                            <>
                              <Link to="/deposit" className="px-2.5 py-1 rounded bg-[#10B981] text-white text-[11px] font-medium" data-testid={`wallet-try-deposit`}>Yatır</Link>
                              <Link to="/withdraw" className="px-2.5 py-1 rounded bg-[#EF4444] text-white text-[11px] font-medium" data-testid={`wallet-try-withdraw`}>Çek</Link>
                            </>
                          ) : (
                            <>
                              <Link to={`/trade/${a.symbol}`} className="px-2.5 py-1 rounded bg-[#10B981] text-white text-[11px] font-medium" data-testid={`wallet-buy-${a.symbol}`}>Al</Link>
                              <Link to={`/trade/${a.symbol}`} className="px-2.5 py-1 rounded bg-[#EF4444] text-white text-[11px] font-medium" data-testid={`wallet-sell-${a.symbol}`}>Sat</Link>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="text-xs text-[#94A3B8] mb-3">Varlık Dağılımı</div>
          {pieData.length === 0 ? (
            <div className="text-sm text-[#94A3B8] py-10 text-center">Henüz varlığınız yok</div>
          ) : (
            <>
              <div className="h-[220px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value_try" nameKey="symbol" innerRadius={55} outerRadius={90} stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatTRY(v)} contentStyle={{ background: "#11151E", border: "1px solid #1F2633" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {pieData.slice(0, 6).map((a, i) => {
                  const pct = (a.value_try / (w?.total_try || 1)) * 100;
                  return (
                    <div key={a.symbol} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{a.symbol}</span>
                      <span className="tabular text-[#94A3B8]">{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {selected && <AssetDetailModal asset={selected} onClose={() => setSelected(null)} onChanged={reload}/>}
    </div>
  );
}
