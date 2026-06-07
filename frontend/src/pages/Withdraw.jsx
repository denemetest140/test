import { useEffect, useState } from "react";
import { api, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";

export default function Withdraw() {
  const [form, setForm] = useState({ amount: "", iban: "", bank_name: "", account_holder: "" });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  const load = () => {
    api.get("/withdrawals").then((r) => setList(r.data || [])).catch(() => {});
    api.get("/wallet").then((r) => setBalance(r.data?.assets?.find((a) => a.symbol === "TRY")?.amount || 0));
  };
  useEffect(load, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/withdrawals", { ...form, amount: Number(form.amount) });
      toast.success("Çekim talebi oluşturuldu");
      setForm({ amount: "", iban: "", bank_name: "", account_holder: "" });
      load();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-2">TL Çekme</h1>
      <p className="text-[#64748B] text-sm mb-6">IBAN'ınıza havale ile gönderilir. KYC onayı gereklidir.</p>

      <div className="card-surface p-4 mb-4 flex items-center justify-between">
        <span className="text-xs text-[#64748B]">Çekilebilir Bakiye</span>
        <span className="tabular text-lg" data-testid="withdraw-balance">{formatTRY(balance)}</span>
      </div>

      <form onSubmit={submit} className="card-surface p-6 mb-6" data-testid="withdraw-form">
        <label className="text-xs text-[#64748B]">Tutar (TL)</label>
        <input data-testid="wd-amount" type="number" className="input-field mt-1 mb-3 tabular" required value={form.amount} onChange={set("amount")} />
        <label className="text-xs text-[#64748B]">IBAN (TR ile başlamalı)</label>
        <input data-testid="wd-iban" type="text" className="input-field mt-1 mb-3 tabular uppercase" required maxLength={34} value={form.iban} onChange={set("iban")} placeholder="TR00 0000 0000 0000 0000 0000 00" />
        <label className="text-xs text-[#64748B]">Banka Adı</label>
        <input data-testid="wd-bank" className="input-field mt-1 mb-3" required value={form.bank_name} onChange={set("bank_name")} />
        <label className="text-xs text-[#64748B]">Hesap Sahibi</label>
        <input data-testid="wd-holder" className="input-field mt-1 mb-4" required value={form.account_holder} onChange={set("account_holder")} />
        <button disabled={loading} className="btn-primary px-5 py-2.5 rounded-lg text-sm" data-testid="wd-submit">{loading ? "Gönderiliyor..." : "Çekim Talebi"}</button>
      </form>

      <div className="card-surface p-6">
        <div className="text-xs text-[#64748B] mb-3">Çekim Geçmişiniz</div>
        {list.length === 0 ? <div className="text-sm text-[#64748B] py-4">Henüz çekim yok</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#64748B] text-left"><th>Tarih</th><th>Tutar</th><th>IBAN</th><th>Durum</th></tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {list.map((w) => (
                <tr key={w.withdrawal_id}>
                  <td className="py-2 text-xs">{new Date(w.created_at).toLocaleString("tr-TR")}</td>
                  <td className="tabular">{formatTRY(w.amount)}</td>
                  <td className="text-xs tabular text-[#64748B]">{w.iban}</td>
                  <td className={w.status==="approved"?"text-[#16A34A]":w.status==="rejected"?"text-[#DC2626]":"text-[#D97706]"}>{{approved:"Onaylandı",rejected:"Reddedildi",pending:"Beklemede"}[w.status] || w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
