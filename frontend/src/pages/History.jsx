import { useEffect, useState } from "react";
import { api, formatTRY, formatNumber } from "../lib/api";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [txs, setTxs] = useState([]);
  useEffect(() => {
    api.get("/trade/orders").then((r) => setOrders(r.data || [])).catch(() => {});
    api.get("/wallet/transactions?limit=200").then((r) => setTxs(r.data || [])).catch(() => {});
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-6">İşlem Geçmişi</h1>

      <div className="card-surface mb-6">
        <div className="p-4 border-b border-[#1F2633] text-sm font-medium">Emirler</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Coin</th><th>Tür</th><th>Yön</th><th className="text-right">Adet</th><th className="text-right">Fiyat</th><th className="text-right">Tutar</th><th>Durum</th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td className="px-4 py-2 text-xs text-[#94A3B8]">{new Date(o.created_at).toLocaleString("tr-TR")}</td>
                  <td>{o.symbol}</td>
                  <td>{o.order_type === "market" ? "Market" : "Limit"}</td>
                  <td className={o.side==="buy"?"text-[#10B981]":"text-[#EF4444]"}>{o.side==="buy"?"Al":"Sat"}</td>
                  <td className="text-right tabular">{formatNumber(o.quantity)}</td>
                  <td className="text-right tabular">{formatTRY(o.price)}</td>
                  <td className="text-right tabular">{formatTRY(o.amount_try)}</td>
                  <td className="text-xs">{({filled:"Gerçekleşti",open:"Açık",cancelled:"İptal",pending:"Beklemede"})[o.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="p-6 text-center text-sm text-[#94A3B8]">Henüz emir yok</div>}
        </div>
      </div>

      <div className="card-surface">
        <div className="p-4 border-b border-[#1F2633] text-sm font-medium">Para Hareketleri</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Tür</th><th>Coin</th><th className="text-right">Tutar</th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {txs.map((t, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-xs text-[#94A3B8]">{new Date(t.created_at).toLocaleString("tr-TR")}</td>
                  <td>{({deposit:"Yatırma",withdrawal:"Çekme",trade:t.side==="buy"?"Alış":"Satış"})[t.type]}</td>
                  <td>{t.symbol || "TRY"}</td>
                  <td className="text-right tabular">{formatTRY(t.amount_try)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {txs.length === 0 && <div className="p-6 text-center text-sm text-[#94A3B8]">Henüz işlem yok</div>}
        </div>
      </div>
    </div>
  );
}
