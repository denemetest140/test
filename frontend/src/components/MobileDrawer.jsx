import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  House, ChartPieSlice, Storefront, ChartLineUp, Wallet, PaperPlaneTilt,
  IdentificationCard, User, ShieldCheck, Headset, Question, Info, Lifebuoy,
  Newspaper, Megaphone, SignOut, X, Coin, Bell,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";

export default function MobileDrawer({ open, onClose }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const location = useLocation();

  if (!open) return null;

  const close = () => onClose?.();
  const go = (to) => { close(); nav(to); };

  const publicLinks = [
    { to: "/", label: "Anasayfa", icon: House, testid: "drawer-home" },
    { to: "/markets", label: "Piyasalar", icon: Storefront, testid: "drawer-markets" },
    { to: "/about", label: "Hakkımızda", icon: Info, testid: "drawer-about" },
    { to: "/help", label: "Yardım Merkezi", icon: Lifebuoy, testid: "drawer-help" },
    { to: "/faq", label: "SSS", icon: Question, testid: "drawer-faq" },
    { to: "/security", label: "Güvenlik", icon: ShieldCheck, testid: "drawer-security" },
    { to: "/blog", label: "Blog", icon: Newspaper, testid: "drawer-blog" },
    { to: "/announcements", label: "Duyurular", icon: Megaphone, testid: "drawer-announcements" },
    { to: "/contact", label: "İletişim", icon: Headset, testid: "drawer-contact" },
  ];

  const authLinks = user ? [
    { to: "/dashboard", label: "Gösterge Paneli", icon: ChartPieSlice, testid: "drawer-dashboard" },
    { to: "/trade/BTC", label: "Spot İşlem", icon: ChartLineUp, testid: "drawer-trade" },
    { to: "/wallet", label: "Cüzdan", icon: Wallet, testid: "drawer-wallet" },
    { to: "/transfer", label: "Gönder / Al", icon: PaperPlaneTilt, testid: "drawer-transfer" },
    { to: "/trade/BERX", label: "BERX Coin", icon: Coin, testid: "drawer-berx" },
    { to: "/kyc", label: "KYC Doğrulama", icon: IdentificationCard, testid: "drawer-kyc" },
    { to: "/profile", label: "Profil", icon: User, testid: "drawer-profile" },
  ] : [];

  return (
    <div className="lg:hidden fixed inset-0 z-50" data-testid="mobile-drawer">
      <div className="absolute inset-0 bg-black/50 animate-[fadeIn_.18s_ease]" onClick={close} />
      <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-[320px] bg-white flex flex-col shadow-2xl animate-[slideInLeft_.22s_ease]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <Link to="/" onClick={close} className="flex items-center gap-2" data-testid="drawer-brand">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="h-7 max-w-[140px] object-contain" />
            ) : (
              <>
                <div className="w-9 h-9 rounded-lg bg-[#16A34A] text-white font-bold flex items-center justify-center">C</div>
                <span className="font-display text-lg">{settings.site_name || "Coinberx"}</span>
              </>
            )}
          </Link>
          <button onClick={close} className="p-2 rounded-lg hover:bg-[#E2E8F0]" data-testid="drawer-close" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {/* User block (if logged in) */}
        {user && (
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-11 h-11 rounded-full" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#16A34A] text-white text-base font-semibold flex items-center justify-center">
                  {user.name?.[0]?.toUpperCase() || "C"}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#0F172A] truncate">{user.name || "Kullanıcı"}</div>
                <div className="text-xs text-[#64748B] truncate">{user.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => go("/wallet")} className="px-3 py-2 rounded-lg bg-[#F0FDF4] text-[#16A34A] text-xs font-medium" data-testid="drawer-quick-wallet">Cüzdanım</button>
              <button onClick={() => go("/dashboard")} className="px-3 py-2 rounded-lg bg-[#F1F5F9] text-[#0F172A] text-xs font-medium" data-testid="drawer-quick-dashboard">Panele Git</button>
            </div>
          </div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {authLinks.length > 0 && (
            <>
              <div className="px-5 pt-2 pb-1 text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider">Hesabım</div>
              {authLinks.map(({ to, label, icon: Icon, testid }) => {
                const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
                return (
                  <Link key={to} to={to} onClick={close} data-testid={testid}
                    className={`flex items-center gap-3 px-5 py-3 text-sm ${active ? "text-[#16A34A] bg-[#F0FDF4] border-l-[3px] border-[#16A34A] font-medium" : "text-[#0F172A] hover:bg-[#F8FAFC]"}`}>
                    <Icon size={18} weight={active ? "fill" : "regular"} /> {label}
                  </Link>
                );
              })}
            </>
          )}

          <div className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase text-[#94A3B8] tracking-wider">Coinberx</div>
          {publicLinks.map(({ to, label, icon: Icon, testid }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} onClick={close} data-testid={testid}
                className={`flex items-center gap-3 px-5 py-3 text-sm ${active ? "text-[#16A34A] bg-[#F0FDF4] border-l-[3px] border-[#16A34A] font-medium" : "text-[#0F172A] hover:bg-[#F8FAFC]"}`}>
                <Icon size={18} weight={active ? "fill" : "regular"} /> {label}
              </Link>
            );
          })}

          {user?.role === "admin" && (
            <Link to="/admin" onClick={close} data-testid="drawer-admin"
              className="flex items-center gap-3 px-5 py-3 text-sm mt-2 border-t border-[#E2E8F0] text-[#16A34A] font-medium">
              <ShieldCheck size={18} weight="fill" /> Yönetici Paneli
            </Link>
          )}

          {!user && (
            <div className="px-5 py-4 grid grid-cols-2 gap-2 border-t border-[#E2E8F0] mt-2">
              <Link to="/login" onClick={close} className="text-center px-4 py-2.5 rounded-lg border border-[#16A34A] text-[#16A34A] text-sm font-medium" data-testid="drawer-login">Giriş Yap</Link>
              <Link to="/register" onClick={close} className="text-center px-4 py-2.5 rounded-lg btn-primary text-sm" data-testid="drawer-register">Hesap Aç</Link>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] p-4 bg-[#F8FAFC]">
          {user && (
            <button onClick={async () => { close(); await logout(); nav("/"); }} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-[#DC2626] text-sm font-medium mb-3" data-testid="drawer-logout">
              <SignOut size={16} /> Çıkış Yap
            </button>
          )}
          <div className="text-[11px] text-[#64748B] text-center">
            <div>{settings.contact_email || "destek@coinberx.com"}</div>
            <div className="mt-1">{settings.contact_phone || "+90 850 000 00 00"}</div>
            <div className="mt-1">v1.0 · MASAK uyumlu</div>
          </div>
        </div>
      </div>
    </div>
  );
}
