import { NavLink, Link, useLocation } from "react-router-dom";
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
  PaperPlaneTilt,
  Coin,
  House,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";

const navItems = [
  { to: "/", label: "Anasayfa", icon: House, testid: "nav-home", external: true },
  { to: "/dashboard", label: "Gösterge Paneli", icon: ChartPieSlice, testid: "nav-dashboard" },
  { to: "/markets", label: "Piyasalar", icon: Storefront, testid: "nav-markets" },
  { to: "/trade/BTC", label: "Spot İşlem", icon: ChartLineUp, testid: "nav-trade" },
  { to: "/wallet", label: "Cüzdan", icon: Wallet, testid: "nav-wallet" },
  { to: "/transfer", label: "Gönder / Al", icon: PaperPlaneTilt, testid: "nav-transfer" },
  { to: "/deposit", label: "TL Yatır", icon: ArrowsDownUp, testid: "nav-deposit" },
  { to: "/withdraw", label: "TL Çek", icon: ArrowsDownUp, testid: "nav-withdraw" },
  { to: "/trade/BERX", label: "BERX Coin", icon: Coin, testid: "nav-berx" },
  { to: "/history", label: "Geçmiş", icon: Clock, testid: "nav-history" },
  { to: "/kyc", label: "KYC Doğrulama", icon: IdentificationCard, testid: "nav-kyc" },
  { to: "/watchlist", label: "İzleme Listesi", icon: Star, testid: "nav-watchlist" },
  { to: "/support", label: "Destek", icon: Headset, testid: "nav-support" },
  { to: "/profile", label: "Profil", icon: User, testid: "nav-profile" },
];

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const isTrade = location.pathname.startsWith("/trade") && !location.pathname.startsWith("/trade/BERX");
  const isBerx = location.pathname === "/trade/BERX";
  const handleClick = () => onNavigate?.();

  return (
    <aside className="w-[236px] shrink-0 hidden lg:flex flex-col border-r border-[#E2E8F0] bg-white sticky top-0 h-screen">
      <Link to="/" onClick={handleClick} className="px-6 py-5 flex items-center gap-2 border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors" data-testid="sidebar-brand-link">
        {settings.logo_url ? (
          <img src={settings.logo_url} alt={settings.site_name} className="h-8 max-w-[160px] object-contain" />
        ) : (
          <>
            <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center text-white font-bold text-lg shadow-sm">C</div>
            <span className="font-display text-xl tracking-tight text-[#0F172A]">{settings.site_name || "Coinberx"}</span>
          </>
        )}
      </Link>
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, icon: Icon, testid }) => {
          let active = location.pathname === to;
          if (to === "/trade/BTC") active = isTrade;
          if (to === "/trade/BERX") active = isBerx;
          if (to === "/") active = false; // never highlight home in sidebar
          return (
            <NavLink
              key={to}
              to={to}
              onClick={handleClick}
              data-testid={testid}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                active
                  ? "text-[#16A34A] bg-[#F0FDF4] border-l-[3px] border-[#16A34A] font-medium"
                  : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
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
            onClick={handleClick}
            data-testid="nav-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-2.5 text-sm mt-4 border-t border-[#E2E8F0] pt-4 ${
                isActive ? "text-[#16A34A] font-medium" : "text-[#475569] hover:text-[#0F172A]"
              }`
            }
          >
            <ShieldCheck size={18} weight="fill" /> Yönetici Paneli
          </NavLink>
        )}
      </nav>
      <div className="p-4 border-t border-[#E2E8F0] text-xs text-[#64748B]">
        <div>Destek: {settings.contact_email || "destek@coinberx.com"}</div>
        <div className="mt-1">v1.0 · MASAK uyumlu</div>
      </div>
    </aside>
  );
}
