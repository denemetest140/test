// Coinberx — Deposit (TL + Kripto)
// Sol: işlem formu · Sağ: özet/bilgilendirme kartı. Referans kodu kaldırıldı.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatTRY, errToStr } from "../lib/api";
import { Copy, Upload, ArrowLineDown, WarningCircle, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { CoinIcon } from "../lib/coinIcons.jsx";
import { usePageSeo } from "../contexts/SettingsContext";

const COINS = ["BTC","ETH","USDT","BNB","SOL","XRP","ADA","DOGE","TRX","AVAX","MATIC","LINK","DOT","LTC","SHIB","TON","BERX"];

export default function Deposit() {
  usePageSeo("deposit");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "try"; // try | crypto

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto anim-fade-up">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <div className="text-xs text-[#64748B]">Coinberx / Cüzdan / Yatır</div>
          <h1 className="font-display text-2xl lg:text-3xl text-[#0F172A] mt-1">Para Yatırma</h1>
        </div>
        <Link to="/withdraw" className="text-sm text-[#16A34A] hover:underline" data-testid="goto-withdraw">Para çekmek mi istiyorsun?</Link>
      </div>

      <div className="border-b border-[#E2E8F0] mb-6 flex">
        <button
          onClick={() => setParams({ tab: "try" })}
          className={`tab-btn ${tab === "try" ? "active" : ""}`}
          data-testid="deposit-tab-try"
        >TL Yatır</button>
        <button
          onClick={() => setParams({ tab: "crypto" })}
          className={`tab-btn ${tab === "crypto" ? "active" : ""}`}
          data-testid="deposit-tab-crypto"
        >Kripto Yatır</button>
      </div>

      {tab === "try" ? <TryDeposit /> : <CryptoDeposit />}
    </div>
  );
}

function TryDeposit() {
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    api.get("/deposits/bank-info").then((r) => setInfo(r.data)).catch(() => {});
    api.get("/deposits").then((r) => setList(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const copy = (v) => { if (!v) return; navigator.clipboard.writeText(v); toast.success("Kopyalandı"); };

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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="card-surface p-6 lg:col-span-2 space-y-5" data-testid="deposit-form">
        <div>
          <label className="text-xs text-[#64748B]">Yatırılacak Tutar (TL)</label>
          <input data-testid="deposit-amount" type="number" min={50} step="0.01" className="input-field mt-1 tabular text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min 50 TL"/>
          <div className="flex gap-2 mt-2">
            {[100,500,1000,5000,10000].map((q) => (
              <button key={q} type="button" onClick={() => setAmount(String(q))} className="text-xs px-2.5 py-1 rounded bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]">{formatTRY(q,0)}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-[#64748B] mb-2">Platform Banka Bilgileri (havale/EFT yapın)</div>
          <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg divide-y divide-[#E2E8F0]">
            {[
              ["Banka", info?.bank_name],
              ["Alıcı", info?.recipient],
              ["IBAN", info?.iban],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[10px] text-[#64748B] uppercase">{k}</div>
                  <div className="tabular text-sm truncate" data-testid={`bank-${k}`}>{v || "-"}</div>
                </div>
                <button type="button" onClick={() => copy(v)} className="p-2 hover:bg-white rounded" data-testid={`copy-${k}`} aria-label="Kopyala">
                  <Copy size={14} className="text-[#64748B]"/>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#64748B]">Dekont (PNG/JPG/PDF)</label>
          <label className="mt-1 flex items-center gap-3 cursor-pointer bg-[#F7F9FC] border border-dashed border-[#E2E8F0] hover:border-[#16A34A] rounded-lg px-4 py-4 transition">
            <Upload size={20} className="text-[#16A34A]"/>
            <span className="text-sm flex-1 truncate">{file ? file.name : "Dekont seç veya sürükle (8MB max)"}</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} data-testid="deposit-receipt"/>
          </label>
        </div>

        <button disabled={loading} className="btn-primary w-full py-3 rounded-lg text-sm font-semibold" data-testid="deposit-submit">
          {loading ? "Talep gönderiliyor..." : "Yatırma Talebi Oluştur"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] uppercase font-medium tracking-wide">Nasıl Çalışır?</div>
          <ol className="mt-3 space-y-3 text-sm text-[#0F172A]">
            <Step n={1} title="Tutarı belirle" desc="Yatırmak istediğiniz miktarı yazın (min 50 TL)."/>
            <Step n={2} title="IBAN'a havale yap" desc="Yanda görünen Coinberx IBAN'ına aynı tutarda havale veya EFT gönderin."/>
            <Step n={3} title="Dekont yükle" desc="Bankanızdan aldığınız dekontu PDF veya görsel olarak yükleyin."/>
            <Step n={4} title="Onay bekle" desc="Talebiniz admin onayından sonra hesabınıza otomatik yansır. Ortalama 5-15 dk."/>
          </ol>
        </div>
        <div className="card-surface p-5 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2 text-amber-900 text-sm">
            <WarningCircle size={20} weight="fill" className="flex-shrink-0 mt-0.5"/>
            <div>
              <div className="font-semibold">Önemli</div>
              <div className="text-xs mt-1">Yalnızca KENDİ adınıza kayıtlı hesaptan gönderim yapın. Üçüncü şahıslar adına yapılan transferler reddedilir.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface p-5 lg:col-span-3">
        <div className="text-xs text-[#64748B] uppercase font-medium tracking-wide mb-3">Geçmiş</div>
        <DepositHistory list={list}/>
      </div>
    </div>
  );
}

function CryptoDeposit() {
  const [symbol, setSymbol] = useState("USDT");
  const [networks, setNetworks] = useState([]);
  const [network, setNetwork] = useState(null);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [amount, setAmount] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/coins/${symbol}/networks`).then((r) => {
      const arr = r.data || [];
      setNetworks(arr);
      setNetwork(arr[0]?.code || null);
      setInfo(null); setError(null);
    });
  }, [symbol]);

  useEffect(() => {
    if (!symbol || !network) return;
    setInfo(null); setError(null);
    api.get(`/wallet/deposit-address?symbol=${symbol}&network=${network}`)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(errToStr(e)));
  }, [symbol, network]);

  useEffect(() => {
    api.get("/wallet/crypto-deposits").then((r) => setHistory(r.data || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!info?.address || !txHash.trim()) { toast.error("Tx hash zorunlu"); return; }
    setLoading(true);
    try {
      await api.post("/wallet/crypto-deposits", { symbol, network, tx_hash: txHash.trim(), amount: amount ? Number(amount) : undefined });
      toast.success("Yatırma talebi gönderildi. Admin onayı sonrası bakiyenize yansıyacak.");
      setTxHash(""); setAmount("");
      api.get("/wallet/crypto-deposits").then((r) => setHistory(r.data || []));
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  const copy = (v) => { if (!v) return; navigator.clipboard.writeText(v); toast.success("Kopyalandı"); };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="card-surface p-6 lg:col-span-2 space-y-5" data-testid="crypto-deposit-form">
        <div>
          <label className="text-xs text-[#64748B]">1. Coin Seç</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
            {COINS.map((s) => (
              <button key={s} type="button" onClick={() => setSymbol(s)} className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition ${symbol===s?"border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]":"border-[#E2E8F0] hover:border-[#CBD5E1] text-[#475569]"}`} data-testid={`coin-${s}`}>
                <CoinIcon symbol={s} size={24}/>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#64748B]">2. Network Seç</label>
          {networks.length === 0 ? (
            <div className="mt-2 p-3 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg text-sm text-[#64748B]">Bu coin için henüz aktif network tanımlanmamış.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {networks.map((n) => (
                <button
                  key={n.code}
                  type="button"
                  onClick={() => setNetwork(n.code)}
                  className={`text-left p-3 rounded-lg border transition ${network===n.code?"border-[#16A34A] bg-[#F0FDF4]":"border-[#E2E8F0] hover:border-[#CBD5E1]"}`}
                  data-testid={`network-${n.code}`}
                >
                  <div className="text-sm font-medium text-[#0F172A]">{n.name}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Onay süresi ~{n.confirm_minutes ?? 0} dk · Fee {formatTRY(n.fee_flat_try ?? 0, 2)}</div>
                  {!n.platform_address && <div className="text-[10px] text-[#D97706] mt-1">⚠ Adres henüz tanımlanmamış</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {info?.address && (
          <div>
            <label className="text-xs text-[#64748B]">3. Yatırma Adresi</label>
            <div className="mt-1 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-4">
              <div className="text-[10px] text-[#64748B] uppercase">{symbol} · {network}</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 tabular text-sm break-all text-[#0F172A]" data-testid="deposit-address">{info.address}</code>
                <button type="button" onClick={() => copy(info.address)} className="p-2 rounded hover:bg-white" aria-label="Kopyala" data-testid="deposit-address-copy"><Copy size={14}/></button>
              </div>
              {info.warning && <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">{info.warning}</div>}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Info label="Min yatırma" value={`${info.min_deposit ?? 0} ${symbol}`}/>
                <Info label="Onay süresi" value={`~${info.confirm_minutes ?? 0} dk`}/>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-[#DC2626] flex items-start gap-2">
            <WarningCircle size={18} weight="fill" className="flex-shrink-0 mt-0.5"/>
            <span data-testid="deposit-error">{error}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#64748B]">İşlem Hash (Tx Hash) *</label>
            <input data-testid="tx-hash" type="text" className="input-field mt-1 font-mono text-xs" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x... veya blockchain tx id"/>
          </div>
          <div>
            <label className="text-xs text-[#64748B]">Tutar ({symbol})</label>
            <input data-testid="tx-amount" type="number" step="any" className="input-field mt-1 tabular" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Gönderilen miktar"/>
          </div>
        </div>

        <button disabled={loading || !info?.address || !txHash.trim()} className="btn-primary w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="crypto-deposit-submit">
          {loading ? "Gönderiliyor..." : "Talep Oluştur"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] uppercase font-medium tracking-wide">Nasıl Çalışır?</div>
          <ol className="mt-3 space-y-3 text-sm text-[#0F172A]">
            <Step n={1} title="Coin & ağ seç" desc="Yatıracağınız coini ve aynı ağı seçin."/>
            <Step n={2} title="Adrese gönder" desc="Listelenen Coinberx adresine kendi cüzdanınızdan transfer yapın."/>
            <Step n={3} title="Tx hash gir" desc="Cüzdanınızın gösterdiği işlem hash'ini buraya yapıştırın."/>
            <Step n={4} title="Onay bekle" desc="Onaylar tamamlandıktan sonra admin onayıyla bakiyenize geçer."/>
          </ol>
        </div>
        <div className="card-surface p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-2 text-red-900 text-sm">
            <WarningCircle size={20} weight="fill" className="flex-shrink-0 mt-0.5 text-red-600"/>
            <div>
              <div className="font-semibold">Yanlış ağ uyarısı</div>
              <div className="text-xs mt-1">Yanlış ağa gönderilen kripto KAYBOLABİLİR. Lütfen seçtiğiniz ağı ve adresi mutlaka doğrulayın.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-surface p-5 lg:col-span-3">
        <div className="text-xs text-[#64748B] uppercase font-medium tracking-wide mb-3">Kripto Yatırma Geçmişi</div>
        {history.length === 0 ? (
          <div className="text-sm text-[#64748B] py-4 text-center">Henüz kripto yatırma yapılmamış</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[#64748B] text-left bg-[#F7F9FC]">
                <th className="px-3 py-2">Tarih</th><th>Coin</th><th>Ağ</th><th>Tx Hash</th><th>Tutar</th><th>Durum</th>
              </tr></thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {history.map((d) => (
                  <tr key={d.deposit_id || d.tx_hash} className="hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2 text-xs text-[#64748B]">{new Date(d.created_at).toLocaleString("tr-TR")}</td>
                    <td className="flex items-center gap-1.5 py-2"><CoinIcon symbol={d.symbol} size={18}/> {d.symbol}</td>
                    <td className="text-xs">{d.network}</td>
                    <td className="font-mono text-[10px] text-[#475569] truncate max-w-[120px]" title={d.tx_hash}>{d.tx_hash}</td>
                    <td className="tabular text-xs">{d.amount ?? "-"}</td>
                    <td><StatusBadge status={d.status}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#16A34A]/15 text-[#16A34A] flex items-center justify-center text-xs font-bold">{n}</span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-[#64748B] mt-0.5">{desc}</div>
      </div>
    </li>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-white rounded p-2">
      <div className="text-[10px] text-[#64748B] uppercase">{label}</div>
      <div className="text-xs tabular text-[#0F172A]">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { l: "Beklemede", c: "text-[#D97706] bg-amber-50", Icon: Clock },
    approved: { l: "Onaylandı", c: "text-[#16A34A] bg-green-50", Icon: CheckCircle },
    rejected: { l: "Reddedildi", c: "text-[#DC2626] bg-red-50", Icon: XCircle },
  };
  const m = map[status] || { l: status, c: "text-[#64748B] bg-[#F1F5F9]", Icon: Clock };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${m.c}`}>
      <m.Icon size={10} weight="fill"/> {m.l}
    </span>
  );
}

function DepositHistory({ list }) {
  if (list.length === 0) return <div className="text-sm text-[#64748B] py-4 text-center">Henüz talep yok</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-[#64748B] text-left bg-[#F7F9FC]">
          <th className="px-3 py-2">Tarih</th><th>Tutar</th><th>Durum</th>
        </tr></thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {list.map((d) => (
            <tr key={d.deposit_id} className="hover:bg-[#F8FAFC]">
              <td className="px-3 py-2 text-xs text-[#64748B]">{new Date(d.created_at).toLocaleString("tr-TR")}</td>
              <td className="tabular text-sm">{formatTRY(d.amount)}</td>
              <td><StatusBadge status={d.status}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
