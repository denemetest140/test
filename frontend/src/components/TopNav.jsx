import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Bell, SignOut, List } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function TopNav({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get("/notifications").then((r) => setNotifs(r.data || [])).catch(() => {});
  }, [user]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="glass sticky top-0 z-30 border-b border-[#1F2633] flex items-center justify-between px-4 lg:px-8 h-14">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-[#94A3B8]" onClick={onToggleSidebar} data-testid="mobile-menu-btn">
          <List size={22} />
        </button>
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#DCA335] flex items-center justify-center text-black font-bold">C</div>
          <span className="font-display text-lg">Coinberx</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs hidden sm:block text-[#94A3B8]">
          <span className="tabular">KYC: </span>
          <span className={`tabular font-medium ${
            user?.kyc_status === "approved" ? "text-[#10B981]" : user?.kyc_status === "pending" ? "text-[#F59E0B]" : "text-[#94A3B8]"
          }`} data-testid="top-kyc-status">
            {user?.kyc_status === "approved" ? "Onaylı" : user?.kyc_status === "pending" ? "Beklemede" : user?.kyc_status === "rejected" ? "Reddedildi" : "Başlanmadı"}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-[#11151E] text-[#F8FAFC]"
            data-testid="notif-btn"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#DCA335]" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 card-surface p-2 max-h-[380px] overflow-y-auto scrollbar-thin z-40">
              <div className="px-3 py-2 text-xs text-[#94A3B8]">Bildirimler</div>
              {notifs.length === 0 ? (
                <div className="p-4 text-sm text-[#94A3B8]">Henüz bildirim yok.</div>
              ) : (
                notifs.map((n, i) => (
                  <div key={i} className="p-3 hover:bg-[#11151E] rounded-lg">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-[#94A3B8] mt-0.5">{n.body}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <Link to="/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#11151E]" data-testid="top-profile-link">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#DCA335] text-black flex items-center justify-center text-sm font-semibold">
              {user?.name?.[0]?.toUpperCase() || "C"}
            </div>
          )}
          <span className="text-sm">{user?.name?.split(" ")[0]}</span>
        </Link>
        <button
          onClick={async () => {
            await logout();
            nav("/login");
          }}
          className="p-2 rounded-lg hover:bg-[#11151E] text-[#94A3B8] hover:text-white"
          data-testid="logout-btn"
          aria-label="Çıkış"
        >
          <SignOut size={18} />
        </button>
      </div>
    </header>
  );
}
