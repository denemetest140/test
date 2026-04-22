import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";
import { useState } from "react";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-[#070A0F] text-[#F8FAFC]">
      <Sidebar />
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)}>
          <div className="w-[236px] h-full bg-[#070A0F] border-r border-[#1F2633]" onClick={(e) => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        <TopNav onToggleSidebar={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-x-hidden pb-16 lg:pb-0">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
