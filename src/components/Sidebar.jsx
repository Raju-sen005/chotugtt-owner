import { NavLink, Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  LayoutGrid,
  MonitorSmartphone,
  ClipboardList,
  BookOpen,
  BarChart3,
  Wallet,
  Tag,
  Grid2x2,
  UserRound,
  Users,
  ShieldCheck,
  Crown,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", icon: LayoutGrid, label: "Overview" },
  { to: "/counter", icon: MonitorSmartphone, label: "Counter POS" },
  { to: "/orders", icon: ClipboardList, label: "Live Orders", badge: true },
  { to: "/menu", icon: BookOpen, label: "Menu Catalog" },
  { to: "/analysis", icon: BarChart3, label: "Analysis" },
  { to: "/payment", icon: Wallet, label: "Payment" },
  { to: "/offer", icon: Tag, label: "Offers" },
  { to: "/table-monitor", icon: Grid2x2, label: "Table Monitor" },
  { to: "/profile", icon: UserRound, label: "Profile" },
  { to: "/staff", icon: Users, label: "Staff & Captains" },
];

function formatExpiry(value) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Sidebar({ closeMobileSidebar }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const handleNavClick = useMemo(
    () => (closeMobileSidebar ? closeMobileSidebar : () => {}),
    [closeMobileSidebar],
  );

  const { data: liveOrders = [] } = useQuery({
    queryKey: ["live-orders", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/orders/live`,
        { withCredentials: true },
      );
      return res.data.data || [];
    },
    enabled: Boolean(restaurantId) && !isSuperAdmin,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  const navItems = isSuperAdmin
    ? [{ to: "/super-admin", icon: ShieldCheck, label: "Admin" }]
    : NAV_ITEMS;

  const expiry =
    user?.subscriptionExpiresAt || user?.restaurant?.subscriptionExpiresAt;
  const expiryLabel = formatExpiry(expiry);
  const subscriptionActive =
    user?.subscriptionStatus === "ACTIVE" ||
    (expiryLabel && new Date(expiry).getTime() > Date.now());

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border)] bg-white font-sans text-[var(--text-secondary)] select-none">
      <div className="px-6 pb-4 pt-6">
        <p className="text-[26px] font-black tracking-tight leading-none">
          <span className="text-[var(--text-primary)]">Chotu</span>
          <span className="text-[var(--secondary)]">GTT</span>
        </p>
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--primary-light)] text-[var(--primary-dark)]"
                  : "text-[#475569] hover:bg-[var(--primary-light)] hover:text-[var(--primary-dark)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--primary)]" />
                ) : null}
                <Icon
                  size={18}
                  strokeWidth={1.8}
                  className={isActive ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}
                />
                <span className="flex-1">{label}</span>
                {badge && liveOrders.length > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      isActive
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--primary)] text-white"
                    }`}
                  >
                    {liveOrders.length > 99 ? "99+" : liveOrders.length}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {!isSuperAdmin && (
        <div className="px-3 pb-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--secondary-light)] text-[var(--secondary)]">
                <Crown size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black leading-none">
                  <span className="text-[var(--text-primary)]">Chotu</span>
                  <span className="text-[var(--secondary)]">GTT</span>
                </p>
                <p className="mt-1 text-[10px] font-medium text-[var(--text-muted)]">
                  Restaurant Management
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2">
              <CheckCircle2
                size={16}
                className={
                  subscriptionActive
                    ? "text-[var(--success)]"
                    : "text-[var(--warning)]"
                }
              />
              <div>
                <p
                  className={`text-xs font-bold ${
                    subscriptionActive
                      ? "text-[var(--success)]"
                      : "text-[var(--warning)]"
                  }`}
                >
                  {subscriptionActive ? "Subscription Active" : "Subscription Inactive"}
                </p>
                {expiryLabel && (
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                    Valid till {expiryLabel}
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/subscription-checkout"
              onClick={handleNavClick}
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-[var(--primary)] py-2 text-xs font-bold text-white transition hover:bg-[var(--primary-dark)]"
            >
              Manage Plan
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
