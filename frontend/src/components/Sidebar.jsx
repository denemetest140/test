import { NavLink, useLocation } from "react-router-dom";
import {
  ChartPieSlice,
  Storefront,
  ChartLineUp,
  Wallet,
  ArrowsDownUp,
  Clock,
  IdentificationCard,
  User,
  ShieldCheck,
  Star,
  Headset,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Gösterge Paneli", icon: ChartPieSlice, testid: "nav-dashboard" },
  { to: "/markets", label: "Piyasalar", icon: Storefront, testid: "nav-markets" },
  { to: "/trade/BTC", label: "Al-Sat", icon: ChartLineUp, testid: "nav-trade" },
  { to: "/wallet", label: "Cüzdan", icon: Wallet, testid: "nav-wallet" },
  { to: "/deposit", label: "TL Yatır", icon: ArrowsDownUp, testid: "nav-deposit" },
  { to: "/withdraw", label: "TL Çek", icon: ArrowsDownUp, testid: "nav-withdraw" },
  { to: "/history", label: "Geçmiş", icon: Clock, testid: "nav-history" },
  { to: "/kyc", label: "KYC Doğrulama", icon: IdentificationCard, testid: "nav-kyc" },
  { to: "/watchlist", label: "İzleme Listesi", icon: Star, testid: "nav-watchlist" },
  { to: "/support", label: "Destek", icon: Headset, testid: "nav-support" },
  { to: "/profile", label: "Profil", icon: User, testid: "nav-profile" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const isTrade = location.pathname.startsWith("/trade");

  return (
    <aside className="w-[236px] shrink-0 hidden lg:flex flex-col border-r border-[#1F2633] bg-[#070A0F] sticky top-0 h-screen">
      <div className="px-6 py-5 flex items-center gap-2 border-b border-[#1F2633]">
        <div className="w-8 h-8 rounded-lg bg-[#DCA335] flex items-center justify-center text-black font-bold text-lg">C</div>
        <span className="font-display text-xl tracking-tight">Coinberx</span>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, icon: Icon, testid }) => {
          const active = to === "/trade/BTC" ? isTrade : location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                active
                  ? "text-white bg-[#11151E] border-l-2 border-[#DCA335]"
                  : "text-[#94A3B8] hover:text-white hover:bg-[#11151E]"
              }`}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              {label}
            </NavLink>
          );
        })}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            data-testid="nav-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm mt-4 border-t border-[#1F2633] pt-4 ${
                isActive ? "text-[#DCA335]" : "text-[#94A3B8] hover:text-white"
              }`
            }
          >
            <ShieldCheck size={18} weight="fill" /> Yönetici Paneli
          </NavLink>
        )}
      </nav>
      <div className="p-4 border-t border-[#1F2633] text-xs text-[#94A3B8]">
        <div>Destek: destek@coinberx.com</div>
        <div className="mt-1">v1.0 · SPK Lisanslı (demo)</div>
      </div>
    </aside>
  );
}
