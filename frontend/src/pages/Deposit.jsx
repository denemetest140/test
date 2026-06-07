import { useEffect, useState } from "react";
import { api, formatTRY, errToStr } from "../lib/api";
import { Copy, Upload } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Deposit() {
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/deposits/bank-info").then((r) => setInfo(r.data)).catch(() => {});
    api.get("/deposits").then((r) => setList(r.data || [])).catch(() => {});
  };
  useEffect(load, []);

  const copy = (v) => { navigator.clipboard.writeText(v); toast.success("Kopyalandı"); };

  const submit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) < 50) { toast.error("Minimum 50 TL"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("amount", amount);
    if (file) fd.append("receipt", file);
    try {
      await api.post("/deposits", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Yatırma talebi oluşturuldu. Admin onayı bekleniyor.");
      setAmount(""); setFile(null); load();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  const statusLabel = (s) => ({ pending: "Beklemede", approved: "Onaylandı", rejected: "Reddedildi" }[s] || s);
  const statusColor = (s) => ({ pending: "text-[#D97706]", approved: "text-[#16A34A]", rejected: "text-[#DC2626]" }[s] || "");

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-2">TL Yatırma (Havale / EFT)</h1>
      <p className="text-[#64748B] text-sm mb-6">IBAN'a havale/EFT yapın, açıklamaya <span className="text-[#16A34A]">referans kodunuzu</span> girmeyi unutmayın.</p>

      <div className="card-surface p-6 mb-6">
        <div className="text-xs text-[#64748B] mb-4">Banka Bilgileri</div>
        <div className="space-y-3">
          {[
            ["Banka", info?.bank_name],
            ["Alıcı", info?.recipient],
            ["IBAN", info?.iban],
            ["Referans Kodu", info?.reference_code],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-4 py-3">
              <div>
                <div className="text-[10px] text-[#64748B] uppercase">{k}</div>
                <div className="tabular text-sm" data-testid={`bank-${k}`}>{v || "-"}</div>
              </div>
              <button onClick={() => copy(v || "")} className="p-2 hover:bg-[#F1F5F9] rounded" data-testid={`copy-${k}`}>
                <Copy size={16} className="text-[#64748B]" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-[#16A34A]/10 border border-[#16A34A]/30 rounded-lg p-3 text-xs text-[#16A34A]">
          ⚠ Açıklama kısmına mutlaka referans kodunuzu girin, aksi halde işleminiz manuel eşleşme gerektirir.
        </div>
      </div>

      <form onSubmit={submit} className="card-surface p-6 mb-6" data-testid="deposit-form">
        <div className="text-xs text-[#64748B] mb-4">Dekont Yükle</div>
        <label className="text-xs text-[#64748B]">Tutar (TL)</label>
        <input data-testid="deposit-amount" type="number" className="input-field mt-1 mb-4 tabular" value={amount} onChange={(e) => setAmount(e.target.value)} min="50" placeholder="Min 50 TL" />
        <label className="text-xs text-[#64748B]">Dekont (PNG/JPG/PDF)</label>
        <label className="mt-1 mb-4 flex items-center gap-2 cursor-pointer bg-[#FFFFFF] border border-dashed border-[#E2E8F0] hover:border-[#16A34A] rounded-lg px-4 py-4">
          <Upload size={18} className="text-[#16A34A]" />
          <span className="text-sm">{file ? file.name : "Dekont seç veya sürükle"}</span>
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} data-testid="deposit-receipt" />
        </label>
        <button disabled={loading} className="btn-primary px-5 py-2.5 rounded-lg text-sm" data-testid="deposit-submit">{loading ? "Gönderiliyor..." : "Talep Oluştur"}</button>
      </form>

      <div className="card-surface p-6">
        <div className="text-xs text-[#64748B] mb-3">Yatırma Geçmişiniz</div>
        {list.length === 0 ? <div className="text-sm text-[#64748B] py-4">Henüz talep yok</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#64748B] text-left"><th>Tarih</th><th>Tutar</th><th>Ref</th><th>Durum</th></tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {list.map((d) => (
                <tr key={d.deposit_id}>
                  <td className="py-2 text-xs">{new Date(d.created_at).toLocaleString("tr-TR")}</td>
                  <td className="tabular">{formatTRY(d.amount)}</td>
                  <td className="text-xs text-[#64748B]">{d.reference_code}</td>
                  <td className={statusColor(d.status)}>{statusLabel(d.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
