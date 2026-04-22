import { useEffect, useState } from "react";
import { api, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";

const TABS = [["overview","Özet"],["users","Kullanıcılar"],["kyc","KYC"],["deposits","Yatırmalar"],["withdrawals","Çekmeler"],["cwithdrawals","Kripto Çekimleri"],["transfers","Transferler"],["networks","Ağlar"],["berx","BERX Coin"],["support","Destek"],["settings","Ayarlar"]];

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
      {tab === "cwithdrawals" && <CryptoWithdrawalsPanel />}

      {tab === "transfers" && <TransfersPanel />}

      {tab === "networks" && <NetworksPanel />}

      {tab === "berx" && <BerxPanel />}

      {tab === "support" && <SupportPanel />}

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
        <div>
          <label className="text-xs text-[#94A3B8]">İç Transfer Komisyonu (oran, 0.0005 = %0.05)</label>
          <input data-testid="settings-transfer-fee" type="number" step="0.0001" className="input-field mt-1 tabular" value={local.transfer_fee_pct ?? 0} onChange={(e) => upd("transfer_fee_pct", Number(e.target.value))} />
        </div>
      </div>
      <button data-testid="settings-save" onClick={() => onSave(local)} className="btn-primary px-5 py-2.5 rounded-lg text-sm">Kaydet</button>
    </div>
  );
}


