import { useEffect, useState } from "react";
import { api, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";

const TABS = [["overview","Özet"],["users","Kullanıcılar"],["kyc","KYC"],["deposits","Yatırmalar"],["withdrawals","Çekmeler"],["settings","Ayarlar"]];

export default function Admin() {
  const [tab, setTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [kyc, setKyc] = useState([]);
  const [dep, setDep] = useState([]);
  const [wd, setWd] = useState([]);
  const [settings, setSettings] = useState(null);

  const load = () => {
    api.get("/admin/analytics").then((r) => setAnalytics(r.data)).catch(() => {});
    api.get("/admin/users").then((r) => setUsers(r.data || [])).catch(() => {});
    api.get("/admin/kyc").then((r) => setKyc(r.data || [])).catch(() => {});
    api.get("/admin/deposits").then((r) => setDep(r.data || [])).catch(() => {});
    api.get("/admin/withdrawals").then((r) => setWd(r.data || [])).catch(() => {});
    api.get("/admin/settings").then((r) => setSettings(r.data)).catch(() => {});
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const act = async (url, status, note) => {
    try { await api.patch(url, { status, note }); toast.success("İşlem kaydedildi"); load(); }
    catch (e) { toast.error(errToStr(e)); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <h1 className="font-display text-3xl mb-6">Yönetici Paneli</h1>
      <div className="flex gap-1 border-b border-[#1F2633] mb-6 overflow-x-auto">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab===v?"active":""}`} data-testid={`admin-tab-${v}`}>{l}</button>)}
      </div>

      {tab === "overview" && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Toplam Kullanıcı", analytics.users_count],
            ["Doğrulanmış", analytics.verified_users],
            ["KYC Onaylı", analytics.kyc_approved],
            ["KYC Bekleyen", analytics.kyc_pending],
            ["Yatırma Bekleyen", analytics.deposits_pending],
            ["Çekme Bekleyen", analytics.withdrawals_pending],
            ["Toplam Emir", analytics.total_orders],
            ["24s Hacim", formatTRY(analytics.volume_24h, 0)],
          ].map(([k, v]) => (
            <div key={k} className="card-surface p-5">
              <div className="text-xs text-[#94A3B8]">{k}</div>
              <div className="font-display text-2xl tabular mt-2">{v ?? 0}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Ad</th><th>E-posta</th><th>Rol</th><th>KYC</th><th>Kayıt</th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="px-4 py-2">{u.name}</td><td>{u.email}</td>
                  <td className="text-xs">{u.role}</td>
                  <td><span className={u.kyc_status==="approved"?"text-[#10B981]":u.kyc_status==="pending"?"text-[#F59E0B]":u.kyc_status==="rejected"?"text-[#EF4444]":"text-[#94A3B8]"}>{u.kyc_status}</span></td>
                  <td className="text-xs text-[#94A3B8]">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-3">
          {kyc.filter(k=>k.status==="pending").length===0 ? <div className="card-surface p-6 text-center text-sm text-[#94A3B8]">Bekleyen başvuru yok</div> :
          kyc.filter(k=>k.status==="pending").map((k) => (
            <div key={k.kyc_id} className="card-surface p-4" data-testid={`kyc-admin-${k.kyc_id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{k.full_name}</div>
                  <div className="text-xs text-[#94A3B8] tabular">TC: {k.id_number} · Doğum: {k.birth_date}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(`/admin/kyc/${k.kyc_id}`, "approved", "")} className="px-3 py-1.5 rounded bg-[#10B981] text-white text-xs" data-testid={`kyc-approve-${k.kyc_id}`}>Onayla</button>
                  <button onClick={() => { const n=prompt("Red nedeni:")||"Belgeler yetersiz"; act(`/admin/kyc/${k.kyc_id}`, "rejected", n); }} className="px-3 py-1.5 rounded bg-[#EF4444] text-white text-xs" data-testid={`kyc-reject-${k.kyc_id}`}>Reddet</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "deposits" && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>Ref</th><th className="text-right">Tutar</th><th>Durum</th><th></th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {dep.map((d) => {
                const u = users.find((x) => x.user_id === d.user_id);
                return (
                  <tr key={d.deposit_id}>
                    <td className="px-4 py-2 text-xs">{new Date(d.created_at).toLocaleString("tr-TR")}</td>
                    <td>{u?.email || d.user_id}</td>
                    <td className="text-xs tabular">{d.reference_code}</td>
                    <td className="text-right tabular">{formatTRY(d.amount)}</td>
                    <td className="text-xs">{d.status}</td>
                    <td className="text-right pr-4">
                      {d.status==="pending" && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => act(`/admin/deposits/${d.deposit_id}`, "approved", "")} className="px-2 py-1 rounded bg-[#10B981] text-white text-xs" data-testid={`dep-approve-${d.deposit_id}`}>Onayla</button>
                          <button onClick={() => act(`/admin/deposits/${d.deposit_id}`, "rejected", "")} className="px-2 py-1 rounded bg-[#EF4444] text-white text-xs" data-testid={`dep-reject-${d.deposit_id}`}>Reddet</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "withdrawals" && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>IBAN</th><th className="text-right">Tutar</th><th>Durum</th><th></th></tr></thead>
            <tbody className="divide-y divide-[#1F2633]">
              {wd.map((w) => {
                const u = users.find((x) => x.user_id === w.user_id);
                return (
                  <tr key={w.withdrawal_id}>
                    <td className="px-4 py-2 text-xs">{new Date(w.created_at).toLocaleString("tr-TR")}</td>
                    <td>{u?.email || w.user_id}</td>
                    <td className="text-xs tabular">{w.iban}</td>
                    <td className="text-right tabular">{formatTRY(w.amount)}</td>
                    <td className="text-xs">{w.status}</td>
                    <td className="text-right pr-4">
                      {w.status==="pending" && (
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => act(`/admin/withdrawals/${w.withdrawal_id}`, "approved", "")} className="px-2 py-1 rounded bg-[#10B981] text-white text-xs" data-testid={`wd-approve-${w.withdrawal_id}`}>Onayla</button>
                          <button onClick={() => act(`/admin/withdrawals/${w.withdrawal_id}`, "rejected", "")} className="px-2 py-1 rounded bg-[#EF4444] text-white text-xs" data-testid={`wd-reject-${w.withdrawal_id}`}>Reddet</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {tab === "settings" && settings && (
        <SettingsPanel settings={settings} onSave={async (updates) => {
          try { const { data } = await api.patch("/admin/settings", updates); setSettings(data); toast.success("Ayarlar güncellendi"); }
          catch (e) { toast.error(errToStr(e)); }
        }} />
      )}
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [local, setLocal] = useState(settings);
  useEffect(() => setLocal(settings), [settings]);
  const upd = (k, v) => setLocal({ ...local, [k]: v });
  return (
    <div className="card-surface p-6 max-w-2xl">
      <div className="text-sm font-medium mb-4">Platform Ayarları</div>
      <div className="flex items-center justify-between py-3 border-b border-[#1F2633]">
        <div>
          <div className="text-sm">KYC Zorunluluğu</div>
          <div className="text-xs text-[#94A3B8]">Kapatırsanız kullanıcılar KYC olmadan da alım-satım ve para çekme yapabilir</div>
        </div>
        <button
          data-testid="settings-kyc-toggle"
          onClick={() => upd("kyc_enforced", !local.kyc_enforced)}
          className={`relative w-12 h-6 rounded-full transition ${local.kyc_enforced ? "bg-[#DCA335]" : "bg-[#1F2633]"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${local.kyc_enforced ? "translate-x-6" : ""}`} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div>
          <label className="text-xs text-[#94A3B8]">İşlem Komisyonu (oran, örn 0.001 = %0.1)</label>
          <input data-testid="settings-fee" type="number" step="0.0001" className="input-field mt-1 tabular" value={local.trading_fee ?? 0} onChange={(e) => upd("trading_fee", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-[#94A3B8]">Min. Yatırma (TL)</label>
          <input data-testid="settings-min-dep" type="number" className="input-field mt-1 tabular" value={local.min_deposit_try ?? 0} onChange={(e) => upd("min_deposit_try", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-[#94A3B8]">Min. Çekme (TL)</label>
          <input data-testid="settings-min-wd" type="number" className="input-field mt-1 tabular" value={local.min_withdrawal_try ?? 0} onChange={(e) => upd("min_withdrawal_try", Number(e.target.value))} />
        </div>
      </div>
      <button data-testid="settings-save" onClick={() => onSave(local)} className="btn-primary px-5 py-2.5 rounded-lg text-sm">Kaydet</button>
    </div>
  );
}
