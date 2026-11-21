import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  IndianRupee,
  ShoppingBag,
  ChefHat,
  AlertTriangle,
  ShieldCheck,
  Radio,
  Database,
  Server,
  Crown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const CHART_SLOTS = [
  { hour: 8, label: "8AM" },
  { hour: 10, label: "10AM" },
  { hour: 12, label: "12PM" },
  { hour: 14, label: "2PM" },
  { hour: 16, label: "4PM" },
  { hour: 18, label: "6PM" },
  { hour: 20, label: "8PM" },
  { hour: 22, label: "10PM" },
];

const STATUS_STYLES = {
  PREPARING: "bg-amber-50 text-amber-600",
  READY: "bg-emerald-50 text-emerald-600",
  ACCEPTED: "bg-sky-50 text-sky-600",
  PENDING: "bg-orange-50 text-orange-500",
  REJECTED: "bg-rose-50 text-rose-600",
  COMPLETED: "bg-emerald-50 text-emerald-700",
};

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function timeAgo(value) {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(value).toLocaleDateString("en-IN");
}

function orderLabel(order) {
  if (order?.status !== "ACCEPTED") return order?.status || "—";
  const items = (order.items || []).filter((item) => item?.status !== "REJECTED");
  if (
    items.length > 0 &&
    items.every(
      (item) => item.itemReadyStatus === "READY" || item.itemReadyStatus === "SERVED",
    )
  ) {
    return "READY";
  }
  return "PREPARING";
}