function BerxPanel() {
  const [info, setInfo] = useState(null);
  const [klines, setKlines] = useState([]);
  const [setPrice, setSetPrice] = useState("");
  const [pct, setPct] = useState("");
  const load = () => {
    api.get("/admin/berx").then((r) => setInfo(r.data)).catch(() => {});
    api.get("/markets/BERX/klines?interval=1h&limit=72").then((r) => setKlines(r.data || []));
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const call = async (action, value) => {
    try { await api.post("/admin/berx/price", { action, value: Number(value) }); toast.success("BERX güncellendi"); setSetPrice(""); setPct(""); load(); }
    catch (e) { toast.error(errToStr(e)); }
  };
  const up = (info?.change_24h ?? 0) >= 0;
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card-surface p-6">
        <div className="text-xs text-[#94A3B8] mb-3">Mevcut BERX Fiyatı</div>
        <div className="font-display text-4xl tabular text-[#DCA335]" data-testid="admin-berx-price">{formatTRY(info?.price_try ?? 0, 6)}</div>
        <div className={`text-xs tabular mt-2 ${up?"text-[#10B981]":"text-[#EF4444]"}`}>{up?"+":""}{(info?.change_24h ?? 0).toFixed(2)}% (24s)</div>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <div className="bg-[#0B0E14] border border-[#1F2633] rounded p-2"><div className="text-[10px] text-[#94A3B8]">24s Yüksek</div><div className="tabular text-xs">{formatTRY(info?.high_24h_try ?? 0, 6)}</div></div>
          <div className="bg-[#0B0E14] border border-[#1F2633] rounded p-2"><div className="text-[10px] text-[#94A3B8]">24s Düşük</div><div className="tabular text-xs">{formatTRY(info?.low_24h_try ?? 0, 6)}</div></div>
          <div className="bg-[#0B0E14] border border-[#1F2633] rounded p-2 col-span-2"><div className="text-[10px] text-[#94A3B8]">24s Hacim</div><div className="tabular text-xs">{formatTRY(info?.volume_24h_try ?? 0, 2)}</div></div>
        </div>
      </div>
      <div className="card-surface p-6 lg:col-span-2">
        <div className="text-xs text-[#94A3B8] mb-3">BERX Fiyat Kontrolü</div>
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs text-[#94A3B8]">Belirli Fiyata Ayarla (TRY)</label>
            <div className="flex gap-2 mt-1">
              <input data-testid="berx-set-price" type="number" step="0.0001" className="input-field tabular" value={setPrice} onChange={(e) => setSetPrice(e.target.value)} placeholder="örn. 1.2500" />
              <button onClick={() => setPrice && call("set", setPrice)} className="btn-primary px-4 rounded-lg text-sm" data-testid="berx-set-submit">Uygula</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8]">Yüzde ile Düzelt (±%)</label>
            <div className="flex gap-2 mt-1">
              <input data-testid="berx-pct-input" type="number" step="0.01" className="input-field tabular" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="örn. 5 veya -3" />
              <button onClick={() => pct && call("adjust", pct)} className="btn-primary px-4 rounded-lg text-sm" data-testid="berx-pct-submit">Uygula</button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[-5, -2, -1, 1, 2, 5, 10].map((p) => (
            <button
              key={p}
              onClick={() => call("adjust", p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${p>0?"bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/25":"bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25"}`}
              data-testid={`berx-quick-${p}`}
            >
              {p>0?"+":""}{p}%
            </button>
          ))}
        </div>
        <div className="mt-5 text-xs text-[#94A3B8]">Son 72 saat fiyat geçmişi ({klines.length} nokta)</div>
        <div className="flex items-end gap-0.5 h-20 mt-2">
          {klines.map((c, i) => {
            const prev = klines[i - 1]?.close ?? c.close;
            const up = c.close >= prev;
            const min = Math.min(...klines.map((x) => x.close));
            const max = Math.max(...klines.map((x) => x.close));
            const h = ((c.close - min) / Math.max(max - min, 0.000001)) * 100;
            return <div key={i} className={`flex-1 rounded-sm ${up?"bg-[#10B981]/70":"bg-[#EF4444]/70"}`} style={{ height: `${Math.max(5, h)}%` }} />;
          })}
        </div>
      </div>
    </div>
  );
}

function SupportPanel() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState("");
  const load = () => api.get("/admin/support").then((r) => setRows(r.data || []));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const send = async (close) => {
    if (!reply.trim()) return;
    try { await api.post(`/admin/support/${open.message_id}/reply`, { body: reply, close: !!close }); toast.success("Yanıt gönderildi"); setReply(""); setOpen(null); load(); }
    catch (e) { toast.error(errToStr(e)); }
  };
  const chip = (s) => ({open:"text-[#F59E0B] bg-[#F59E0B]/10", answered:"text-[#3B82F6] bg-[#3B82F6]/10", closed:"text-[#10B981] bg-[#10B981]/10"}[s] || "text-[#94A3B8] bg-[#1F2633]");
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card-surface p-4">
        <div className="text-xs text-[#94A3B8] mb-3">Gelen Mesajlar ({rows.length})</div>
        <div className="space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin">
          {rows.map((m) => (
            <button key={m.message_id} onClick={() => setOpen(m)} className={`w-full text-left p-3 rounded-lg border ${open?.message_id===m.message_id?"border-[#DCA335] bg-[#11151E]":"border-[#1F2633] bg-[#0B0E14] hover:border-[#2A3344]"}`} data-testid={`admin-msg-${m.message_id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{m.subject}</div>
                  <div className="text-xs text-[#94A3B8]">{m.user_email} · {m.category}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${chip(m.status)}`}>{m.status}</span>
              </div>
              <div className="text-xs text-[#94A3B8] mt-1">{new Date(m.created_at).toLocaleString("tr-TR")}</div>
            </button>
          ))}
          {rows.length === 0 && <div className="text-sm text-[#94A3B8] py-6 text-center">Mesaj yok</div>}
        </div>
      </div>
      <div className="card-surface p-4">
        {!open ? (
          <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-[#94A3B8]">Bir mesaj seçin</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-[#94A3B8]">{open.user_name} · {open.user_email}</div>
              <div className="font-display text-xl mt-1">{open.subject}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{new Date(open.created_at).toLocaleString("tr-TR")} · {open.category}</div>
            </div>
            <div className="bg-[#0B0E14] border border-[#1F2633] rounded-lg p-4 whitespace-pre-wrap text-sm">{open.body}</div>
            {(open.replies || []).map((r, i) => (
              <div key={i} className="bg-[#DCA335]/5 border border-[#DCA335]/30 rounded p-3">
                <div className="text-[10px] text-[#DCA335] uppercase">Admin · {new Date(r.at).toLocaleString("tr-TR")}</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{r.body}</div>
              </div>
            ))}
            <textarea data-testid="admin-reply-body" value={reply} onChange={(e) => setReply(e.target.value)} className="input-field min-h-[100px]" placeholder="Yanıtınızı yazın..." />
            <div className="flex gap-2">
              <button onClick={() => send(false)} className="btn-primary px-4 py-2 rounded-lg text-sm" data-testid="admin-reply-send">Gönder</button>
              <button onClick={() => send(true)} className="px-4 py-2 rounded-lg border border-[#1F2633] text-sm hover:bg-[#11151E]" data-testid="admin-reply-close">Gönder & Kapat</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NetworksPanel() {
  const [nets, setNets] = useState([]);
  const load = () => api.get("/admin/networks").then((r) => setNets(r.data || []));
  useEffect(load, []);
  const save = async (code, upd) => { try { await api.patch(`/admin/networks/${code}`, upd); toast.success("Ağ güncellendi"); load(); } catch (e) { toast.error(errToStr(e)); } };
  return (
    <div className="space-y-3">
      <div className="text-xs text-[#94A3B8]">Her ağ için ücret, min çekim, onay süresi ve aktif/pasif durumu ayarlayın.</div>
      {nets.map((n) => <NetworkRow key={n.code} n={n} onSave={save} />)}
    </div>
  );
}

function NetworkRow({ n, onSave }) {
  const [local, setLocal] = useState(n);
  useEffect(() => setLocal(n), [n]);
  return (
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-display text-lg">{local.name} <span className="text-xs text-[#94A3B8]">({local.code})</span></div>
          <div className="text-xs text-[#94A3B8]">{local.description}</div>
        </div>
        <button onClick={() => onSave(local.code, { enabled: !local.enabled })} className={`px-3 py-1 rounded text-xs ${local.enabled?"bg-[#10B981]/20 text-[#10B981]":"bg-[#EF4444]/20 text-[#EF4444]"}`} data-testid={`net-toggle-${local.code}`}>
          {local.enabled ? "Aktif" : "Pasif"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-[#94A3B8] uppercase">Ücret (TRY)</label>
          <input data-testid={`net-fee-${local.code}`} type="number" step="0.01" className="input-field mt-1 tabular" value={local.fee_flat_try} onChange={(e) => setLocal({...local, fee_flat_try: Number(e.target.value)})}/>
        </div>
        <div>
          <label className="text-[10px] text-[#94A3B8] uppercase">Min Çekim (TRY)</label>
          <input data-testid={`net-min-${local.code}`} type="number" step="0.01" className="input-field mt-1 tabular" value={local.min_withdraw_try} onChange={(e) => setLocal({...local, min_withdraw_try: Number(e.target.value)})}/>
        </div>
        <div>
          <label className="text-[10px] text-[#94A3B8] uppercase">Onay (dk)</label>
          <input data-testid={`net-conf-${local.code}`} type="number" className="input-field mt-1 tabular" value={local.confirm_minutes} onChange={(e) => setLocal({...local, confirm_minutes: Number(e.target.value)})}/>
        </div>
        <div className="flex items-end">
          <button onClick={() => onSave(local.code, {
            fee_flat_try: local.fee_flat_try, min_withdraw_try: local.min_withdraw_try, confirm_minutes: local.confirm_minutes
          })} className="btn-primary w-full py-2 rounded-lg text-sm" data-testid={`net-save-${local.code}`}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function TransfersPanel() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/transfers").then((r) => setRows(r.data || [])); }, []);
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Gönderen</th><th>Alıcı</th><th>Coin</th><th className="text-right">Miktar</th><th className="text-right">Komisyon</th><th>Durum</th></tr></thead>
        <tbody className="divide-y divide-[#1F2633]">
          {rows.map((t) => (
            <tr key={t.transfer_id} className="tabular">
              <td className="px-4 py-2 text-xs">{new Date(t.created_at).toLocaleString("tr-TR")}</td>
              <td className="text-xs">{t.sender_email}</td>
              <td className="text-xs">{t.receiver_email}</td>
              <td>{t.symbol}</td>
              <td className="text-right">{t.amount.toFixed(6)}</td>
              <td className="text-right text-[#94A3B8]">{t.fee.toFixed(6)}</td>
              <td><span className="text-[10px] px-2 py-0.5 rounded-full text-[#10B981] bg-[#10B981]/10">{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-8 text-center text-sm text-[#94A3B8]">Henüz transfer yok</div>}
    </div>
  );
}

function CryptoWithdrawalsPanel() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const load = () => {
    api.get("/admin/crypto-withdrawals").then((r) => setRows(r.data || []));
    api.get("/admin/users").then((r) => setUsers(r.data || []));
  };
  useEffect(load, []);
  const act = async (id, status) => { try { await api.patch(`/admin/crypto-withdrawals/${id}`, { status, note: "" }); toast.success("İşlendi"); load(); } catch (e) { toast.error(errToStr(e)); } };
  return (
    <div className="card-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-[#94A3B8] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>Coin</th><th>Ağ</th><th>Adres</th><th className="text-right">Miktar</th><th>Durum</th><th></th></tr></thead>
        <tbody className="divide-y divide-[#1F2633]">
          {rows.map((w) => {
            const u = users.find((x) => x.user_id === w.user_id);
            return (
              <tr key={w.withdrawal_id} className="tabular">
                <td className="px-4 py-2 text-xs">{new Date(w.created_at).toLocaleString("tr-TR")}</td>
                <td className="text-xs">{u?.email || w.user_id}</td>
                <td>{w.symbol}</td>
                <td className="text-xs"><span className="chip text-[10px]">{w.network}</span></td>
                <td className="text-xs truncate max-w-[200px]">{w.address}</td>
                <td className="text-right">{w.amount.toFixed(8)}</td>
                <td className="text-xs">{w.status}</td>
                <td className="text-right pr-4">
                  {w.status==="pending" && (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => act(w.withdrawal_id, "approved")} className="px-2 py-1 rounded bg-[#10B981] text-white text-xs" data-testid={`cw-ok-${w.withdrawal_id}`}>Onayla</button>
                      <button onClick={() => act(w.withdrawal_id, "rejected")} className="px-2 py-1 rounded bg-[#EF4444] text-white text-xs" data-testid={`cw-no-${w.withdrawal_id}`}>Reddet</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-8 text-center text-sm text-[#94A3B8]">Kripto çekim yok</div>}
    </div>
  );
}

