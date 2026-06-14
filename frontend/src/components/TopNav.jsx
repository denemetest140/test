import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingsContext";
import { Link, useNavigate } from "react-router-dom";
import { Bell, SignOut, List, User as UserIcon, IdentificationCard, Wallet, Headset, CaretDown, House } from "@phosphor-icons/react";
import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";

export default function TopNav({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    api.get("/notifications").then((r) => setNotifs(r.data || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    const fn = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;
  const kycLabel = user?.kyc_status === "approved" ? "Onaylı" : user?.kyc_status === "pending" ? "Beklemede" : user?.kyc_status === "rejected" ? "Reddedildi" : "Başlanmadı";
  const kycColor = user?.kyc_status === "approved" ? "text-[#16A34A] bg-green-50" : user?.kyc_status === "pending" ? "text-[#D97706] bg-amber-50" : "text-[#64748B] bg-[#F1F5F9]";

  return (
    <header className="glass sticky top-0 z-30 border-b border-[#E2E8F0] flex items-center justify-between px-4 lg:px-8 h-14">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-[#64748B] -ml-1 p-2 rounded-lg hover:bg-[#F1F5F9]" onClick={onToggleSidebar} data-testid="mobile-menu-btn" aria-label="Menü">
          <List size={22} />
        </button>
        <Link to="/" className="lg:hidden flex items-center gap-2" data-testid="topnav-brand-mobile">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.site_name} className="h-7 max-w-[120px] object-contain" />
          ) : (
            <>
              <div className="w-7 h-7 rounded-md bg-[#16A34A] flex items-center justify-center text-white font-bold">C</div>
              <span className="font-display text-lg">{settings.site_name || "Coinberx"}</span>
            </>
          )}
        </Link>
        <Link to="/" className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]" data-testid="topnav-home-link">
          <House size={14} /> Anasayfa
        </Link>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-medium ${kycColor}`} data-testid="top-kyc-status">
          KYC: {kycLabel}
        </span>
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-[#F1F5F9] text-[#0F172A]"
            data-testid="notif-btn"
            aria-label="Bildirimler"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#16A34A]" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 card-surface p-2 max-h-[380px] overflow-y-auto scrollbar-thin z-40">
              <div className="px-3 py-2 text-xs text-[#64748B] uppercase tracking-wide">Bildirimler</div>
              {notifs.length === 0 ? (
                <div className="p-4 text-sm text-[#64748B]">Henüz bildirim yok.</div>
              ) : (
                notifs.map((n, i) => (
                  <div key={i} className="p-3 hover:bg-[#F8FAFC] rounded-lg cursor-default">
                    <div className="text-sm font-medium text-[#0F172A]">{n.title}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{n.body}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-[#F1F5F9]"
            data-testid="top-profile-btn"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-sm font-semibold">
                {user?.name?.[0]?.toUpperCase() || "C"}
              </div>
            )}
            <span className="text-sm hidden sm:inline text-[#0F172A] font-medium">{user?.name?.split(" ")[0]}</span>
            <CaretDown size={12} className="text-[#64748B] hidden sm:inline" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 card-surface p-1 z-40" data-testid="top-profile-menu">
              <div className="px-3 py-3 border-b border-[#E2E8F0]">
                <div className="text-sm font-medium text-[#0F172A] truncate">{user?.name || "Kullanıcı"}</div>
                <div className="text-xs text-[#64748B] truncate">{user?.email}</div>
              </div>
              {[
                { to: "/", icon: House, label: "Anasayfa" },
                { to: "/profile", icon: UserIcon, label: "Profilim" },
                { to: "/kyc", icon: IdentificationCard, label: "Kimlik Doğrulama (KYC)" },
                { to: "/wallet", icon: Wallet, label: "Cüzdanım" },
                { to: "/support", icon: Headset, label: "Destek" },
              ].map((it) => (
                <Link key={it.to} to={it.to} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#0F172A] hover:bg-[#F8FAFC]">
                  <it.icon size={14} className="text-[#64748B]" /> {it.label}
                </Link>
              ))}
              <button
                onClick={async () => { setProfileOpen(false); await logout(); nav("/login"); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#DC2626] hover:bg-red-50 border-t border-[#E2E8F0] mt-1"
                data-testid="logout-btn"
              >
                <SignOut size={14} /> Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