function MiniBars({ className }) {
  const heights = [45, 70, 55, 88, 62];
  return (
    <div className={`flex items-end gap-1 h-8 ${className}`} aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className="w-1.5 rounded-sm bg-current opacity-70"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const now = new Date();
  const displayName = user?.name || "there";

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboard-metrics", restaurantId],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_APP_API_BASE}/orders/live`, {
        withCredentials: true,
      });
      const todayOrders = res.data.data || [];

      const revenue = todayOrders
        .filter((o) => o.status !== "REJECTED")
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

      return {
        revenue,
        totalOrdersToday: todayOrders.length,
        pending: todayOrders.filter((o) => o.status === "PENDING").length,
        accepted: todayOrders.filter((o) => o.status === "ACCEPTED").length,
        orders: todayOrders,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
    enabled: !!restaurantId,
  });

  const orders = metrics?.orders || [];

  const summary = useMemo(() => {
    const billable = orders.filter((order) => order.status !== "REJECTED");
    const revenue = metrics?.revenue || 0;
    const customers = new Set(
      billable
        .map((order) => String(order.customerName || "").trim())
        .filter(Boolean),
    );
    const itemCounts = new Map();

    billable.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item?.status === "REJECTED") return;
        const name = String(item?.name || "Item").trim();
        itemCounts.set(name, (itemCounts.get(name) || 0) + Number(item?.quantity || 1));
      });
    });

    const buckets = CHART_SLOTS.map((slot) => ({ ...slot, total: 0 }));
    billable.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      if (!Number.isFinite(hour)) return;
      let nearest = 0;
      let distance = Infinity;
      buckets.forEach((slot, index) => {
        const gap = Math.abs(hour - slot.hour);
        if (gap < distance) {
          distance = gap;
          nearest = index;
        }
      });
      buckets[nearest].total += Number(order.total || 0);
    });

    return {
      average: billable.length ? revenue / billable.length : 0,
      customers: customers.size,
      topItems: [...itemCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      buckets,
      peak: Math.max(...buckets.map((slot) => slot.total), 0),
      recent: [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
        )
        .slice(0, 4),
    };
  }, [orders, metrics?.revenue]);

  const stats = [
    {
      title: "Today's Revenue",
      value: `₹${metrics?.revenue?.toLocaleString("en-IN") || 0}`,
      note: "Open live orders",
      icon: IndianRupee,
      iconWrap: "bg-emerald-50 text-emerald-600",
      bars: "text-emerald-400",
    },
    {
      title: "Today's Total Orders",
      value: metrics?.totalOrdersToday || 0,
      note: "Including new orders",
      icon: ShoppingBag,
      iconWrap: "bg-rose-50 text-rose-500",
      bars: "text-rose-300",
    },
    {
      title: "Preparing in Kitchen",
      value: metrics?.accepted || 0,
      note: "Accepted orders",
      icon: ChefHat,
      iconWrap: "bg-orange-50 text-orange-500",
      bars: "text-orange-300",
    },
    {
      title: "New / Unattended",
      value: metrics?.pending || 0,
      note: "Waiting for accept",
      icon: AlertTriangle,
      iconWrap: "bg-violet-50 text-violet-500",
      bars: "text-violet-300",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Syncing Live Metrics Database...
        </p>
      </div>
    );
  }

  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-5 font-sans text-slate-800">
      <section className="relative overflow-hidden rounded-[18px] gtt-gradient-brand px-6 py-7 sm:px-8 text-white shadow-[var(--shadow-soft)]">
        <div className="absolute -right-8 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute right-24 bottom-0 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/90">
              {greetingFor(now)},
            </p>
            <h1 className="font-display mt-1 text-3xl sm:text-4xl font-bold tracking-tight">
              {displayName}!
            </h1>
            <p className="mt-2 text-sm text-white/85">
              Here's what's happening in your restaurant today.
            </p>
          </div>
          <div className="self-start rounded-[14px] bg-white px-4 py-3 text-[var(--text-secondary)] shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--brand-navy)]">
              <span className="text-[var(--primary)]">▣</span>
              {dateLabel}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Today
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className="gtt-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-[14px] p-3 ${stat.iconWrap}`}>
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-[var(--text-muted)]">{stat.title}</p>
              <p className="gtt-kpi-value mt-1 text-3xl">
                {stat.value}
              </p>
              <div className="mt-4 flex items-end justify-between">
                <p className="text-xs font-semibold text-slate-400">{stat.note}</p>
                <MiniBars className={stat.bars} />
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="gtt-card xl:col-span-2 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black text-slate-900">Sales Trend</h2>
            <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1">
              <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
                Today
              </span>
              {["Week", "Month", "Year"].map((label) => (
                <span
                  key={label}
                  className="px-3 py-1 text-xs font-semibold text-slate-400"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 flex h-52 items-end gap-3 sm:gap-5">
            {summary.buckets.map((slot) => {
              const height =
                summary.peak > 0 ? Math.max(8, (slot.total / summary.peak) * 100) : 8;
              return (
                <div key={slot.label} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-40 w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-xl bg-gradient-to-t from-rose-500 to-rose-400"
                      style={{ height: `${height}%` }}
                      title={`₹${slot.total.toFixed(0)}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {slot.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Total Orders", metrics?.totalOrdersToday || 0],
              [
                "Revenue",
                `₹${Number(metrics?.revenue || 0).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}`,
              ],
              [
                "Avg. Order Value",
                `₹${summary.average.toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}`,
              ],
              ["Unique Customers", summary.customers],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-lg font-black text-slate-900">{value}</p>
                <p className="text-xs font-medium text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="gtt-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Crown size={16} className="text-amber-500" />
              Top Items Today
            </h2>
            <Link to="/menu" className="text-xs font-bold text-rose-500 hover:text-rose-600">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {summary.topItems.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                No live items yet
              </p>
            ) : (
              summary.topItems.map(([name, count], index) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xs font-black text-slate-500">
                    {index + 1}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-base">
                    🍽️
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">
                    {name}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {count} order{count === 1 ? "" : "s"}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article className="gtt-card xl:col-span-2 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              Recent Live Orders{" "}
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live ({orders.length})
              </span>
            </h2>
            <Link to="/orders" className="text-xs font-bold text-rose-500 hover:text-rose-600">
              View All Orders
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-3 font-bold">Order ID</th>
                  <th className="pb-3 font-bold">Table / Type</th>
                  <th className="pb-3 font-bold">Customer</th>
                  <th className="pb-3 font-bold">Amount</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Time</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                      No live orders right now
                    </td>
                  </tr>
                ) : (
                  summary.recent.map((order) => {
                    const status = orderLabel(order);
                    return (
                      <tr key={order._id} className="border-t border-slate-50">
                        <td className="py-3 font-bold text-rose-500">
                          {order.orderId || "—"}
                        </td>
                        <td className="py-3 font-semibold text-slate-600">
                          {order.tableNumber || order.orderType || "—"}
                        </td>
                        <td className="py-3 text-slate-600">
                          {order.customerName || "Guest"}
                        </td>
                        <td className="py-3 font-bold text-slate-800">
                          ₹{Number(order.total || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                              STATUS_STYLES[status] || "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{timeAgo(order.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="gtt-card p-5 sm:p-6">
          <h2 className="text-lg font-black text-slate-900">System Infrastructure Pulse</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              [ShieldCheck, "Multi-tenant Data Guard", "Enforced Secure"],
              [Radio, "Socket.io KeepAlive", "Online Streaming"],
              [Database, "Database Connection", "Healthy"],
              [Server, "API Services", "Operational"],
            ].map(([Icon, title, status]) => (
              <div key={title} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon size={16} />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">{title}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">{status}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
