import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";

export default function InfoPage({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#070A0F] text-[#F8FAFC]">
      <header className="border-b border-[#1F2633]">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#DCA335] flex items-center justify-center text-black font-bold text-xl">C</div>
            <span className="font-display text-xl">Coinberx</span>
          </Link>
          <Link to="/" className="text-sm text-[#94A3B8] hover:text-white flex items-center gap-1"><ArrowLeft size={14}/> Ana Sayfa</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 lg:px-8 py-16 anim-fade-up">
        <div className="chip mb-4">Coinberx</div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight">{title}</h1>
        {subtitle && <p className="text-[#94A3B8] mt-4 text-lg">{subtitle}</p>}
        <div className="prose-coinberx mt-10 text-[#F8FAFC] leading-relaxed space-y-5">
          {children}
        </div>
      </main>
      <footer className="border-t border-[#1F2633] mt-20">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-6 text-xs text-[#94A3B8] flex justify-between flex-wrap gap-2">
          <span>© {new Date().getFullYear()} Coinberx</span>
          <div className="flex gap-4">
            <Link to="/about" className="hover:text-white">Hakkımızda</Link>
            <Link to="/help" className="hover:text-white">Yardım</Link>
            <Link to="/contact" className="hover:text-white">İletişim</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
