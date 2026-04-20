import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, formatTRY, formatNumber, formatPct, errToStr } from "../lib/api";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { toast } from "sonner";

const INTERVALS = [["5m","5dk"],["15m","15dk"],["1h","1sa"],["4h","4sa"],["1d","1g"]];

export default function Trade() {
  const { symbol = "BTC" } = useParams();
  const sym = symbol.toUpperCase();
  const [interval, setInterval_] = useState("1h");
  const [ticker, setTicker] = useState(null);
  const [depth, setDepth] = useState({ bids: [], asks: [] });
  const [trades, setTrades] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [side, setSide] = useState("buy");
  const [orderType, setOrderType] = useState("market");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [openOrders, setOpenOrders] = useState([]);
  const chartContainer = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const loadAll = () => {
    api.get(`/markets/${sym}`).then((r) => setTicker(r.data)).catch(() => {});
    api.get(`/markets/${sym}/depth`).then((r) => setDepth(r.data)).catch(() => {});
    api.get(`/markets/${sym}/trades`).then((r) => setTrades(r.data || [])).catch(() => {});
    api.get("/wallet").then((r) => setWallet(r.data)).catch(() => {});
    api.get("/trade/orders?status=open").then((r) => setOpenOrders(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [sym]);

  useEffect(() => {
    if (!chartContainer.current) return;
    const chart = createChart(chartContainer.current, {
      layout: { background: { color: "#11151E" }, textColor: "#94A3B8" },
      localization: { locale: "tr-TR" },
      grid: { vertLines: { color: "#1F2633" }, horzLines: { color: "#1F2633" } },
      timeScale: { borderColor: "#1F2633", timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: "#1F2633" },
      crosshair: { mode: 1 },
      height: 460,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981", downColor: "#EF4444", borderVisible: false, wickUpColor: "#10B981", wickDownColor: "#EF4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const onResize = () => chart.applyOptions({ width: chartContainer.current.clientWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    api.get(`/markets/${sym}/klines?interval=${interval}&limit=300`).then((r) => {
      seriesRef.current.setData(r.data || []);
      chartRef.current?.timeScale()?.fitContent();
    });
  }, [sym, interval]);

  const balTRY = wallet?.assets.find((a) => a.symbol === "TRY")?.amount ?? 0;
  const balCoin = wallet?.assets.find((a) => a.symbol === sym)?.amount ?? 0;

  const estQty = useMemo(() => {
    if (orderType === "market" && side === "buy" && ticker && amount) return Number(amount) / ticker.price_try;
    return qty ? Number(qty) : 0;
  }, [orderType, side, amount, qty, ticker]);

  const submit = async () => {
    try {
      const body = { symbol: sym, side, order_type: orderType };
      if (orderType === "market") {
        if (side === "buy") body.amount_try = Number(amount);
        else body.quantity = Number(qty);
      } else {
        body.quantity = Number(qty);
        body.price = Number(price);
      }
      await api.post("/trade/order", body);
      toast.success("Emir iletildi");
      setAmount(""); setQty(""); setPrice("");
      loadAll();
    } catch (e) { toast.error(errToStr(e)); }
  };

  const cancel = async (id) => {
    try { await api.post(`/trade/orders/${id}/cancel`); loadAll(); toast.success("İptal edildi"); } catch (e) { toast.error(errToStr(e)); }
  };

  return (
    <div className="p-4 lg:p-6 anim-fade-up">
      <div className="card-surface p-4 mb-4 flex flex-wrap items-center gap-6">
        <Link to="/markets" className="text-xs text-[#94A3B8] hover:text-white" data-testid="trade-back">&larr; Piyasalar</Link>
        <div className="font-display text-xl">{sym}/TRY</div>
        <div className="tabular text-lg" data-testid="trade-price">{formatTRY(ticker?.price_try ?? 0)}</div>
        <div className={`tabular text-sm ${(ticker?.change_24h ?? 0) >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`} data-testid="trade-change">{formatPct(ticker?.change_24h ?? 0)}</div>
        <div className="hidden md:block text-xs text-[#94A3B8]">24s Yüksek <span className="tabular text-white">{formatTRY(ticker?.high_24h_try ?? 0)}</span></div>
        <div className="hidden md:block text-xs text-[#94A3B8]">24s Düşük <span className="tabular text-white">{formatTRY(ticker?.low_24h_try ?? 0)}</span></div>
        <div className="hidden lg:block text-xs text-[#94A3B8]">24s Hacim <span className="tabular text-white">{formatTRY(ticker?.volume_24h_try ?? 0, 0)}</span></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="card-surface p-3 lg:col-span-8">
          <div className="flex items-center gap-1 mb-2">
            {INTERVALS.map(([v, l]) => (
              <button key={v} onClick={() => setInterval_(v)} data-testid={`trade-interval-${v}`} className={`px-3 py-1 text-xs rounded ${interval === v ? "bg-[#1F2633] text-white" : "text-[#94A3B8] hover:bg-[#1A202C]"}`}>{l}</button>
            ))}
          </div>
          <div ref={chartContainer} data-testid="trade-chart" className="w-full" />
        </div>

        <div className="card-surface p-3 lg:col-span-2 font-mono text-xs">
          <div className="text-[#94A3B8] mb-1">Emir Defteri</div>
          <div className="grid grid-cols-2 text-[10px] text-[#94A3B8] mb-1">
            <span>Fiyat</span><span className="text-right">Miktar</span>
          </div>
          <div className="space-y-0.5">
            {depth.asks.slice(0, 10).reverse().map((a, i) => (
              <div key={i} className="grid grid-cols-2 tabular" data-testid={`ask-row-${i}`}>
                <span className="text-[#EF4444]">{formatTRY(a[0], sym==="SHIB"?6:2)}</span>
                <span className="text-right text-[#94A3B8]">{a[1].toFixed(4)}</span>
              </div>
            ))}
          </div>
          <div className="py-1 my-1 text-center tabular text-[#DCA335] border-y border-[#1F2633]">{formatTRY(ticker?.price_try ?? 0)}</div>
          <div className="space-y-0.5">
            {depth.bids.slice(0, 10).map((b, i) => (
              <div key={i} className="grid grid-cols-2 tabular" data-testid={`bid-row-${i}`}>
                <span className="text-[#10B981]">{formatTRY(b[0], sym==="SHIB"?6:2)}</span>
                <span className="text-right text-[#94A3B8]">{b[1].toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-3 lg:col-span-2 font-mono text-xs">
          <div className="text-[#94A3B8] mb-2">Son İşlemler</div>
          <div className="space-y-0.5 max-h-[520px] overflow-y-auto scrollbar-thin">
            {trades.map((t, i) => (
              <div key={i} className="grid grid-cols-3 tabular">
                <span className={t.is_buyer_maker ? "text-[#EF4444]" : "text-[#10B981]"}>{formatTRY(t.price)}</span>
                <span className="text-right text-[#94A3B8]">{t.qty.toFixed(4)}</span>
                <span className="text-right text-[#94A3B8]">{new Date(t.time*1000).toLocaleTimeString("tr-TR")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-4 lg:col-span-6">
          <div className="flex mb-4">
            <button className={`flex-1 py-2 rounded-l-lg text-sm font-medium ${side==="buy"?"bg-[#10B981] text-white":"bg-[#1F2633] text-[#94A3B8]"}`} onClick={() => setSide("buy")} data-testid="side-buy">Al</button>
            <button className={`flex-1 py-2 rounded-r-lg text-sm font-medium ${side==="sell"?"bg-[#EF4444] text-white":"bg-[#1F2633] text-[#94A3B8]"}`} onClick={() => setSide("sell")} data-testid="side-sell">Sat</button>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <button className={`tab-btn text-xs ${orderType==="market"?"active":""}`} onClick={() => setOrderType("market")} data-testid="otype-market">Market</button>
            <button className={`tab-btn text-xs ${orderType==="limit"?"active":""}`} onClick={() => setOrderType("limit")} data-testid="otype-limit">Limit</button>
          </div>
          <div className="text-xs text-[#94A3B8] mb-1">Kullanılabilir: <span className="tabular text-white">{side==="buy"?formatTRY(balTRY):`${formatNumber(balCoin)} ${sym}`}</span></div>

          {orderType === "limit" && (
            <>
              <label className="text-xs text-[#94A3B8]">Fiyat (TRY)</label>
              <input data-testid="order-price" type="number" className="input-field mt-1 mb-3 tabular" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={ticker?.price_try.toFixed(2)} />
            </>
          )}
          {side === "buy" && orderType === "market" ? (
            <>
              <label className="text-xs text-[#94A3B8]">Tutar (TRY)</label>
              <input data-testid="order-amount" type="number" className="input-field mt-1 mb-3 tabular" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
            </>
          ) : (
            <>
              <label className="text-xs text-[#94A3B8]">Adet ({sym})</label>
              <input data-testid="order-qty" type="number" className="input-field mt-1 mb-3 tabular" value={qty} onChange={(e) => setQty(e.target.value)} step="any" />
            </>
          )}

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[25,50,75,100].map((p) => (
              <button key={p} onClick={() => {
                if (side === "buy" && orderType === "market") setAmount(((balTRY*p)/100).toFixed(2));
                else if (side === "sell") setQty(((balCoin*p)/100).toFixed(8));
                else if (side === "buy" && orderType === "limit" && price) setQty(((balTRY*p)/100/Number(price)).toFixed(8));
              }} className="text-xs py-1.5 rounded border border-[#1F2633] text-[#94A3B8] hover:bg-[#1A202C]" data-testid={`pct-${p}`}>{p}%</button>
            ))}
          </div>

          <div className="text-xs text-[#94A3B8] mb-3 flex justify-between">
            <span>Yaklaşık Adet</span><span className="tabular text-white">{estQty ? formatNumber(estQty) : "0"} {sym}</span>
          </div>

          <button onClick={submit} data-testid="order-submit" className={`w-full py-3 rounded-lg font-semibold ${side==="buy"?"bg-[#10B981] hover:bg-[#0EA272]":"bg-[#EF4444] hover:bg-[#DC2626]"} text-white`}>
            {side === "buy" ? `${sym} Al` : `${sym} Sat`}
          </button>
        </div>

        <div className="card-surface p-4 lg:col-span-6">
          <div className="text-xs text-[#94A3B8] mb-3">Açık Emirler</div>
          {openOrders.length === 0 ? (
            <div className="text-sm text-[#94A3B8] py-6 text-center">Açık emir yok</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[#94A3B8]">
                <tr><th className="text-left py-1">Coin</th><th className="text-left">Yön</th><th className="text-right">Adet</th><th className="text-right">Fiyat</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-[#1F2633]">
                {openOrders.map((o) => (
                  <tr key={o.order_id} className="tabular">
                    <td className="py-2">{o.symbol}</td>
                    <td className={o.side==="buy"?"text-[#10B981]":"text-[#EF4444]"}>{o.side==="buy"?"Al":"Sat"}</td>
                    <td className="text-right">{formatNumber(o.quantity)}</td>
                    <td className="text-right">{formatTRY(o.price)}</td>
                    <td className="text-right">
                      <button onClick={() => cancel(o.order_id)} className="text-[#EF4444] hover:underline" data-testid={`cancel-${o.order_id}`}>İptal</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
