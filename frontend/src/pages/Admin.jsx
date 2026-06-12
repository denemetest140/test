import { useEffect, useState, useRef } from "react";
import { api, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";

const TABS = [["overview","Özet"],["users","Kullanıcılar"],["kyc","KYC"],["deposits","Yatırmalar"],["withdrawals","Çekmeler"],["cwithdrawals","Kripto Çekimleri"],["transfers","Transferler"],["networks","Ağlar"],["addresses","Coin Adresleri"],["berx","BERX Coin"],["livechat","Canlı Destek"],["support","Destek Mesajları"],["activity","Etkinlik Kayıtları"],["settings","Ayarlar"]];

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
      <div className="flex gap-1 border-b border-[#E2E8F0] mb-6 overflow-x-auto">
        {TABS.map(([v, l]) => <button key={v} onClick={() => setTab(v)} className={`tab-btn ${tab===v?"active":""}`} data-testid={`admin-tab-${v}`}>{l}</button>)}
      </div>

      {tab === "overview" && analytics && (
        <>
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
                <div className="text-xs text-[#64748B]">{k}</div>
                <div className="font-display text-2xl tabular mt-2">{v ?? 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-6"><LiveChatStatsCard /></div>
        </>
      )}

      {tab === "users" && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-2">Ad</th><th>E-posta</th><th>Rol</th><th>KYC</th><th>Kayıt</th></tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="px-4 py-2">{u.name}</td><td>{u.email}</td>
                  <td className="text-xs">{u.role}</td>
                  <td><span className={u.kyc_status==="approved"?"text-[#16A34A]":u.kyc_status==="pending"?"text-[#D97706]":u.kyc_status==="rejected"?"text-[#DC2626]":"text-[#64748B]"}>{u.kyc_status}</span></td>
                  <td className="text-xs text-[#64748B]">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-3">
          {kyc.filter(k=>k.status==="pending").length===0 ? <div className="card-surface p-6 text-center text-sm text-[#64748B]">Bekleyen başvuru yok</div> :
          kyc.filter(k=>k.status==="pending").map((k) => (
            <div key={k.kyc_id} className="card-surface p-4" data-testid={`kyc-admin-${k.kyc_id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{k.full_name}</div>
                  <div className="text-xs text-[#64748B] tabular">TC: {k.id_number} · Doğum: {k.birth_date}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(`/admin/kyc/${k.kyc_id}`, "approved", "")} className="px-3 py-1.5 rounded bg-[#16A34A] text-white text-xs" data-testid={`kyc-approve-${k.kyc_id}`}>Onayla</button>
                  <button onClick={() => { const n=prompt("Red nedeni:")||"Belgeler yetersiz"; act(`/admin/kyc/${k.kyc_id}`, "rejected", n); }} className="px-3 py-1.5 rounded bg-[#DC2626] text-white text-xs" data-testid={`kyc-reject-${k.kyc_id}`}>Reddet</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "deposits" && (
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>Ref</th><th className="text-right">Tutar</th><th>Durum</th><th></th></tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
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
                          <button onClick={() => act(`/admin/deposits/${d.deposit_id}`, "approved", "")} className="px-2 py-1 rounded bg-[#16A34A] text-white text-xs" data-testid={`dep-approve-${d.deposit_id}`}>Onayla</button>
                          <button onClick={() => act(`/admin/deposits/${d.deposit_id}`, "rejected", "")} className="px-2 py-1 rounded bg-[#DC2626] text-white text-xs" data-testid={`dep-reject-${d.deposit_id}`}>Reddet</button>
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
            <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>IBAN</th><th className="text-right">Tutar</th><th>Durum</th><th></th></tr></thead>
            <tbody className="divide-y divide-[#E2E8F0]">
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
                          <button onClick={() => act(`/admin/withdrawals/${w.withdrawal_id}`, "approved", "")} className="px-2 py-1 rounded bg-[#16A34A] text-white text-xs" data-testid={`wd-approve-${w.withdrawal_id}`}>Onayla</button>
                          <button onClick={() => act(`/admin/withdrawals/${w.withdrawal_id}`, "rejected", "")} className="px-2 py-1 rounded bg-[#DC2626] text-white text-xs" data-testid={`wd-reject-${w.withdrawal_id}`}>Reddet</button>
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

      {tab === "addresses" && <PlatformAddressesPanel />}

      {tab === "support" && <SupportPanel />}

      {tab === "livechat" && <LiveChatPanel />}

      {tab === "activity" && <ActivityLogsPanel />}

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
      <div className="flex items-center justify-between py-3 border-b border-[#E2E8F0]">
        <div>
          <div className="text-sm">KYC Zorunluluğu</div>
          <div className="text-xs text-[#64748B]">Kapatırsanız kullanıcılar KYC olmadan da alım-satım ve para çekme yapabilir</div>
        </div>
        <button
          data-testid="settings-kyc-toggle"
          onClick={() => upd("kyc_enforced", !local.kyc_enforced)}
          className={`relative w-12 h-6 rounded-full transition ${local.kyc_enforced ? "bg-[#16A34A]" : "bg-[#E2E8F0]"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${local.kyc_enforced ? "translate-x-6" : ""}`} />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
        <div>
          <label className="text-xs text-[#64748B]">İşlem Komisyonu (oran, örn 0.001 = %0.1)</label>
          <input data-testid="settings-fee" type="number" step="0.0001" className="input-field mt-1 tabular" value={local.trading_fee ?? 0} onChange={(e) => upd("trading_fee", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Min. Yatırma (TL)</label>
          <input data-testid="settings-min-dep" type="number" className="input-field mt-1 tabular" value={local.min_deposit_try ?? 0} onChange={(e) => upd("min_deposit_try", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Min. Çekme (TL)</label>
          <input data-testid="settings-min-wd" type="number" className="input-field mt-1 tabular" value={local.min_withdrawal_try ?? 0} onChange={(e) => upd("min_withdrawal_try", Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-[#64748B]">İç Transfer Komisyonu (oran, 0.0005 = %0.05)</label>
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
  const [sim, setSim] = useState(null);
  const load = () => {
    api.get("/admin/berx").then((r) => { setInfo(r.data); setSim(r.data.simulation || null); }).catch(() => {});
    api.get("/markets/BERX/klines?interval=1h&limit=72").then((r) => setKlines(r.data || []));
  };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const call = async (action, value) => {
    try { await api.post("/admin/berx/price", { action, value: Number(value) }); toast.success("BERX güncellendi"); setSetPrice(""); setPct(""); load(); }
    catch (e) { toast.error(errToStr(e)); }
  };
  const saveSim = async (partial) => {
    try { const { data } = await api.patch("/admin/berx/simulation", partial); setSim(data); toast.success("Simülasyon güncellendi"); }
    catch (e) { toast.error(errToStr(e)); }
  };
  const up = (info?.change_24h ?? 0) >= 0;
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-surface p-6">
          <div className="text-xs text-[#64748B] mb-3">Mevcut BERX Fiyatı</div>
          <div className="font-display text-4xl tabular text-[#D4A017]" data-testid="admin-berx-price">{formatTRY(info?.price_try ?? 0, 6)}</div>
          <div className={`text-xs tabular mt-2 ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>{up?"+":""}{(info?.change_24h ?? 0).toFixed(2)}% (24s)</div>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2"><div className="text-[10px] text-[#64748B]">24s Yüksek</div><div className="tabular text-xs">{formatTRY(info?.high_24h_try ?? 0, 6)}</div></div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2"><div className="text-[10px] text-[#64748B]">24s Düşük</div><div className="tabular text-xs">{formatTRY(info?.low_24h_try ?? 0, 6)}</div></div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2 col-span-2"><div className="text-[10px] text-[#64748B]">24s Hacim</div><div className="tabular text-xs">{formatTRY(info?.volume_24h_try ?? 0, 2)}</div></div>
          </div>
        </div>
        <div className="card-surface p-6 lg:col-span-2">
          <div className="text-xs text-[#64748B] mb-3">Manuel Fiyat Kontrolü</div>
          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs text-[#64748B]">Belirli Fiyata Ayarla (TRY)</label>
              <div className="flex gap-2 mt-1">
                <input data-testid="berx-set-price" type="number" step="0.0001" className="input-field tabular" value={setPrice} onChange={(e) => setSetPrice(e.target.value)} placeholder="örn. 1.2500" />
                <button onClick={() => setPrice && call("set", setPrice)} className="btn-primary px-4 rounded-lg text-sm" data-testid="berx-set-submit">Uygula</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-[#64748B]">Yüzde ile Düzelt (±%)</label>
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
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${p>0?"bg-green-50 text-[#16A34A] hover:bg-green-100":"bg-red-50 text-[#DC2626] hover:bg-red-100"}`}
                data-testid={`berx-quick-${p}`}
              >
                {p>0?"+":""}{p}%
              </button>
            ))}
          </div>
          <div className="mt-5 text-xs text-[#64748B]">Son 72 saat fiyat geçmişi ({klines.length} nokta)</div>
          <div className="flex items-end gap-0.5 h-20 mt-2">
            {klines.map((c, i) => {
              const prev = klines[i - 1]?.close ?? c.close;
              const u = c.close >= prev;
              const min = Math.min(...klines.map((x) => x.close));
              const max = Math.max(...klines.map((x) => x.close));
              const h = ((c.close - min) / Math.max(max - min, 0.000001)) * 100;
              return <div key={i} className={`flex-1 rounded-sm ${u?"bg-[#16A34A]/70":"bg-[#DC2626]/70"}`} style={{ height: `${Math.max(5, h)}%` }} />;
            })}
          </div>
        </div>
      </div>

      {sim && (
        <div className="card-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="font-display text-lg text-[#0F172A]">Otomatik Fiyat Simülasyonu</div>
              <div className="text-xs text-[#64748B]">Random walk modeli ile gerçekçi BERX fiyat hareketi üretir.</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B]">Mod:</span>
              <div className="inline-flex border border-[#E2E8F0] rounded-lg overflow-hidden text-xs">
                <button onClick={() => saveSim({ mode: "manual" })} className={`px-3 py-1.5 ${sim.mode==="manual"?"bg-[#16A34A] text-white":"text-[#475569] hover:bg-[#F8FAFC]"}`} data-testid="berx-sim-mode-manual">Manuel</button>
                <button onClick={() => saveSim({ mode: "auto" })} className={`px-3 py-1.5 ${sim.mode==="auto"?"bg-[#16A34A] text-white":"text-[#475569] hover:bg-[#F8FAFC]"}`} data-testid="berx-sim-mode-auto">Otomatik</button>
              </div>
              <button
                onClick={() => saveSim({ enabled: !sim.enabled })}
                className={`relative w-12 h-6 rounded-full transition ${sim.enabled ? "bg-[#16A34A]" : "bg-[#CBD5E1]"}`}
                data-testid="berx-sim-toggle"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${sim.enabled ? "translate-x-6" : ""}`} />
              </button>
            </div>
          </div>
          <SimRow sim={sim} saveSim={saveSim} />
        </div>
      )}
    </div>
  );
}

function SimRow({ sim, saveSim }) {
  const [local, setLocal] = useState(sim);
  useEffect(() => setLocal(sim), [sim]);
  const upd = (k, v) => setLocal({ ...local, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Min Fiyat (TRY)</label>
        <input data-testid="berx-sim-min" type="number" step="0.0001" className="input-field tabular mt-1" value={local.min_price} onChange={(e) => upd("min_price", Number(e.target.value))}/>
      </div>
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Max Fiyat (TRY)</label>
        <input data-testid="berx-sim-max" type="number" step="0.0001" className="input-field tabular mt-1" value={local.max_price} onChange={(e) => upd("max_price", Number(e.target.value))}/>
      </div>
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Günlük Max Değişim (%)</label>
        <input data-testid="berx-sim-cap" type="number" step="0.1" className="input-field tabular mt-1" value={local.max_daily_change_pct} onChange={(e) => upd("max_daily_change_pct", Number(e.target.value))}/>
      </div>
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Tick Aralığı (sn)</label>
        <input data-testid="berx-sim-interval" type="number" className="input-field tabular mt-1" value={local.tick_interval_seconds} onChange={(e) => upd("tick_interval_seconds", Number(e.target.value))}/>
      </div>
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Volatilite (0.001 - 0.05)</label>
        <input data-testid="berx-sim-vol" type="number" step="0.001" className="input-field tabular mt-1" value={local.volatility} onChange={(e) => upd("volatility", Number(e.target.value))}/>
      </div>
      <div>
        <label className="text-[10px] text-[#64748B] uppercase">Trend (drift, -0.01..0.01)</label>
        <input data-testid="berx-sim-trend" type="number" step="0.0005" className="input-field tabular mt-1" value={local.trend} onChange={(e) => upd("trend", Number(e.target.value))}/>
      </div>
      <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
        <button onClick={() => saveSim({
          min_price: local.min_price,
          max_price: local.max_price,
          max_daily_change_pct: local.max_daily_change_pct,
          tick_interval_seconds: local.tick_interval_seconds,
          volatility: local.volatility,
          trend: local.trend,
        })} className="btn-primary px-5 py-2.5 rounded-lg text-sm" data-testid="berx-sim-save">Simülasyon Ayarlarını Kaydet</button>
      </div>
    </div>
  );
}

function ActivityLogsPanel() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const load = () => api.get("/admin/activity-logs?limit=200").then((r) => setRows(r.data || []));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const filtered = filter.trim()
    ? rows.filter((r) => (`${r.action} ${r.entity_type} ${r.admin_email} ${JSON.stringify(r.details||{})}`).toLowerCase().includes(filter.toLowerCase()))
    : rows;
  return (
    <div className="card-surface">
      <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-display text-lg text-[#0F172A]">Yönetici Etkinlik Kayıtları</div>
          <div className="text-xs text-[#64748B]">Tüm kritik admin işlemleri ve IP/kullanıcı ajan bilgisi (son 200 kayıt).</div>
        </div>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrele... (eylem, kullanıcı, IP)" className="input-field max-w-xs text-sm" data-testid="admin-activity-filter"/>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-[#64748B] text-left bg-[#F8FAFC]">
              <th className="px-4 py-2">Zaman</th>
              <th>Admin</th>
              <th>Eylem</th>
              <th>Tür</th>
              <th>Hedef</th>
              <th>IP</th>
              <th>Detay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.map((r) => (
              <tr key={r.log_id} className="hover:bg-[#F8FAFC]">
                <td className="px-4 py-2 text-xs text-[#64748B] tabular whitespace-nowrap">{new Date(r.created_at).toLocaleString("tr-TR")}</td>
                <td className="text-xs">{r.admin_email}</td>
                <td><span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-[#16A34A] font-medium">{r.action}</span></td>
                <td className="text-xs text-[#475569]">{r.entity_type}</td>
                <td className="text-xs tabular truncate max-w-[180px]">{r.entity_id || "—"}</td>
                <td className="text-xs tabular text-[#64748B]">{r.ip_address || "—"}</td>
                <td className="text-xs text-[#64748B] truncate max-w-[280px]" title={JSON.stringify(r.details || {})}>{r.details ? JSON.stringify(r.details).slice(0, 80) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-[#64748B]">Kayıt bulunamadı</div>}
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
  const chip = (s) => ({open:"text-[#D97706] bg-[#D97706]/10", answered:"text-[#3B82F6] bg-[#3B82F6]/10", closed:"text-[#16A34A] bg-[#16A34A]/10"}[s] || "text-[#64748B] bg-[#E2E8F0]");
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card-surface p-4">
        <div className="text-xs text-[#64748B] mb-3">Gelen Mesajlar ({rows.length})</div>
        <div className="space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin">
          {rows.map((m) => (
            <button key={m.message_id} onClick={() => setOpen(m)} className={`w-full text-left p-3 rounded-lg border ${open?.message_id===m.message_id?"border-[#16A34A] bg-[#FFFFFF]":"border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]"}`} data-testid={`admin-msg-${m.message_id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{m.subject}</div>
                  <div className="text-xs text-[#64748B]">{m.user_email} · {m.category}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${chip(m.status)}`}>{m.status}</span>
              </div>
              <div className="text-xs text-[#64748B] mt-1">{new Date(m.created_at).toLocaleString("tr-TR")}</div>
            </button>
          ))}
          {rows.length === 0 && <div className="text-sm text-[#64748B] py-6 text-center">Mesaj yok</div>}
        </div>
      </div>
      <div className="card-surface p-4">
        {!open ? (
          <div className="flex items-center justify-center h-full min-h-[300px] text-sm text-[#64748B]">Bir mesaj seçin</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-[#64748B]">{open.user_name} · {open.user_email}</div>
              <div className="font-display text-xl mt-1">{open.subject}</div>
              <div className="text-xs text-[#64748B] mt-1">{new Date(open.created_at).toLocaleString("tr-TR")} · {open.category}</div>
            </div>
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-4 whitespace-pre-wrap text-sm">{open.body}</div>
            {(open.replies || []).map((r, i) => (
              <div key={i} className="bg-[#16A34A]/5 border border-[#16A34A]/30 rounded p-3">
                <div className="text-[10px] text-[#16A34A] uppercase">Admin · {new Date(r.at).toLocaleString("tr-TR")}</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{r.body}</div>
              </div>
            ))}
            <textarea data-testid="admin-reply-body" value={reply} onChange={(e) => setReply(e.target.value)} className="input-field min-h-[100px]" placeholder="Yanıtınızı yazın..." />
            <div className="flex gap-2">
              <button onClick={() => send(false)} className="btn-primary px-4 py-2 rounded-lg text-sm" data-testid="admin-reply-send">Gönder</button>
              <button onClick={() => send(true)} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm hover:bg-[#FFFFFF]" data-testid="admin-reply-close">Gönder & Kapat</button>
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
      <div className="text-xs text-[#64748B]">Her ağ için ücret, min çekim, onay süresi ve aktif/pasif durumu ayarlayın.</div>
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
          <div className="font-display text-lg">{local.name} <span className="text-xs text-[#64748B]">({local.code})</span></div>
          <div className="text-xs text-[#64748B]">{local.description}</div>
        </div>
        <button onClick={() => onSave(local.code, { enabled: !local.enabled })} className={`px-3 py-1 rounded text-xs ${local.enabled?"bg-[#16A34A]/20 text-[#16A34A]":"bg-[#DC2626]/20 text-[#DC2626]"}`} data-testid={`net-toggle-${local.code}`}>
          {local.enabled ? "Aktif" : "Pasif"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] text-[#64748B] uppercase">Ücret (TRY)</label>
          <input data-testid={`net-fee-${local.code}`} type="number" step="0.01" className="input-field mt-1 tabular" value={local.fee_flat_try} onChange={(e) => setLocal({...local, fee_flat_try: Number(e.target.value)})}/>
        </div>
        <div>
          <label className="text-[10px] text-[#64748B] uppercase">Min Çekim (TRY)</label>
          <input data-testid={`net-min-${local.code}`} type="number" step="0.01" className="input-field mt-1 tabular" value={local.min_withdraw_try} onChange={(e) => setLocal({...local, min_withdraw_try: Number(e.target.value)})}/>
        </div>
        <div>
          <label className="text-[10px] text-[#64748B] uppercase">Onay (dk)</label>
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
        <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-2">Tarih</th><th>Gönderen</th><th>Alıcı</th><th>Coin</th><th className="text-right">Miktar</th><th className="text-right">Komisyon</th><th>Durum</th></tr></thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {rows.map((t) => (
            <tr key={t.transfer_id} className="tabular">
              <td className="px-4 py-2 text-xs">{new Date(t.created_at).toLocaleString("tr-TR")}</td>
              <td className="text-xs">{t.sender_email}</td>
              <td className="text-xs">{t.receiver_email}</td>
              <td>{t.symbol}</td>
              <td className="text-right">{t.amount.toFixed(6)}</td>
              <td className="text-right text-[#64748B]">{t.fee.toFixed(6)}</td>
              <td><span className="text-[10px] px-2 py-0.5 rounded-full text-[#16A34A] bg-[#16A34A]/10">{t.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-8 text-center text-sm text-[#64748B]">Henüz transfer yok</div>}
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
        <thead><tr className="text-xs text-[#64748B] text-left"><th className="px-4 py-2">Tarih</th><th>Kullanıcı</th><th>Coin</th><th>Ağ</th><th>Adres</th><th className="text-right">Miktar</th><th>Durum</th><th></th></tr></thead>
        <tbody className="divide-y divide-[#E2E8F0]">
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
                      <button onClick={() => act(w.withdrawal_id, "approved")} className="px-2 py-1 rounded bg-[#16A34A] text-white text-xs" data-testid={`cw-ok-${w.withdrawal_id}`}>Onayla</button>
                      <button onClick={() => act(w.withdrawal_id, "rejected")} className="px-2 py-1 rounded bg-[#DC2626] text-white text-xs" data-testid={`cw-no-${w.withdrawal_id}`}>Reddet</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <div className="p-8 text-center text-sm text-[#64748B]">Kripto çekim yok</div>}
    </div>
  );
}


function LiveChatStatsCard() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const load = () => api.get("/admin/live-chat/stats").then((r) => setStats(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);
  if (!stats) return null;
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-base text-[#0F172A]">Canlı Destek Özeti</div>
          <div className="text-xs text-[#64748B]">Anlık aktif sohbetler ve son mesajlar</div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-[#D97706] font-medium">Bekleyen: {stats.pending}</span>
          <span className="px-2.5 py-1 rounded-full bg-green-50 text-[#16A34A] font-medium">Açık: {stats.open}</span>
          <span className="px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569] font-medium">24s mesaj: {stats.messages_24h}</span>
        </div>
      </div>
      {(stats.recent || []).length === 0 ? (
        <div className="text-sm text-[#64748B] py-4 text-center">Son zamanlarda mesaj yok</div>
      ) : (
        <div className="divide-y divide-[#E2E8F0]">
          {(stats.recent || []).map((m) => (
            <div key={m.message_id} className="py-2 flex items-start gap-3 text-sm">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.sender==="admin"?"bg-blue-50 text-blue-700":"bg-green-50 text-[#16A34A]"}`}>{m.sender==="admin"?"Admin":"Kullanıcı"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#64748B]">{m.sender_label} · {new Date(m.created_at).toLocaleString("tr-TR")}</div>
                <div className="text-sm text-[#0F172A] truncate">{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveChatPanel() {
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState("all"); // all | open | pending | closed
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const loadList = async () => {
    try {
      const url = filter === "all" ? "/admin/live-chat/sessions" : `/admin/live-chat/sessions?status=${filter}`;
      const { data } = await api.get(url);
      setSessions(data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadList(); const t = setInterval(loadList, 8000); return () => clearInterval(t); }, [filter]);

  const openSession = async (sid) => {
    setActiveId(sid);
    try {
      const { data } = await api.get(`/admin/live-chat/sessions/${sid}`);
      setActive(data.session);
      setMessages(data.messages || []);
      loadList();
    } catch (e) { toast.error(errToStr(e)); }
  };

  // Poll active conversation
  useEffect(() => {
    if (!activeId) return;
    const tick = async () => {
      try {
        const { data } = await api.get(`/admin/live-chat/sessions/${activeId}`);
        setActive(data.session);
        setMessages(data.messages || []);
      } catch { /* ignore */ }
    };
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
  }, [activeId]);

  useEffect(() => { listRef.current?.scrollTo({ top: 999999, behavior: "smooth" }); }, [messages.length, activeId]);

  const reply = async (e) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setSending(true);
    try {
      await api.post(`/admin/live-chat/sessions/${activeId}/reply`, { body });
      setDraft("");
      // immediate refresh
      const { data } = await api.get(`/admin/live-chat/sessions/${activeId}`);
      setActive(data.session); setMessages(data.messages || []);
      loadList();
    } catch (e) { toast.error(errToStr(e)); } finally { setSending(false); }
  };

  const setStatus = async (status) => {
    if (!activeId) return;
    try {
      await api.patch(`/admin/live-chat/sessions/${activeId}/status`, { status });
      toast.success("Durum güncellendi");
      loadList();
      openSession(activeId);
    } catch (e) { toast.error(errToStr(e)); }
  };

  const statusChip = (s) => ({
    open: "bg-green-50 text-[#16A34A]",
    pending: "bg-amber-50 text-[#D97706]",
    closed: "bg-[#F1F5F9] text-[#475569]",
  }[s] || "bg-[#F1F5F9] text-[#475569]");

  return (
    <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[520px]">
      <div className="card-surface lg:col-span-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0] flex gap-1 flex-wrap">
          {[["all","Tümü"],["pending","Bekleyen"],["open","Açık"],["closed","Kapalı"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 rounded-full text-xs font-medium ${filter===k?"bg-[#16A34A] text-white":"text-[#475569] hover:bg-[#F1F5F9]"}`} data-testid={`livechat-filter-${k}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="p-6 text-sm text-[#64748B] text-center">Sohbet yok</div>
          ) : sessions.map((s) => (
            <button key={s.session_id} onClick={() => openSession(s.session_id)} className={`w-full text-left p-3 border-b border-[#E2E8F0] hover:bg-[#F8FAFC] ${activeId===s.session_id?"bg-[#F0FDF4]":""}`} data-testid={`livechat-row-${s.session_id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#0F172A] truncate">
                    {s.name || "Ziyaretçi"}
                    {s.user_id && <span className="ml-1 text-[10px] text-[#16A34A] font-semibold">[ÜYE]</span>}
                  </div>
                  <div className="text-xs text-[#64748B] truncate">{s.user_email || s.contact || s.visitor_id}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusChip(s.status)}`}>{s.status}</span>
                  {(s.unread_admin_count || 0) > 0 && (
                    <span className="bg-[#DC2626] text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center font-bold">{s.unread_admin_count}</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-[#94A3B8] mt-1">{new Date(s.last_message_at).toLocaleString("tr-TR")}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card-surface lg:col-span-2 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-[#64748B]">Bir sohbet seçin</div>
        ) : (
          <>
            <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="font-display text-base text-[#0F172A] truncate">{active.name || "Ziyaretçi"} {active.user_id && <span className="ml-1 text-[10px] text-[#16A34A] font-semibold">[ÜYE]</span>}</div>
                <div className="text-xs text-[#64748B] truncate">{active.user_email || active.contact || "—"} · IP {active.ip_address || "—"}</div>
                <div className="text-[10px] text-[#94A3B8] truncate" title={active.user_agent}>UA: {(active.user_agent||"—").slice(0, 80)}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">Sayfa: {active.page_url || "—"}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusChip(active.status)}`}>{active.status}</span>
                {active.status !== "closed" ? (
                  <button onClick={() => setStatus("closed")} className="text-[10px] px-2 py-1 rounded border border-[#E2E8F0] hover:bg-[#F8FAFC]" data-testid="livechat-close-btn">Kapat</button>
                ) : (
                  <button onClick={() => setStatus("open")} className="text-[10px] px-2 py-1 rounded border border-[#E2E8F0] hover:bg-[#F8FAFC]" data-testid="livechat-reopen-btn">Yeniden Aç</button>
                )}
              </div>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 bg-[#F7F9FC]">
              {messages.length === 0 ? (
                <div className="text-sm text-[#64748B] text-center py-8">Henüz mesaj yok</div>
              ) : messages.map((m) => {
                const mine = m.sender === "admin";
                return (
                  <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-blue-50 text-[#0F172A] border border-blue-100" : "bg-white border border-[#E2E8F0] text-[#0F172A]"}`}>
                      <div className={`text-[10px] font-semibold mb-0.5 ${mine?"text-blue-700":"text-[#16A34A]"}`}>{mine?"Sen (Admin)":m.sender_label}</div>
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="text-[10px] mt-1 text-[#94A3B8]">{new Date(m.created_at).toLocaleString("tr-TR")}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={reply} className="p-3 border-t border-[#E2E8F0] bg-white flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(); } }}
                placeholder="Yanıtınızı yazın..."
                rows={1}
                className="input-field text-sm flex-1 resize-none max-h-32"
                data-testid="livechat-reply-input"
                disabled={active.status === "closed"}
              />
              <button type="submit" disabled={sending || !draft.trim() || active.status === "closed"} className="btn-primary px-4 rounded-lg text-sm disabled:opacity-50" data-testid="livechat-reply-send">
                {sending ? "..." : "Gönder"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}


function PlatformAddressesPanel() {
  const [rows, setRows] = useState([]);
  const [networks, setNetworks] = useState([]);
  const COINS = ["BTC","ETH","USDT","BNB","SOL","XRP","ADA","DOGE","TRX","AVAX","MATIC","LINK","DOT","LTC","SHIB","TON","BERX","UNI","AAVE","ATOM","NEAR","FIL","ARB","OP","INJ"];
  const [form, setForm] = useState({ symbol: "USDT", network: "TRC20", address: "", warning: "", min_deposit: 0, deposit_enabled: true, withdraw_enabled: true });
  const [edit, setEdit] = useState(null);

  const load = () => {
    api.get("/admin/platform-addresses").then((r) => setRows(r.data || []));
    api.get("/networks").then((r) => setNetworks(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e?.preventDefault();
    try {
      await api.put("/admin/platform-addresses", {
        ...form,
        symbol: form.symbol.toUpperCase(),
        network: form.network.toUpperCase(),
        min_deposit: Number(form.min_deposit || 0),
      });
      toast.success("Adres kaydedildi");
      setEdit(null);
      setForm({ symbol: "USDT", network: "TRC20", address: "", warning: "", min_deposit: 0, deposit_enabled: true, withdraw_enabled: true });
      load();
    } catch (e) { toast.error(errToStr(e)); }
  };

  const remove = async (r) => {
    if (!window.confirm(`${r.symbol}/${r.network} adresini silmek istediğine emin misin?`)) return;
    try {
      await api.delete(`/admin/platform-addresses/${r.symbol}/${r.network}`);
      toast.success("Silindi");
      load();
    } catch (e) { toast.error(errToStr(e)); }
  };

  const startEdit = (r) => {
    setEdit(`${r.symbol}:${r.network}`);
    setForm({ symbol: r.symbol, network: r.network, address: r.address, warning: r.warning || "", min_deposit: r.min_deposit || 0, deposit_enabled: r.deposit_enabled !== false, withdraw_enabled: r.withdraw_enabled !== false });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <form onSubmit={save} className="card-surface p-5 lg:col-span-1 space-y-3" data-testid="addr-form">
        <div className="font-display text-base text-[#0F172A]">{edit ? `Adresi Düzenle: ${edit}` : "Yeni Coin + Ağ Adresi"}</div>
        <div>
          <label className="text-xs text-[#64748B]">Coin</label>
          <select className="input-field text-sm mt-1" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} data-testid="addr-symbol">
            {COINS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Network</label>
          <select className="input-field text-sm mt-1" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} data-testid="addr-network">
            {networks.map((n) => <option key={n.code} value={n.code}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Deposit Adresi</label>
          <input className="input-field text-sm mt-1 font-mono" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="0x... veya TX adresi" data-testid="addr-address"/>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Uyarı / Açıklama</label>
          <textarea className="input-field text-sm mt-1 min-h-[60px]" value={form.warning} onChange={(e) => setForm({ ...form, warning: e.target.value })} placeholder="Örn: Yalnızca TRC20 ile gönderim yapın."/>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Min Yatırma ({form.symbol})</label>
          <input type="number" step="any" min="0" className="input-field text-sm mt-1 tabular" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: e.target.value })}/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-xs text-[#475569]">
            <input type="checkbox" checked={form.deposit_enabled} onChange={(e) => setForm({ ...form, deposit_enabled: e.target.checked })}/> Yatırma aktif
          </label>
          <label className="flex items-center gap-2 text-xs text-[#475569]">
            <input type="checkbox" checked={form.withdraw_enabled} onChange={(e) => setForm({ ...form, withdraw_enabled: e.target.checked })}/> Çekim aktif
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-sm flex-1" data-testid="addr-save">Kaydet</button>
          {edit && <button type="button" onClick={() => { setEdit(null); setForm({ symbol: "USDT", network: "TRC20", address: "", warning: "", min_deposit: 0, deposit_enabled: true, withdraw_enabled: true }); }} className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm">İptal</button>}
        </div>
      </form>

      <div className="card-surface lg:col-span-2 overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className="font-display text-base text-[#0F172A]">Kayıtlı Coin-Ağ Adresleri</div>
          <div className="text-xs text-[#64748B]">Toplam {rows.length} kayıt · Kullanıcılar bu adresleri görür</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr className="text-xs text-[#64748B] text-left">
                <th className="px-4 py-2">Coin</th>
                <th>Ağ</th>
                <th>Adres</th>
                <th>Min</th>
                <th>D / W</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {rows.map((r) => (
                <tr key={`${r.symbol}-${r.network}`} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-2 text-sm font-medium">{r.symbol}</td>
                  <td className="text-xs text-[#475569]">{r.network}</td>
                  <td className="font-mono text-[10px] text-[#0F172A] truncate max-w-[260px]" title={r.address}>{r.address}</td>
                  <td className="text-xs tabular">{r.min_deposit ?? 0}</td>
                  <td className="text-[10px]">
                    <span className={`px-1.5 py-0.5 rounded mr-1 ${r.deposit_enabled?"bg-green-50 text-[#16A34A]":"bg-red-50 text-[#DC2626]"}`}>D:{r.deposit_enabled?"On":"Off"}</span>
                    <span className={`px-1.5 py-0.5 rounded ${r.withdraw_enabled?"bg-green-50 text-[#16A34A]":"bg-red-50 text-[#DC2626]"}`}>W:{r.withdraw_enabled?"On":"Off"}</span>
                  </td>
                  <td className="text-right pr-3">
                    <button onClick={() => startEdit(r)} className="text-xs text-[#16A34A] hover:underline mr-3" data-testid={`addr-edit-${r.symbol}-${r.network}`}>Düzenle</button>
                    <button onClick={() => remove(r)} className="text-xs text-[#DC2626] hover:underline" data-testid={`addr-del-${r.symbol}-${r.network}`}>Sil</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#64748B]">Henüz adres tanımlanmadı. Soldaki formdan ekleyin.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

