import { useEffect, useMemo, useState } from "react";
import { api, formatNumber, formatTRY, errToStr } from "../lib/api";
import { toast } from "sonner";
import { PaperPlaneTilt, MagnifyingGlass, ArrowDown, ArrowUp, User as UserIcon, CheckCircle, Warning } from "@phosphor-icons/react";

export default function Transfer() {
  const [wallet, setWallet] = useState(null);
  const [sym, setSym] = useState("USDT");
  const [recipient, setRecipient] = useState("");
  const [lookup, setLookup] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [hist, setHist] = useState({ sent: [], received: [] });
  const [tab, setTab] = useState("received");
  const [settings, setSettings] = useState({ transfer_fee_pct: 0.0005 });
  const [showConfirm, setShowConfirm] = useState(false);

  const load = () => {
    api.get("/wallet").then((r) => setWallet(r.data)).catch(() => {});
    api.get("/transfers").then((r) => setHist(r.data)).catch(() => {});
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!recipient || recipient.length < 3) { setLookup(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/lookup?q=${encodeURIComponent(recipient)}`);
        setLookup(data);
      } catch { setLookup(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [recipient]);

  const asset = wallet?.assets?.find((a) => a.symbol === sym);
  const balance = asset?.amount ?? 0;
  const nonZero = useMemo(() => (wallet?.assets || []).filter((a) => a.symbol !== "TRY" && a.amount > 0.0000001), [wallet]);
  const choosableCoins = nonZero.length > 0 ? nonZero : [{ symbol: "USDT", amount: 0 }, { symbol: "BERX", amount: 0 }];

  const feePct = settings.transfer_fee_pct || 0.0005;
  const amountN = Number(amount) || 0;
  const fee = amountN * feePct;
  const total = amountN + fee;
  const insufficient = total > balance;

  const submit = async () => {
    if (!lookup) return toast.error("Alıcı bulunamadı");
    if (amountN <= 0) return toast.error("Geçersiz tutar");
    if (insufficient) return toast.error("Yetersiz bakiye");
    setLoading(true);
    try {
      await api.post("/transfers", { recipient: recipient.trim(), symbol: sym, amount: amountN, note });
      toast.success(`${amountN} ${sym} gönderildi`);
      setAmount(""); setNote(""); setShowConfirm(false);
      load();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto anim-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl">Kullanıcılar Arası Transfer</h1>
        <p className="text-[#64748B] text-sm mt-1">Coinberx kullanıcılarına anında ve ücretsize yakın coin gönderin. Ağ ücreti yok.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card-surface p-5 lg:col-span-3" data-testid="transfer-form">
          <div className="text-xs text-[#64748B] mb-3">Coin Seç</div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
            {choosableCoins.map((a) => (
              <button
                key={a.symbol}
                onClick={() => setSym(a.symbol)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition ${sym===a.symbol?"border-[#16A34A] bg-[#16A34A]/10":"border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]"}`}
                data-testid={`tr-coin-${a.symbol}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${a.symbol==="BERX"?"bg-[#16A34A]/20 text-[#16A34A]":"bg-[#E2E8F0]"}`}>{a.symbol.slice(0,2)}</div>
                <div className="text-left">
                  <div className="text-sm">{a.symbol}</div>
                  <div className="text-[10px] text-[#64748B] tabular">{formatNumber(a.amount)}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-xs text-[#64748B] mb-2">Alıcı (e-posta, kullanıcı adı, referans kodu veya ID)</div>
          <div className="relative mb-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              data-testid="tr-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="input-field pl-10"
              placeholder="ornek@coinberx.com veya CBABC123"
            />
          </div>
          <div className="min-h-[42px] mb-3">
            {recipient.length >= 3 && (
              lookup ? (
                <div className="bg-[#16A34A]/10 border border-[#16A34A]/40 rounded-lg px-3 py-2 flex items-center gap-2 text-xs" data-testid="tr-recipient-found">
                  <CheckCircle size={14} weight="fill" className="text-[#16A34A]"/>
                  <div className="flex-1"><div className="font-medium text-[#0F172A]">{lookup.name}</div><div className="text-[#64748B]">{lookup.email} · Kod: {lookup.referral_code}</div></div>
                </div>
              ) : (
                <div className="bg-[#DC2626]/10 border border-[#DC2626]/40 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-[#DC2626]">
                  <Warning size={14} weight="fill"/> Kullanıcı bulunamadı
                </div>
              )
            )}
          </div>

          <div className="text-xs text-[#64748B] mb-2 flex justify-between">
            <span>Tutar ({sym})</span>
            <button onClick={() => setAmount(balance.toString())} className="text-[#16A34A]" data-testid="tr-max">MAX</button>
          </div>
          <input data-testid="tr-amount" type="number" className="input-field mb-1 tabular text-lg" value={amount} onChange={(e) => setAmount(e.target.value)} step="any" placeholder="0.00"/>
          <div className="text-xs text-[#64748B] tabular mb-4">Kullanılabilir: {formatNumber(balance)} {sym}</div>

          <div className="text-xs text-[#64748B] mb-2">Not (opsiyonel)</div>
          <input data-testid="tr-note" className="input-field mb-5" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Kısa not..."/>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1.5 mb-5">
            <div className="flex justify-between"><span className="text-[#64748B]">Tutar</span><span className="tabular">{formatNumber(amountN)} {sym}</span></div>
            <div className="flex justify-between"><span className="text-[#64748B]">Komisyon ({(feePct*100).toFixed(2)}%)</span><span className="tabular">{formatNumber(fee)} {sym}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-[#E2E8F0] font-medium"><span>Toplam</span><span className="tabular">{formatNumber(total)} {sym}</span></div>
          </div>

          {insufficient && amountN > 0 && (
            <div className="bg-[#DC2626]/10 border border-[#DC2626]/40 rounded-lg px-3 py-2 text-xs text-[#DC2626] mb-3 flex items-center gap-2">
              <Warning size={14} weight="fill"/> Yetersiz bakiye (komisyon dahil)
            </div>
          )}

          <button
            disabled={!lookup || amountN <= 0 || insufficient || loading}
            onClick={() => setShowConfirm(true)}
            className="btn-primary w-full py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-40"
            data-testid="tr-submit"
          >
            <PaperPlaneTilt size={16} weight="fill"/> {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>

        <div className="card-surface p-5 lg:col-span-2">
          <div className="flex gap-1 border-b border-[#E2E8F0] mb-3">
            <button onClick={() => setTab("received")} className={`tab-btn ${tab==="received"?"active":""}`} data-testid="tr-tab-received">Gelen ({hist.received.length})</button>
            <button onClick={() => setTab("sent")} className={`tab-btn ${tab==="sent"?"active":""}`} data-testid="tr-tab-sent">Giden ({hist.sent.length})</button>
          </div>
          <div className="space-y-2 max-h-[480px] overflow-y-auto scrollbar-thin">
            {(tab==="received"?hist.received:hist.sent).length === 0 ? (
              <div className="text-sm text-[#64748B] py-8 text-center">Henüz kayıt yok</div>
            ) : (tab==="received"?hist.received:hist.sent).map((t) => {
              const inbound = tab === "received";
              return (
                <div key={t.transfer_id} className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${inbound?"bg-[#16A34A]/15 text-[#16A34A]":"bg-[#DC2626]/15 text-[#DC2626]"}`}>
                        {inbound ? <ArrowDown size={14} weight="bold"/> : <ArrowUp size={14} weight="bold"/>}
                      </div>
                      <div>
                        <div className="text-sm">{inbound?"Gelen":"Giden"} {t.symbol}</div>
                        <div className="text-[11px] text-[#64748B]">{inbound ? t.sender_email : t.receiver_email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`tabular text-sm ${inbound?"text-[#16A34A]":"text-[#DC2626]"}`}>{inbound?"+":"-"}{formatNumber(t.amount)}</div>
                      <div className="text-[10px] text-[#64748B]">{new Date(t.created_at).toLocaleString("tr-TR")}</div>
                    </div>
                  </div>
                  {t.note && <div className="text-xs text-[#64748B] mt-2 italic">"{t.note}"</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="card-surface p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()} data-testid="tr-confirm">
            <h3 className="font-display text-xl mb-3">Transferi Onayla</h3>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Alıcı</span><span>{lookup?.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">E-posta</span><span className="tabular text-xs">{lookup?.email}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Tutar</span><span className="tabular">{formatNumber(amountN)} {sym}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#64748B]">Komisyon</span><span className="tabular">{formatNumber(fee)} {sym}</span></div>
              <div className="flex justify-between text-sm pt-3 border-t border-[#E2E8F0] font-medium"><span>Düşecek Toplam</span><span className="tabular">{formatNumber(total)} {sym}</span></div>
            </div>
            <div className="bg-[#D97706]/10 border border-[#D97706]/30 rounded-lg px-3 py-2 text-xs text-[#D97706] mb-4 flex items-start gap-2">
              <Warning size={14} weight="fill" className="mt-0.5"/> Transfer geri alınamaz. Alıcı bilgilerini bir kez daha kontrol edin.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-sm" data-testid="tr-cancel">İptal</button>
              <button onClick={submit} disabled={loading} className="flex-1 btn-primary py-2.5 rounded-lg text-sm" data-testid="tr-confirm-btn">{loading?"...":"Onayla"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
