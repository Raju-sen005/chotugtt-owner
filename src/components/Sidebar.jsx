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
  CalendarDays,
  Package,
  BedDouble,
  ContactRound,
  CalendarCheck2,
  QrCode,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasRoomManagementAccess } from "../features/rooms/roomsAccess";
import { hasGuestManagementAccess } from "../features/guests/guestsAccess";
import { hasRoomBookingAccess } from "../features/bookings/bookingsAccess";
import { hasRoomQrAccess } from "../features/roomQr/roomQrAccess";
import { hasRoomFolioAccess } from "../features/folios/folioAccess";
import { hasEventManagementAccess } from "../features/events/eventsAccess";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../features/subscription/featureAccess";
import {
  HOTEL_ONLY_NAV_PATHS,
  isHotelOnlyPlan,
} from "./sidebarHotelNav";

const HOTEL_ONLY_NAV_ITEMS = Object.freeze([
  { to: "/", icon: LayoutGrid, label: "Hotel Overview" },
  { to: HOTEL_ONLY_NAV_PATHS[0], icon: BedDouble, label: "Rooms" },
  { to: HOTEL_ONLY_NAV_PATHS[1], icon: CalendarCheck2, label: "Bookings" },
  { to: HOTEL_ONLY_NAV_PATHS[2], icon: QrCode, label: "Room QR" },
  { to: HOTEL_ONLY_NAV_PATHS[3], icon: FileText, label: "Room Billing" },
  { to: HOTEL_ONLY_NAV_PATHS[4], icon: ContactRound, label: "Guests" },
  { to: "/profile", icon: UserRound, label: "Profile" },
]);

function formatExpiry(value) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildRestaurantNavItems(user, {
  showRoomsManagement,
  showBookingManagement,
  showRoomQrManagement,
  showRoomFolioManagement,
  showGuestManagement,
  showEventManagement,
  canManageStaff,
}) {
  const items = [{ to: "/", icon: LayoutGrid, label: "Overview" }];

  if (hasAvailableFeature(user, FEATURE_KEYS.POS)) {
    items.push({
      to: "/counter",
      icon: MonitorSmartphone,
      label: "Counter POS",
    });
    items.push({
      to: "/orders",
      icon: ClipboardList,
      label: "Live Orders",
      badge: true,
    });
  }

  if (hasAvailableFeature(user, FEATURE_KEYS.MENU)) {
    items.push({ to: "/menu", icon: BookOpen, label: "Menu Catalog" });
  }

  if (hasAvailableFeature(user, FEATURE_KEYS.ANALYSIS)) {
    items.push({ to: "/analysis", icon: BarChart3, label: "Analysis" });
  }

  if (
    hasAvailableFeature(user, FEATURE_KEYS.PAYMENTS) ||
    hasAvailableFeature(user, FEATURE_KEYS.BILLING)
  ) {
    items.push({ to: "/payment", icon: Wallet, label: "Payment" });
  }

  if (hasAvailableFeature(user, FEATURE_KEYS.OFFERS)) {
    items.push({ to: "/offer", icon: Tag, label: "Offers" });
  }

  if (hasAvailableFeature(user, FEATURE_KEYS.QR_TABLE)) {
    items.push({
      to: "/table-monitor",
      icon: Grid2x2,
      label: "Table Monitor",
    });
  }

  items.push({ to: "/profile", icon: UserRound, label: "Profile" });

  if (canManageStaff) {
    items.push({ to: "/staff", icon: Users, label: "Staff & Captains" });
  }

  if (showRoomsManagement) {
    items.push({ to: "/rooms", icon: BedDouble, label: "Rooms" });
  }
  if (showBookingManagement) {
    items.push({ to: "/bookings", icon: CalendarCheck2, label: "Bookings" });
  }
  if (showRoomQrManagement) {
    items.push({ to: "/room-qr", icon: QrCode, label: "Room QR" });
  }
  if (showRoomFolioManagement) {
    items.push({ to: "/room-folios", icon: FileText, label: "Room Billing" });
  }
  if (showGuestManagement) {
    items.push({ to: "/guests", icon: ContactRound, label: "Guests" });
  }
  if (showEventManagement) {
    items.push({
      to: "/events",
      icon: CalendarDays,
      label: "Event Management",
    });
  }

  return items;
}

export default function Sidebar({ closeMobileSidebar }) {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const hotelOnlyPlan = !isSuperAdmin && isHotelOnlyPlan(user);
  const canManageStaff = ["OWNER", "MANAGER"].includes(user?.role);
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
    enabled: Boolean(restaurantId) && !isSuperAdmin && !hotelOnlyPlan,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  const expiry =
    user?.subscriptionExpiresAt ||
    user?.restaurant?.subscriptionExpiresAt ||
    null;

  const expiryLabel = formatExpiry(expiry);

  const subscriptionActive =
    user?.subscriptionStatus === "ACTIVE" &&
    Boolean(expiry) &&
    Number.isFinite(new Date(expiry).getTime()) &&
    new Date(expiry).getTime() > Date.now();

  const showEventManagement = !isSuperAdmin && hasEventManagementAccess(user);
  const showRoomsManagement = !isSuperAdmin && hasRoomManagementAccess(user);
  const showGuestManagement = !isSuperAdmin && hasGuestManagementAccess(user);
  const showBookingManagement = !isSuperAdmin && hasRoomBookingAccess(user);
  const showRoomQrManagement = !isSuperAdmin && hasRoomQrAccess(user);
  const showRoomFolioManagement = !isSuperAdmin && hasRoomFolioAccess(user);

  const navItems = isSuperAdmin
    ? [
        {
          to: "/super-admin",
          icon: ShieldCheck,
          label: "Admin",
        },
        {
          to: "/super-admin/supply",
          icon: Package,
          label: "Supply Management",
        },
      ]
    : hotelOnlyPlan
      ? [
          ...HOTEL_ONLY_NAV_ITEMS,
          ...(canManageStaff
            ? [{ to: "/staff", icon: Users, label: "Staff" }]
            : []),
        ]
      : buildRestaurantNavItems(user, {
          showRoomsManagement,
          showBookingManagement,
          showRoomQrManagement,
          showRoomFolioManagement,
          showGuestManagement,
          showEventManagement,
          canManageStaff,
        });

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] font-sans text-[var(--text-secondary)] select-none">
      <div className="flex items-center px-5 pb-4 pt-5">
        <img
          src="/brand/transserve-logo-nav.svg"
          alt="Transserve"
          className="h-11 w-auto max-w-[200px] object-contain object-left"
        />
      </div>

      <nav className="no-scrollbar min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--primary-light)] text-[var(--brand-navy)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--brand-navy)]"
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
                  className={
                    isActive
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
                <span className="flex-1 text-[var(--brand-navy)]">{label}</span>
                {badge && liveOrders.length > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-bold text-white">
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
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
            <div className="mt-3 flex items-start gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--secondary-light)] text-[var(--secondary)]">
                <Crown size={15} />
              </span>
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
                  {subscriptionActive
                    ? "Subscription Active"
                    : "Subscription Inactive"}
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
              className="gtt-btn-primary mt-3 flex w-full items-center justify-center py-2.5 text-xs font-bold text-white"
            >
              Manage Plan
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
