// Coinberx — Wallet (Cüzdan)
// CoinTR ilhamlı yapı: sol sidebar, ana alanda Toplam Varlık + Hızlı İşlemler + Varlık Tablosu.
import { useEffect, useMemo, useState } from "react";
import { api, formatTRY, formatNumber, formatPct } from "../lib/api";
import { Link } from "react-router-dom";
import { Eye, EyeSlash, ArrowDown, ArrowUp, PaperPlaneTilt, MagnifyingGlass, ShoppingBagOpen, Wallet as WalletIcon, Receipt, ArrowsLeftRight, Clock, House } from "@phosphor-icons/react";
import { CoinIcon } from "../lib/coinIcons.jsx";
import { usePageSeo } from "../contexts/SettingsContext";

export default function Wallet() {
  usePageSeo("wallet");
  const [view, setView] = useState("overview"); // overview | spot | deposits | withdrawals | transfers | history
  const [hide, setHide] = useState(false);
  const [w, setW] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [txs, setTxs] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyOwned, setOnlyOwned] = useState(true);

  const reload = () => {
    api.get("/wallet").then((r) => setW(r.data)).catch(() => {});
    api.get("/markets").then((r) => setMarkets(r.data || [])).catch(() => {});
    api.get("/wallet/transactions?limit=50").then((r) => setTxs(r.data || [])).catch(() => {});
  };
  useEffect(() => { reload(); const t = setInterval(reload, 15000); return () => clearInterval(t); }, []);

  const change = (sym) => markets.find((m) => m.symbol === sym)?.change_24h ?? 0;
  const priceOf = (sym) => markets.find((m) => m.symbol === sym)?.price_try ?? 0;
  const usdt = markets.find((m) => m.symbol === "USDT")?.price_try || 0;

  const allAssets = w?.assets || [];
  const owned = allAssets.filter((a) => a.amount > 0.0000001 || (a.locked || 0) > 0 || a.symbol === "TRY");
  const baseList = onlyOwned ? owned : allAssets;
  const filtered = useMemo(() => baseList.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.symbol.toLowerCase().includes(q) || (markets.find((m) => m.symbol === a.symbol)?.name || "").toLowerCase().includes(q);
  }), [baseList, search, markets]);

  const mask = (s) => hide ? "••••••" : s;
  const totalTry = w?.total_try ?? 0;
  const totalUsdt = usdt ? totalTry / usdt : 0;

  const SIDE = [
    { v: "overview", l: "Genel Bakış", Icon: House },
    { v: "spot", l: "Spot Hesabı", Icon: WalletIcon },
    { v: "deposits", l: "Yatırma", Icon: ArrowDown },
    { v: "withdrawals", l: "Çekme", Icon: ArrowUp },
    { v: "transfers", l: "Transfer", Icon: PaperPlaneTilt },
    { v: "history", l: "İşlem Kayıtları", Icon: Clock },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-[1440px] mx-auto anim-fade-up">
      <div className="text-xs text-[#64748B] mb-2">Coinberx / Cüzdan</div>
      <h1 className="font-display text-2xl lg:text-3xl text-[#0F172A] mb-6">Cüzdanım</h1>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-3">
          <div className="card-surface p-2 lg:sticky lg:top-20">
            {SIDE.map(({ v, l, Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${view===v?"bg-[#F0FDF4] text-[#16A34A] font-medium":"text-[#475569] hover:bg-[#F8FAFC]"}`}
                data-testid={`wallet-side-${v}`}
              >
                <Icon size={16} weight={view===v?"fill":"regular"}/> {l}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="lg:col-span-9 space-y-6">
          {/* Summary card */}
          <div className="card-surface p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  Tahmini Bakiye <button onClick={() => setHide((v)=>!v)} className="hover:text-[#0F172A]" data-testid="wallet-hide">{hide?<EyeSlash size={14}/>:<Eye size={14}/>}</button>
                </div>
                <div className="font-display text-3xl lg:text-4xl tabular mt-1 text-[#0F172A]" data-testid="wallet-total">
                  {mask(formatTRY(totalTry, 2))}
                </div>
                <div className="text-xs text-[#64748B] tabular mt-1">
                  ≈ {mask((totalUsdt).toLocaleString("tr-TR", { maximumFractionDigits: 2 }))} USDT
                </div>
                <div className="text-xs mt-2">
                  Kâr/Zarar: <span className={`tabular ${(w?.pnl_try??0)>=0?"text-[#16A34A]":"text-[#DC2626]"}`}>
                    {(w?.pnl_try??0)>=0?"+":""}{mask(formatTRY(w?.pnl_try ?? 0, 2))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ActBtn to="/trade/BTC" label="Kripto Al" Icon={ShoppingBagOpen} primary testid="wallet-buy"/>
                <ActBtn to="/deposit" label="Yatır" Icon={ArrowDown} testid="wallet-deposit"/>
                <ActBtn to="/withdraw" label="Çek" Icon={ArrowUp} testid="wallet-withdraw"/>
                <ActBtn to="/transfer" label="Gönder" Icon={PaperPlaneTilt} testid="wallet-transfer"/>
              </div>
            </div>
          </div>

          {/* View content */}
          {view === "history" ? (
            <HistoryView txs={txs} />
          ) : view === "deposits" ? (
            <RedirectCard title="TL ve Kripto Yatırma" desc="Yatırma akışlarına özel sayfadan erişin." to="/deposit" cta="Yatırma sayfasına git"/>
          ) : view === "withdrawals" ? (
            <RedirectCard title="TL ve Kripto Çekme" desc="Çekme talepleri için özel sayfa." to="/withdraw" cta="Çekme sayfasına git"/>
          ) : view === "transfers" ? (
            <RedirectCard title="Kullanıcılar Arası Transfer" desc="Coinberx içinde anında, ücretsiz transfer." to="/transfer" cta="Transfer sayfasına git"/>
          ) : (
            <div className="card-surface">
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-display text-lg text-[#0F172A]">Varlıklarım</div>
                  <div className="text-xs text-[#64748B]">{filtered.length} varlık</div>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-xs min-w-[180px] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 hover:border-[#16A34A] transition">
                  <MagnifyingGlass size={14} className="text-[#64748B]"/>
                  <input value={search} onChange={(e)=>setSearch(e.target.value)} className="bg-transparent outline-none py-1.5 text-sm flex-1" placeholder="Coin ara..." data-testid="wallet-search"/>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#475569] cursor-pointer">
                  <input type="checkbox" checked={onlyOwned} onChange={(e)=>setOnlyOwned(e.target.checked)} className="rounded text-[#16A34A]" data-testid="wallet-only-owned"/>
                  Sadece sahip olduklarım
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F8FAFC]">
                    <tr className="text-xs text-[#64748B] text-left">
                      <th className="py-3 px-4">Coin</th>
                      <th className="py-3 px-4 text-right hidden md:table-cell">Available</th>
                      <th className="py-3 px-4 text-right hidden md:table-cell">Locked</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-right">TRY Değeri</th>
                      <th className="py-3 px-4 text-right hidden lg:table-cell">24s</th>
                      <th className="py-3 px-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center text-sm text-[#64748B]">Sonuç bulunamadı</td></tr>
                    )}
                    {filtered.map((a) => {
                      const ch = change(a.symbol);
                      const up = ch >= 0;
                      const locked = a.locked || 0;
                      const total = a.amount + locked;
                      const value = a.symbol === "TRY" ? total : total * priceOf(a.symbol);
                      return (
                        <tr key={a.symbol} className="hover:bg-[#F8FAFC]" data-testid={`wallet-row-${a.symbol}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              {a.symbol === "TRY" ? (
                                <span className="w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center font-bold text-sm">₺</span>
                              ) : (
                                <CoinIcon symbol={a.symbol} size={32}/>
                              )}
                              <div>
                                <div className="font-medium text-sm">{a.symbol}</div>
                                <div className="text-[10px] text-[#64748B]">{a.symbol === "TRY" ? "Türk Lirası" : (markets.find(m=>m.symbol===a.symbol)?.name || (a.symbol==="BERX"?"Berx Token":a.symbol))}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right tabular text-xs hidden md:table-cell">{mask(formatNumber(a.amount))}</td>
                          <td className="py-3 px-4 text-right tabular text-xs text-[#D97706] hidden md:table-cell">{mask(formatNumber(locked))}</td>
                          <td className="py-3 px-4 text-right tabular text-sm font-medium">{mask(formatNumber(total))}</td>
                          <td className="py-3 px-4 text-right tabular text-sm">{mask(formatTRY(value, 2))}</td>
                          <td className="py-3 px-4 text-right tabular text-xs hidden lg:table-cell">{a.symbol==="TRY"?"-":(
                            <span className={`inline-flex items-center gap-0.5 ${up?"text-[#16A34A]":"text-[#DC2626]"}`}>
                              {up?<ArrowUp size={10} weight="bold"/>:<ArrowDown size={10} weight="bold"/>}{formatPct(ch)}
                            </span>
                          )}</td>
                          <td className="py-3 px-4 text-right">
                            <RowActions sym={a.symbol}/>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActBtn({ to, label, Icon, primary, testid }) {
  const cls = primary ? "btn-primary" : "border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A]";
  return (
    <Link to={to} data-testid={testid} className={`${cls} rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition`}>
      <Icon size={14} weight="fill"/> {label}
    </Link>
  );
}

function RowActions({ sym }) {
  if (sym === "TRY") {
    return (
      <div className="inline-flex gap-1">
        <Link to="/deposit" className="px-2 py-1 rounded bg-[#16A34A] text-white text-[10px] font-semibold hover:bg-[#15803D]">Yatır</Link>
        <Link to="/withdraw" className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] text-[10px] font-semibold hover:bg-[#F8FAFC]">Çek</Link>
      </div>
    );
  }
  return (
    <div className="inline-flex gap-1">
      <Link to={`/trade/${sym}`} className="px-2 py-1 rounded bg-[#16A34A] text-white text-[10px] font-semibold hover:bg-[#15803D]" data-testid={`wallet-buy-${sym}`}>Al</Link>
      <Link to={`/trade/${sym}`} className="px-2 py-1 rounded bg-[#DC2626] text-white text-[10px] font-semibold hover:bg-red-700" data-testid={`wallet-sell-${sym}`}>Sat</Link>
      <Link to={`/deposit?tab=crypto`} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] text-[10px] hover:bg-[#F8FAFC] hidden sm:inline-block">Yatır</Link>
      <Link to={`/withdraw?tab=crypto`} className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] text-[10px] hover:bg-[#F8FAFC] hidden sm:inline-block">Çek</Link>
      <Link to="/transfer" className="px-2 py-1 rounded border border-[#E2E8F0] text-[#475569] text-[10px] hover:bg-[#F8FAFC] hidden md:inline-block">Gönder</Link>
    </div>
  );
}

function RedirectCard({ title, desc, to, cta }) {
  return (
    <div className="card-surface p-8 text-center">
      <div className="font-display text-xl text-[#0F172A]">{title}</div>
      <div className="text-sm text-[#64748B] mt-2">{desc}</div>
      <Link to={to} className="btn-primary inline-block mt-4 px-5 py-2.5 rounded-lg text-sm">{cta}</Link>
    </div>
  );
}

function HistoryView({ txs }) {
  return (
    <div className="card-surface">
      <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-2">
        <Receipt size={18} className="text-[#16A34A]"/>
        <div className="font-display text-lg">İşlem Kayıtları</div>
      </div>
      {txs.length === 0 ? (
        <div className="p-10 text-center text-sm text-[#64748B]">Henüz işlem yok</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr className="text-xs text-[#64748B] text-left">
                <th className="px-4 py-3">Tarih</th>
                <th>Tür</th>
                <th>Coin</th>
                <th className="text-right">Miktar / Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {txs.map((t) => (
                <tr key={t.order_id || t.id || t.tx_hash || `${t.type}-${t.created_at}`} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-2 text-xs text-[#64748B]">{new Date(t.created_at).toLocaleString("tr-TR")}</td>
                  <td className="py-2 text-sm capitalize">{t.type}</td>
                  <td className="py-2 text-sm flex items-center gap-1.5">{t.symbol ? <><CoinIcon symbol={t.symbol} size={18}/>{t.symbol}</> : "—"}</td>
                  <td className="py-2 text-right tabular text-sm">
                    {t.amount_try ? formatTRY(t.amount_try) : (t.quantity ? `${t.quantity}` : "")}
                  </td>
                  <td className="py-2 text-xs">{t.status || "ok"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
