import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BedDouble,
  CalendarCheck2,
  ContactRound,
  FileText,
  QrCode,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const QUICK_LINKS = [
  { to: "/rooms", icon: BedDouble, label: "Rooms" },
  { to: "/bookings", icon: CalendarCheck2, label: "Bookings" },
  { to: "/room-qr", icon: QrCode, label: "Room QR" },
  { to: "/room-folios", icon: FileText, label: "Room Billing" },
  { to: "/guests", icon: ContactRound, label: "Guests" },
];

export default function HotelOverview() {
  const { user } = useAuth();
  const restaurantName =
    user?.restaurant?.name || user?.restaurantName || "your hotel";

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["hotel-overview-rooms"],
    queryFn: async () => {
      const res = await axios.get("/rooms", { withCredentials: true });
      return res.data?.data || [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["hotel-overview-bookings"],
    queryFn: async () => {
      const res = await axios.get("/rooms/bookings", { withCredentials: true });
      return res.data?.data || [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const stats = useMemo(() => {
    const roomList = Array.isArray(rooms) ? rooms : [];
    const bookingList = Array.isArray(bookings) ? bookings : [];
    const activeStatuses = new Set([
      "CHECKED_IN",
      "CONFIRMED",
      "RESERVED",
      "ACTIVE",
    ]);
    const activeBookings = bookingList.filter((b) =>
      activeStatuses.has(String(b?.status || "").toUpperCase()),
    );
    return {
      roomCount: roomList.length,
      activeBookings: activeBookings.length,
      totalBookings: bookingList.length,
    };
  }, [rooms, bookings]);

  const loading = roomsLoading || bookingsLoading;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--text-muted)]">
          {greetingFor(new Date())}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)]">
          Hotel Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Operations snapshot for {restaurantName}. Restaurant POS and kitchen
          metrics are not included on hotel-only plans.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Rooms
          </p>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            {loading ? "—" : stats.roomCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Active stays
          </p>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            {loading ? "—" : stats.activeBookings}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Bookings
          </p>
          <p className="mt-2 text-3xl font-black text-[var(--text-primary)]">
            {loading ? "—" : stats.totalBookings}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Quick links
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
            >
              <Icon size={18} className="text-[var(--primary)]" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
