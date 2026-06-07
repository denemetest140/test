import { useEffect, useState } from "react";
import { api, formatTRY, formatPct } from "../lib/api";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUp, ArrowDown } from "@phosphor-icons/react";

const COLORS = ["#16A34A", "#16A34A", "#3B82F6", "#8B5CF6", "#EC4899", "#D97706", "#06B6D4"];

export default function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [klines, setKlines] = useState([]);
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    api.get("/wallet").then((r) => setWallet(r.data)).catch(() => {});
    api.get("/markets").then((r) => setMarkets(r.data || [])).catch(() => {});
    api.get("/markets/BTC/klines?interval=1h&limit=72").then((r) => setKlines(r.data || [])).catch(() => {});
    api.get("/wallet/transactions?limit=8").then((r) => setTxs(r.data || [])).catch(() => {});
  }, []);

  const pnlColor = (wallet?.pnl_try ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]";
  const pieData = (wallet?.assets || []).filter((a) => a.value_try > 1).slice(0, 7);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-sm text-[#64748B]">Toplam Portföy Değeri</div>
          <div className="font-display text-4xl lg:text-5xl font-semibold tabular mt-1" data-testid="portfolio-total">
            {formatTRY(wallet?.total_try ?? 0)}
          </div>
          <div className={`text-sm tabular mt-2 ${pnlColor}`} data-testid="portfolio-pnl">
            {(wallet?.pnl_try ?? 0) >= 0 ? "+" : ""}{formatTRY(wallet?.pnl_try ?? 0)} toplam kâr/zarar
          </div>
        </div>
        <div className="flex gap-3">
          <Link to="/deposit" className="btn-primary px-5 py-2.5 rounded-lg text-sm" data-testid="cta-deposit">TL Yatır</Link>
          <Link to="/trade/BTC" className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] hover:bg-[#FFFFFF] text-sm" data-testid="cta-trade">Al-Sat</Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-[#64748B]">BTC/TRY</div>
              <div className="font-display text-xl tabular">{formatTRY(markets.find((m) => m.symbol === "BTC")?.price_try ?? 0)}</div>
            </div>
            <div className={`text-sm tabular ${markets.find((m) => m.symbol === "BTC")?.change_24h >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {formatPct(markets.find((m) => m.symbol === "BTC")?.change_24h ?? 0)}
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={klines}>
                <defs>
                  <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                <Tooltip
                  contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8 }}
                  labelFormatter={(t) => new Date(t * 1000).toLocaleString("tr-TR")}
                  formatter={(v) => formatTRY(v)}
                />
                <Area type="monotone" dataKey="close" stroke="#16A34A" fill="url(#goldFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] mb-3">Varlık Dağılımı</div>
          {pieData.length === 0 ? (
            <div className="text-sm text-[#64748B] py-10 text-center">Henüz varlığınız yok</div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value_try" nameKey="symbol" innerRadius={50} outerRadius={80} stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatTRY(v)} contentStyle={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1 mt-2">
            {pieData.map((a, i) => (
              <div key={a.symbol} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{a.symbol}</span>
                <span className="tabular text-[#64748B]">{formatTRY(a.value_try)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] mb-3">Piyasada Öne Çıkanlar</div>
          <div className="divide-y divide-[#E2E8F0]">
            {markets.slice(0, 6).map((m) => (
              <Link to={`/trade/${m.symbol}`} key={m.symbol} className="flex items-center justify-between py-3 hover:bg-[#F1F5F9] px-2 -mx-2 rounded" data-testid={`dash-market-${m.symbol}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-xs flex items-center justify-center font-semibold">{m.symbol.slice(0, 2)}</div>
                  <div>
                    <div className="text-sm font-medium">{m.symbol}/TRY</div>
                    <div className="text-xs text-[#64748B]">{m.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="tabular text-sm">{formatTRY(m.price_try)}</div>
                  <div className={`tabular text-xs flex items-center justify-end gap-1 ${m.change_24h >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {m.change_24h >= 0 ? <ArrowUp size={10} weight="bold" /> : <ArrowDown size={10} weight="bold" />}
                    {formatPct(m.change_24h)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-[#64748B]">Son İşlemler</div>
            <Link to="/history" className="text-xs text-[#16A34A]" data-testid="dash-history-link">Tümü</Link>
          </div>
          {txs.length === 0 ? (
            <div className="text-sm text-[#64748B] py-6 text-center">İşlem kaydı yok</div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {txs.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm capitalize">{t.type === "trade" ? (t.side === "buy" ? "Al" : "Sat") : t.type === "deposit" ? "Yatırma" : "Çekme"}</div>
                    <div className="text-xs text-[#64748B]">{new Date(t.created_at).toLocaleString("tr-TR")}</div>
                  </div>
                  <div className="tabular text-sm text-right">
                    {t.symbol ? `${t.symbol} ` : ""}{formatTRY(t.amount_try)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
