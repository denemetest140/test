import { useEffect, useState } from "react";
import { api, formatNumber, errToStr, formatTRY } from "../lib/api";
import { toast } from "sonner";
import { X, Copy, Warning, Info, CheckCircle, PaperPlaneTilt, ArrowDown, ArrowUp, Clock } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function AssetDetailModal({ asset, onClose, onChanged }) {
  const [tab, setTab] = useState("deposit");
  const [networks, setNetworks] = useState([]);
  const [netCode, setNetCode] = useState(null);
  const [address, setAddress] = useState(null);
  const [wdAmount, setWdAmount] = useState("");
  const [wdAddress, setWdAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const sym = asset.symbol;

  useEffect(() => {
    api.get(`/coins/${sym}/networks`).then((r) => {
      setNetworks(r.data || []);
      if (r.data?.[0]) setNetCode(r.data[0].code);
    }).catch(() => {});
  }, [sym]);

  useEffect(() => {
    if (!netCode) return;
    setAddress(null);
    api.get(`/wallet/deposit-address?symbol=${sym}&network=${netCode}`).then((r) => setAddress(r.data)).catch(() => {});
  }, [sym, netCode]);

  const selectedNet = networks.find((n) => n.code === netCode);
  const copy = (v) => { navigator.clipboard.writeText(v); toast.success("Kopyalandı"); };

  const feeCoin = asset.price_try > 0 && selectedNet ? (selectedNet.fee_flat_try / asset.price_try) : 0;
  const minCoin = asset.price_try > 0 && selectedNet ? (selectedNet.min_withdraw_try / asset.price_try) : 0;

  const submitWithdraw = async () => {
    if (!wdAmount || !wdAddress) return toast.error("Tutar ve adres girin");
    const a = Number(wdAmount);
    if (a < minCoin) return toast.error(`Min çekim: ${minCoin.toFixed(8)} ${sym}`);
    if (a + feeCoin > asset.amount) return toast.error("Yetersiz bakiye (ücret dahil)");
    setLoading(true);
    try {
      await api.post("/crypto-withdrawals", { symbol: sym, network: netCode, address: wdAddress, amount: a });
      toast.success("Çekim talebi oluşturuldu, admin onayı bekleniyor.");
      setWdAmount(""); setWdAddress(""); onChanged?.();
    } catch (err) { toast.error(errToStr(err)); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="card-surface w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[92vh] overflow-y-auto scrollbar-thin animate-in" onClick={(e) => e.stopPropagation()} data-testid="asset-detail">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 bg-[#FFFFFF] z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${sym==="BERX"?"bg-[#16A34A]/20 text-[#16A34A]":"bg-[#E2E8F0]"}`}>{sym.slice(0,2)}</div>
            <div>
              <div className="font-display text-lg">{sym}</div>
              <div className="text-[11px] text-[#64748B] tabular">{formatNumber(asset.amount)} ({formatTRY(asset.value_try)})</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F1F5F9] rounded-full" data-testid="asset-close"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 border-b border-[#E2E8F0]">
          <div className="bg-[#FFFFFF] rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#64748B]">Kullanılabilir</div>
            <div className="tabular text-sm mt-0.5">{formatNumber(asset.amount)}</div>
          </div>
          <div className="bg-[#FFFFFF] rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#64748B]">Kilitli</div>
            <div className="tabular text-sm mt-0.5 text-[#D97706]">{formatNumber(asset.locked || 0)}</div>
          </div>
          <div className="bg-[#FFFFFF] rounded-lg p-2 text-center">
            <div className="text-[10px] text-[#64748B]">TL Değeri</div>
            <div className="tabular text-sm mt-0.5">{formatTRY(asset.value_try)}</div>
          </div>
        </div>

        <div className="flex border-b border-[#E2E8F0]">
          {[["deposit","Yatır",ArrowDown],["withdraw","Çek",ArrowUp],["transfer","Gönder",PaperPlaneTilt]].map(([v,l,Ic]) => (
            <button key={v} onClick={() => setTab(v)} className={`flex-1 py-3 text-xs flex items-center justify-center gap-1.5 ${tab===v?"text-[#16A34A] border-b-2 border-[#16A34A]":"text-[#64748B]"}`} data-testid={`ad-tab-${v}`}>
              <Ic size={14} weight="bold"/> {l}
            </button>
          ))}
        </div>

        <div className="p-5">
          {networks.length === 0 ? (
            <div className="text-sm text-[#64748B] py-8 text-center">Bu coin için aktif ağ bulunamadı</div>
          ) : (
            <>
              <div className="text-xs text-[#64748B] mb-2">Ağ Seçimi</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {networks.map((n) => (
                  <button
                    key={n.code}
                    onClick={() => setNetCode(n.code)}
                    className={`px-3 py-2 rounded-lg border text-xs ${netCode===n.code?"border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]":"border-[#E2E8F0] bg-[#FFFFFF] hover:border-[#CBD5E1]"}`}
                    data-testid={`net-${n.code}`}
                  >
                    <div className="font-medium">{n.code}</div>
                    <div className="text-[10px] text-[#64748B]">{n.name}</div>
                  </button>
                ))}
              </div>

              {selectedNet && (
                <div className="bg-[#D97706]/10 border border-[#D97706]/30 rounded-lg px-3 py-2 text-xs mb-4 flex items-start gap-2">
                  <Warning size={14} weight="fill" className="text-[#D97706] mt-0.5 shrink-0"/>
                  <div>
                    <span className="text-[#D97706] font-medium">UYARI:</span> Sadece <b>{sym} ({selectedNet.code})</b> gönderin. Yanlış ağ = varlık kaybı.
                  </div>
                </div>
              )}

              {tab === "deposit" && selectedNet && (
                <>
                  <div className="text-xs text-[#64748B] mb-2">Yatırma Adresiniz</div>
                  {!address ? <div className="h-16 animate-pulse bg-[#FFFFFF] rounded-lg"/> : (
                    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                      <div className="tabular break-all text-sm select-all" data-testid="ad-address">{address.address}</div>
                      <button onClick={() => copy(address.address)} className="mt-2 text-xs flex items-center gap-1 text-[#16A34A]" data-testid="ad-copy"><Copy size={12}/> Adresi Kopyala</button>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                    <div className="bg-[#FFFFFF] rounded p-2"><div className="text-[#64748B]">Ağ Ücreti</div><div className="tabular mt-0.5">{formatTRY(selectedNet.fee_flat_try)}</div></div>
                    <div className="bg-[#FFFFFF] rounded p-2"><div className="text-[#64748B]">Min Yatırma</div><div className="tabular mt-0.5">{formatTRY(selectedNet.min_withdraw_try)}</div></div>
                    <div className="bg-[#FFFFFF] rounded p-2"><div className="text-[#64748B]"><Clock size={10} className="inline"/> Onay</div><div className="tabular mt-0.5">{selectedNet.confirm_minutes} dk</div></div>
                  </div>
                  <div className="text-xs text-[#64748B] mt-3">
                    <Info size={12} className="inline mr-1"/> Yatırma, blokzincirde onay aldıktan sonra otomatik olarak cüzdanınıza eklenir. Demo sürümde bu akış admin tarafından onaylanır.
                  </div>
                </>
              )}

              {tab === "withdraw" && selectedNet && (
                <>
                  <div className="text-xs text-[#64748B] mb-2">Alıcı Adresi</div>
                  <input data-testid="wd-address" value={wdAddress} onChange={(e) => setWdAddress(e.target.value)} className="input-field tabular text-xs mb-3" placeholder={`${selectedNet.code} adresi...`}/>
                  <div className="text-xs text-[#64748B] mb-2 flex justify-between">
                    <span>Tutar ({sym})</span>
                    <button onClick={() => setWdAmount((asset.amount - feeCoin).toFixed(8))} className="text-[#16A34A]" data-testid="wd-max">MAX</button>
                  </div>
                  <input data-testid="wd-amount" type="number" step="any" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} className="input-field tabular mb-3" placeholder="0.00"/>
                  <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3 text-xs space-y-1 mb-4">
                    <div className="flex justify-between"><span className="text-[#64748B]">Ağ Ücreti</span><span className="tabular">{formatNumber(feeCoin)} {sym} · {formatTRY(selectedNet.fee_flat_try)}</span></div>
                    <div className="flex justify-between"><span className="text-[#64748B]">Min Çekim</span><span className="tabular">{formatNumber(minCoin)} {sym}</span></div>
                    <div className="flex justify-between"><span className="text-[#64748B]">Onay Süresi</span><span>{selectedNet.confirm_minutes} dk</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-[#E2E8F0] font-medium"><span>Net Çekilecek</span><span className="tabular">{formatNumber(Number(wdAmount) || 0)} {sym}</span></div>
                  </div>
                  <button onClick={submitWithdraw} disabled={loading} className="btn-primary w-full py-3 rounded-lg" data-testid="wd-submit">{loading?"Gönderiliyor...":"Çekim Talebi"}</button>
                </>
              )}

              {tab === "transfer" && (
                <div className="text-center py-4">
                  <PaperPlaneTilt size={36} className="text-[#16A34A] mx-auto" weight="fill"/>
                  <div className="text-sm mt-3">Coinberx kullanıcıları arasında anında transfer</div>
                  <div className="text-xs text-[#64748B] mt-1">Ağ ücreti yok · saniyeler içinde ulaşır</div>
                  <Link to="/transfer" className="btn-primary inline-flex mt-5 px-6 py-2.5 rounded-lg text-sm" onClick={onClose} data-testid="ad-go-transfer">Transfer Sayfasına Git</Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
