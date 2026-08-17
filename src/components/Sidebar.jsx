import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  QrCode,
  BarChart3,
  BadgePercent,
  Wallet,
  ScanLine,
  UserRound,
} from "lucide-react";
import logo from "../assets/cho.png";

const NAV_ITEMS = [
  {
    to: "/",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    to: "/counter",
    icon: ScanLine,
    label: "Counter POS",
  },
  {
    to: "/orders",
    icon: ClipboardList,
    label: "Live Orders",
  },
  {
    to: "/menu",
    icon: UtensilsCrossed,
    label: "Menu Catalog",
  },

  {
    to: "/analysis",
    icon: BarChart3,
    label: "Analysis",
  },
  {
    to: "/payment",
    icon: Wallet,
    label: "Payment",
  },
  {
    to: "/offer",
    icon: BadgePercent,
    label: "Offers",
  },
  {
    to: "/table-monitor",
    icon: QrCode,
    label: "Table Monitor",
  },
  {
    to: "/profile",
    icon: UserRound,
    label: "Profile",
  },
];

export default function Sidebar({ closeMobileSidebar }) {
  const handleNavClick = useMemo(
    () => (closeMobileSidebar ? closeMobileSidebar : () => {}),
    [closeMobileSidebar],
  );

  return (
    <aside className="w-64 bg-slate-900 text-white h-full min-h-screen flex flex-col border-r border-slate-800 font-sans select-none">
      {/* Brand Logo Header */}
      <div className="p-0 border-b border-slate-800/80 flex items-center justify-center min-h-[90px] overflow-hidden">
        <img src={logo} alt="Logo" className="max-h-30 w-auto object-contain" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 text-xs sm:text-sm font-bold tracking-tight ${
                isActive
                  ? "bg-rose-600 text-white shadow-md shadow-rose-900/40"
                  : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-400 group-hover:text-white"
                  }
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Version Info (Optional polish) */}
      <div className="p-4 border-t border-slate-800/80 mx-4 mb-2 text-center">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Store Operations v1.0
        </p>
      </div>
    </aside>
  );
}
