import { NavLink } from "react-router-dom";
import {
  House,
  Storefront,
  ChartLineUp,
  Wallet,
  User,
} from "@phosphor-icons/react";

const items = [
  { to: "/", label: "Anasayfa", icon: House, testid: "mob-home", exact: true },
  { to: "/markets", label: "Piyasa", icon: Storefront, testid: "mob-markets" },
  { to: "/trade/BTC", label: "Al-Sat", icon: ChartLineUp, testid: "mob-trade" },
  { to: "/wallet", label: "Cüzdan", icon: Wallet, testid: "mob-wallet" },
  { to: "/profile", label: "Profil", icon: User, testid: "mob-profile" },
];

export default function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-[#E2E8F0] flex shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
      {items.map(({ to, label, icon: Icon, testid, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          data-testid={testid}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition ${
              isActive ? "text-[#16A34A]" : "text-[#64748B] hover:text-[#0F172A]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} weight={isActive ? "fill" : "regular"} />
              <span className="uppercase tracking-wide font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
