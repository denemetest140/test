// Coinberx — Withdraw (TL + Kripto)
// Sol: form · Sağ: özet/uyarı. Kripto çekimi network-aware.
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";
import { WarningCircle, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";
import { CoinIcon } from "../lib/coinIcons.jsx";
import { usePageSeo } from "../contexts/SettingsContext";

const COINS = ["BTC","ETH","USDT","BNB","SOL","XRP","ADA","DOGE","TRX","AVAX","MATIC","LINK","DOT","LTC","SHIB","TON","BERX"];

export default function Withdraw() {
  usePageSeo("withdraw");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "try";
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto anim-fade-up">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <div className="text-xs text-[#64748B]">Coinberx / Cüzdan / Çek</div>
          <h1 className="font-display text-2xl lg:text-3xl text-[#0F172A] mt-1">Para Çekme</h1>
        </div>
        <Link to="/deposit" className="text-sm text-[#16A34A] hover:underline">Para yatırmak mı istiyorsun?</Link>
      </div>
      <div className="border-b border-[#E2E8F0] mb-6 flex">
        <button onClick={() => setParams({ tab: "try" })} className={`tab-btn ${tab==="try"?"active":""}`} data-testid="withdraw-tab-try">TL Çek</button>
        <button onClick={() => setParams({ tab: "crypto" })} className={`tab-btn ${tab==="crypto"?"active":""}`} data-testid="withdraw-tab-crypto">Kripto Çek</button>
      </div>
      {tab === "try" ? <TryWithdraw/> : <CryptoWithdraw/>}
    </div>
  );
}

function TryWithdraw() {
  const [form, setForm] = useState({ amount: "", iban: "", bank_name: "", account_holder: "" });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [feeRate, setFeeRate] = useState(0);
  const load = () => {
    api.get("/withdrawals").then((r) => setList(r.data || [])).catch(() => {});
    api.get("/wallet").then((r) => setBalance(r.data?.assets?.find((a) => a.symbol === "TRY")?.amount || 0));
    api.get("/settings").then((r) => setFeeRate(r.data?.withdrawal_fee_rate || 0)).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const amt = Number(form.amount || 0);
  const fee = Math.max(0, amt * feeRate);
  const net = Math.max(0, amt - fee);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/withdrawals", { ...form, amount: amt });
      toast.success("Çekim talebi oluşturuldu");
      setForm({ amount: "", iban: "", bank_name: "", account_holder: "" });
      load();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="card-surface p-6 lg:col-span-2 space-y-4" data-testid="withdraw-form">
        <div className="flex items-center justify-between bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3">
          <span className="text-xs text-[#64748B]">Çekilebilir Bakiye</span>
          <span className="tabular text-base font-semibold text-[#0F172A]" data-testid="withdraw-balance">{formatTRY(balance)}</span>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Tutar (TL)</label>
          <input data-testid="wd-amount" type="number" step="0.01" className="input-field mt-1 tabular" required value={form.amount} onChange={set("amount")} />
          <button type="button" onClick={() => setForm({...form, amount: String(balance)})} className="mt-2 text-xs text-[#16A34A] hover:underline">Maks ({formatTRY(balance,2)})</button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#64748B]">IBAN</label>
            <input data-testid="wd-iban" className="input-field mt-1 tabular uppercase" required maxLength={34} value={form.iban} onChange={set("iban")} placeholder="TR00 0000 ..."/>
          </div>
          <div>
            <label className="text-xs text-[#64748B]">Banka Adı</label>
            <input data-testid="wd-bank" className="input-field mt-1" required value={form.bank_name} onChange={set("bank_name")}/>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#64748B]">Hesap Sahibi (Adınız Soyadınız)</label>
          <input data-testid="wd-holder" className="input-field mt-1" required value={form.account_holder} onChange={set("account_holder")}/>
        </div>

        <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[10px] text-[#64748B] uppercase">Tutar</div><div className="tabular text-sm">{formatTRY(amt,2)}</div></div>
          <div><div className="text-[10px] text-[#64748B] uppercase">Komisyon</div><div className="tabular text-sm text-[#DC2626]">-{formatTRY(fee,2)}</div></div>
          <div><div className="text-[10px] text-[#64748B] uppercase">Net Alacak</div><div className="tabular text-sm text-[#16A34A] font-semibold">{formatTRY(net,2)}</div></div>
        </div>

        <button disabled={loading} className="btn-primary w-full py-3 rounded-lg text-sm font-semibold" data-testid="wd-submit">{loading ? "Talep gönderiliyor..." : "Çekim Talebi Oluştur"}</button>
      </form>

      <div className="space-y-4">
        <div className="card-surface p-5 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2 text-amber-900 text-sm">
            <WarningCircle size={20} weight="fill" className="flex-shrink-0 mt-0.5"/>
            <div>
              <div className="font-semibold">Bilgi</div>
              <div className="text-xs mt-1">KYC onayınız olmalı. Üçüncü kişi IBAN'ına çekim YAPILMAZ; yalnızca kendi adınıza kayıtlı hesap.</div>
            </div>
          </div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] uppercase mb-3">Süreç</div>
          <ol className="text-sm text-[#0F172A] space-y-2 list-decimal list-inside">
            <li>Tutar ve IBAN bilgilerini girin</li>
            <li>Talep oluşturun</li>
            <li>Admin onayı sonrası havale yapılır</li>
            <li>Bankanıza ulaşması bankaya göre değişir</li>
          </ol>
        </div>
      </div>

      <div className="card-surface p-5 lg:col-span-3">
        <div className="text-xs text-[#64748B] uppercase mb-3">TL Çekim Geçmişi</div>
        {list.length === 0 ? <div className="text-sm text-[#64748B] py-4 text-center">Henüz çekim yok</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[#64748B] text-left bg-[#F7F9FC]"><th className="px-3 py-2">Tarih</th><th>Tutar</th><th>IBAN</th><th>Durum</th></tr></thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {list.map((w) => (
                  <tr key={w.withdrawal_id} className="hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2 text-xs text-[#64748B]">{new Date(w.created_at).toLocaleString("tr-TR")}</td>
                    <td className="tabular text-sm">{formatTRY(w.amount)}</td>
                    <td className="text-xs tabular text-[#475569]">{w.iban}</td>
                    <td><StatusBadge status={w.status}/></td>
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

function CryptoWithdraw() {
  const [symbol, setSymbol] = useState("USDT");
  const [networks, setNetworks] = useState([]);
  const [network, setNetwork] = useState(null);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    api.get("/wallet").then((r) => setWallet(r.data));
    api.get("/wallet/crypto-withdrawals").then((r) => setHistory(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/coins/${symbol}/networks`).then((r) => {
      const arr = r.data || [];
      setNetworks(arr);
      setNetwork(arr[0]?.code || null);
    });
  }, [symbol]);

  const sel = networks.find((n) => n.code === network);
  const bal = wallet?.assets?.find((a) => a.symbol === symbol)?.amount || 0;
  const amt = Number(amount || 0);
  // Fee için coin başına yaklaşık fee_flat_try / coin TRY fiyatı
  const coinTry = wallet?.assets?.find((a) => a.symbol === symbol)?.try_value / Math.max(1e-9, bal) || 0;
  const feeCoin = coinTry > 0 ? (sel?.fee_flat_try || 0) / coinTry : 0;
  const net = Math.max(0, amt - feeCoin);
  const minCoin = coinTry > 0 ? (sel?.min_withdraw_try || 0) / coinTry : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!sel) { toast.error("Network seçin"); return; }
    if (!address.trim()) { toast.error("Adres zorunlu"); return; }
    if (amt <= 0) { toast.error("Geçerli tutar girin"); return; }
    setLoading(true);
    try {
      await api.post("/wallet/crypto-withdrawals", { symbol, network, address: address.trim(), amount: amt });
      toast.success("Çekim talebiniz alındı, admin onayı bekleniyor.");
      setAddress(""); setAmount("");
      api.get("/wallet/crypto-withdrawals").then((r) => setHistory(r.data || []));
      api.get("/wallet").then((r) => setWallet(r.data));
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="card-surface p-6 lg:col-span-2 space-y-5" data-testid="crypto-withdraw-form">
        <div>
          <label className="text-xs text-[#64748B]">1. Coin Seç</label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-2">
            {COINS.map((s) => (
              <button key={s} type="button" onClick={() => setSymbol(s)} className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition ${symbol===s?"border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]":"border-[#E2E8F0] hover:border-[#CBD5E1] text-[#475569]"}`}>
                <CoinIcon symbol={s} size={24}/>
                {s}
              </button>
            ))}
          </div>
          <div className="text-xs text-[#64748B] mt-2">Bakiye: <span className="tabular text-[#0F172A]" data-testid="crypto-balance">{bal.toLocaleString("tr-TR", {maximumFractionDigits:8})}</span> {symbol}</div>
        </div>

        <div>
          <label className="text-xs text-[#64748B]">2. Network Seç</label>
          {networks.length === 0 ? (
            <div className="mt-2 p-3 bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg text-sm text-[#64748B]">Bu coin için aktif network yok.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {networks.map((n) => (
                <button key={n.code} type="button" onClick={() => setNetwork(n.code)} className={`text-left p-3 rounded-lg border transition ${network===n.code?"border-[#16A34A] bg-[#F0FDF4]":"border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
                  <div className="text-sm font-medium text-[#0F172A]">{n.name}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Fee {formatTRY(n.fee_flat_try ?? 0,2)} · Min {formatTRY(n.min_withdraw_try ?? 0,2)} · ~{n.confirm_minutes ?? 0} dk</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-[#64748B]">3. Alıcı Adresi</label>
          <input data-testid="wd-address" className="input-field mt-1 font-mono text-xs" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x... veya blockchain adresi"/>
          <div className="text-[10px] text-amber-700 mt-1 flex items-center gap-1"><WarningCircle size={12}/> Adresi mutlaka doğrulayın. Yanlış ağa/adrese gönderilen kripto kaybolabilir.</div>
        </div>

        <div>
          <label className="text-xs text-[#64748B]">4. Çekim Miktarı ({symbol})</label>
          <input data-testid="wd-cw-amount" type="number" step="any" min={0} className="input-field mt-1 tabular" value={amount} onChange={(e) => setAmount(e.target.value)}/>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setAmount(String(bal))} className="text-[10px] text-[#16A34A] hover:underline">Maks</button>
            <button type="button" onClick={() => setAmount(String(bal/2))} className="text-[10px] text-[#16A34A] hover:underline">50%</button>
          </div>
        </div>

        <div className="bg-[#F7F9FC] border border-[#E2E8F0] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <Box label="Min Çekim" value={`${minCoin.toFixed(8)} ${symbol}`}/>
          <Box label="Network Fee" value={`${feeCoin.toFixed(8)} ${symbol}`}/>
          <Box label="Net Alacak" value={`${net.toFixed(8)} ${symbol}`}/>
          <Box label="Onay" value={`~${sel?.confirm_minutes ?? 0} dk`}/>
        </div>

        <button disabled={loading || !network || !address.trim() || amt<=0} className="btn-primary w-full py-3 rounded-lg text-sm font-semibold disabled:opacity-50" data-testid="crypto-wd-submit">
          {loading ? "Gönderiliyor..." : "Çekim Talebi Oluştur"}
        </button>
      </form>

      <div className="space-y-4">
        <div className="card-surface p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-2 text-red-900 text-sm">
            <WarningCircle size={20} weight="fill" className="flex-shrink-0 mt-0.5 text-red-600"/>
            <div>
              <div className="font-semibold">Önemli</div>
              <div className="text-xs mt-1">Adres ve ağ EŞLEŞMELİ. Yanlış ağa gönderilen kripto kaybolur ve geri alınamaz.</div>
            </div>
          </div>
        </div>
        <div className="card-surface p-5">
          <div className="text-xs text-[#64748B] uppercase mb-3">Süreç</div>
          <ol className="text-sm text-[#0F172A] space-y-2 list-decimal list-inside">
            <li>Coin, ağ ve adresi seçin</li>
            <li>Talebi gönderin (bakiye locked olur)</li>
            <li>Admin onayı bekleyin</li>
            <li>Onay sonrası transfer başlatılır</li>
          </ol>
        </div>
      </div>

      <div className="card-surface p-5 lg:col-span-3">
        <div className="text-xs text-[#64748B] uppercase mb-3">Kripto Çekim Geçmişi</div>
        {history.length === 0 ? <div className="text-sm text-[#64748B] py-4 text-center">Henüz kripto çekim yok</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-[#64748B] text-left bg-[#F7F9FC]">
                <th className="px-3 py-2">Tarih</th><th>Coin</th><th>Ağ</th><th>Adres</th><th>Tutar</th><th>Durum</th>
              </tr></thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {history.map((w) => (
                  <tr key={w.withdrawal_id} className="hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2 text-xs text-[#64748B]">{new Date(w.created_at).toLocaleString("tr-TR")}</td>
                    <td className="flex items-center gap-1.5 py-2"><CoinIcon symbol={w.symbol} size={18}/> {w.symbol}</td>
                    <td className="text-xs">{w.network}</td>
                    <td className="font-mono text-[10px] text-[#475569] truncate max-w-[140px]" title={w.address}>{w.address}</td>
                    <td className="tabular text-xs">{w.amount}</td>
                    <td><StatusBadge status={w.status}/></td>
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

function Box({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-[#64748B] uppercase">{label}</div>
      <div className="text-xs tabular text-[#0F172A] mt-1">{value}</div>
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
