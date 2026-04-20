import { Link } from "react-router-dom";
import { ChartLineUp, ShieldCheck, Lightning, CreditCard } from "@phosphor-icons/react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#070A0F] text-[#F8FAFC] relative overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none" />
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-[#1F2633]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-[#DCA335] flex items-center justify-center text-black font-bold text-xl">C</div>
          <span className="font-display text-2xl tracking-tight">Coinberx</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login" data-testid="landing-login" className="px-4 py-2 text-sm rounded-lg hover:bg-[#11151E]">Giriş Yap</Link>
          <Link to="/register" data-testid="landing-register" className="btn-primary px-4 py-2 text-sm rounded-lg">Hesap Aç</Link>
        </nav>
      </header>

      <section className="relative z-10 px-6 lg:px-12 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1F2633] bg-[#11151E] text-xs text-[#DCA335] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" /> TR lira ile kripto almak artık 60 saniye
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight max-w-3xl">
          Türkiye'nin premium <span className="text-[#DCA335]">kripto borsası</span>.
        </h1>
        <p className="text-lg text-[#94A3B8] mt-6 max-w-2xl">
          IBAN ile saniyeler içinde TL yatırın. BTC, ETH, USDT ve 15+ coin ile düşük komisyonla al-sat yapın. KYC, cüzdan ve 7/24 admin onaylı para çekme.
        </p>
        <div className="flex flex-wrap gap-3 mt-10">
          <Link to="/register" className="btn-primary px-6 py-3 rounded-lg text-sm" data-testid="hero-register">
            Hemen Hesap Aç
          </Link>
          <Link to="/markets" className="px-6 py-3 rounded-lg border border-[#1F2633] hover:bg-[#11151E] text-sm" data-testid="hero-markets">
            Piyasaları Gör
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {[
            { icon: Lightning, title: "Anlık Al-Sat", desc: "Binance kalitesinde likidite" },
            { icon: CreditCard, title: "IBAN ile TL", desc: "Referans kodu ile dekont yükleyin" },
            { icon: ShieldCheck, title: "KYC / AML", desc: "Türkiye mevzuatına uyumlu" },
            { icon: ChartLineUp, title: "Gerçek Zamanlı Grafik", desc: "Candlestick + derinlik" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-surface p-5">
              <Icon size={24} className="text-[#DCA335]" weight="fill" />
              <div className="font-display font-semibold mt-3">{title}</div>
              <div className="text-xs text-[#94A3B8] mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
