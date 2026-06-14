import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import MobileBottomNav from "./MobileBottomNav";
import MobileDrawer from "./MobileDrawer";
import { useState } from "react";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen flex bg-[#F7F9FC] text-[#0F172A]">
      <Sidebar />
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <TopNav onToggleSidebar={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-x-hidden pb-20 lg:pb-0">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
