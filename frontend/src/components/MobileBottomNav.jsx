import { NavLink } from "react-router-dom";
import {
  ChartPieSlice,
  Storefront,
  ChartLineUp,
  Wallet,
  User,
} from "@phosphor-icons/react";

const items = [
  { to: "/markets", label: "Piyasa", icon: Storefront, testid: "mob-markets" },
  { to: "/trade/BTC", label: "Al-Sat", icon: ChartLineUp, testid: "mob-trade" },
  { to: "/deposit", label: "TL Yatır", icon: ChartPieSlice, testid: "mob-deposit" },
  { to: "/wallet", label: "Cüzdan", icon: Wallet, testid: "mob-wallet" },
  { to: "/profile", label: "Profil", icon: User, testid: "mob-profile" },
];

export default function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-[#E2E8F0] flex">
      {items.map(({ to, label, icon: Icon, testid }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={testid}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition ${
              isActive ? "text-[#16A34A]" : "text-[#64748B] hover:text-[#0F172A]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} weight={isActive ? "fill" : "regular"} />
              <span className="uppercase tracking-wide">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
