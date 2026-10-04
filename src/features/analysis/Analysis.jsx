import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import React from "react";
import axios from "axios";
import {
  Sun,
  Coffee,
  Moon,
  CloudSun,
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  Award,
  BarChart3,
  CalendarDays,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Module-level — har render pe new object not create
const HOURLY_ICONS = {
  Morning: <Sun className="w-4 h-4 text-amber-500" />,
  Afternoon: <CloudSun className="w-4 h-4 text-orange-400" />,
  Evening: <Coffee className="w-4 h-4 text-rose-500" />,
  Night: <Moon className="w-4 h-4 text-indigo-500" />,
};

function getHourlyCategory(hour) {
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

function Analysis() {
  const [showAllTables, setShowAllTables] = React.useState(false);
  const socket = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;

  React.useEffect(() => {
    if (!socket) return;

    const handleAnalyticsUpdated = () => {
      queryClient.invalidateQueries({
        queryKey: ["analytics"],
      });
    };

    socket.on("ANALYTICS_UPDATED", handleAnalyticsUpdated);

    return () => {
      socket.off("ANALYTICS_UPDATED", handleAnalyticsUpdated);
    };
  }, [socket, queryClient]);
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["analytics", restaurantId],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/analytics/summary`,
        { withCredentials: true },
      );
      return res.data.data;
    },
    staleTime: 60_000,
    enabled: !!restaurantId,
  });

  const chartData = React.useMemo(() => {
    if (!stats?.weeklyTrend) return [];
    return stats.weeklyTrend.map((item) => ({
      ...item,
      day: new Date(item.day).toLocaleDateString("en-US", { weekday: "short" }),
    }));
  }, [stats]);

  const tableStats = stats?.tableStats;

  const sortedTableStats = React.useMemo(() => {
    if (!tableStats) return [];
    return [...tableStats].sort((a, b) => {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      return String(a._id).localeCompare(String(b._id), undefined, {
        numeric: true,
      });
    });
  }, [tableStats]);

  const maxOrders = React.useMemo(() => {
    if (sortedTableStats.length === 0) return 1;
    return Math.max(...sortedTableStats.map((s) => s.orderCount), 1);
  }, [sortedTableStats]);

  const displayTables = showAllTables
    ? sortedTableStats
    : sortedTableStats.slice(0, 5);

  const hourlyData = React.useMemo(() => {
    if (!stats?.hourlyStats) {
      return { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    }
    return stats.hourlyStats.reduce(
      (acc, curr) => {
        const cat = getHourlyCategory(curr._id);
        acc[cat] = (acc[cat] || 0) + curr.count;
        return acc;
      },
      { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 },
    );
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400 text-sm font-medium">
        Loading Analytics Dashboard...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto mt-12">
        <p className="text-sm font-bold text-rose-500">
          Analytics data could not be loaded. Please refresh and try again.
        </p>
      </div>
    );
  }

  const rev = stats.revenueStats || {};
  const topItems = stats.topItems || [];
  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const parcelCount = sortedTableStats
    .filter((table) => String(table._id || "").toUpperCase() === "PARCEL")
    .reduce((sum, table) => sum + Number(table.orderCount || 0), 0);
  const dineCount = sortedTableStats
    .filter((table) => {
      const id = String(table._id || "").toUpperCase();
      return id && id !== "PARCEL" && id !== "N/A";
    })
    .reduce((sum, table) => sum + Number(table.orderCount || 0), 0);
  const typeTotal = parcelCount + dineCount;
  const typeSlices = [
    { name: "Dine In", value: dineCount, color: "#22C55E" },
    { name: "Parcel", value: parcelCount, color: "#FB923C" },
  ].filter((slice) => slice.value > 0);
  const hourlyChart = [
    { label: "6–12", name: "Morning", count: hourlyData.Morning },
    { label: "12–5", name: "Afternoon", count: hourlyData.Afternoon },
    { label: "5–9", name: "Evening", count: hourlyData.Evening },
    { label: "9–6", name: "Night", count: hourlyData.Night },
  ];
  const hourlyColors = ["#F59E0B", "#F97316", "#F43F5E", "#3B82F6"];

  const summaryCards = [
    {
      label: "Today Revenue",
      val: money(rev.today),
      icon: IndianRupee,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Total Revenue",
      val: money(rev.totalRevenue),
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total Orders",
      val: Number(rev.totalOrders || 0).toLocaleString("en-IN"),
      icon: ShoppingBag,
      color: "text-rose-600 bg-rose-50",
    },
    {
      label: "Top Items",
      val: topItems.length,
      icon: Award,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="-m-4 bg-[var(--background)] p-4 font-sans md:-m-6 md:p-5 lg:-m-8 lg:p-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/80">Business Analytics</p>
              <h2 className="text-2xl font-black tracking-tight">Restaurant Performance</h2>
              <p className="mt-1 max-w-xl text-sm text-white/85">
                Get insights about your sales, orders, popular items and table performance.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
            <p className="flex items-center justify-end gap-2 text-sm font-bold">
              <CalendarDays size={14} /> {todayLabel}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-emerald-100">Today</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon size={16} />
                </span>
                <p className="text-[11px] font-bold text-slate-400">{item.label}</p>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{item.val}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
              <BarChart3 size={16} className="text-rose-500" /> Sales Trend
            </h3>
            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-black text-white">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "#fff1f2" }}
                formatter={(value) => [money(value), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="sales" fill="#FB7185" radius={[6, 6, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
            <Clock size={16} className="text-orange-500" /> Hourly Order Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyChart}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <Tooltip
                cursor={{ fill: "#fff7ed" }}
                formatter={(value, _name, item) => [value, item?.payload?.name || "Orders"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={36}>
                {hourlyChart.map((entry, index) => (
                  <Cell key={entry.name} fill={hourlyColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-slate-900">Order Type Distribution</h3>
          {typeTotal === 0 ? (
            <p className="py-16 text-center text-xs font-semibold text-slate-400">No completed orders yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeSlices} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={3} stroke="none">
                      {typeSlices.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-black text-slate-900">{typeTotal}</p>
                  <p className="text-[10px] font-bold text-slate-400">Orders</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {typeSlices.map((slice) => (
                  <div key={slice.name}>
                    <p className="font-bold text-slate-800">{slice.name}</p>
                    <p className="text-xs text-slate-500">
                      {slice.value} · {Math.round((slice.value / typeTotal) * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-slate-900">Top Selling Items</h3>
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="pb-2">#</th>
                <th className="pb-2">Item Name</th>
                <th className="pb-2 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {topItems.length > 0 ? (
                topItems.map((item, index) => (
                  <tr key={`${item._id}-${index}`} className="border-t border-slate-50">
                    <td className="py-2 font-black text-rose-500">{index + 1}</td>
                    <td className="py-2 font-bold text-slate-800">{item._id}</td>
                    <td className="py-2 text-right font-black text-slate-700">{item.count}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-8 text-center text-slate-400">No top items yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">Table Performance</h3>
            {sortedTableStats.length > 5 && (
              <button type="button" onClick={() => setShowAllTables((open) => !open)} className="text-[11px] font-bold text-rose-500">
                {showAllTables ? "Show less" : "View all"}
              </button>
            )}
          </div>
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="pb-2">#</th>
                <th className="pb-2">Table</th>
                <th className="pb-2 text-right">Orders</th>
                <th className="pb-2 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {displayTables.length > 0 ? (
                displayTables.map((table, index) => {
                  const share = Math.round((table.orderCount / maxOrders) * 100);
                  const label = String(table._id || "").toUpperCase() === "PARCEL" ? "Parcel" : table._id || "N/A";
                  return (
                    <tr key={table._id || index} className="border-t border-slate-50">
                      <td className="py-2 font-black text-rose-500">{index + 1}</td>
                      <td className="py-2 font-bold text-slate-800">{label}</td>
                      <td className="py-2 text-right font-bold text-slate-700">{table.orderCount}</td>
                      <td className="py-2">
                        <div className="ml-auto flex w-24 items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${share}%` }} />
                          </div>
                          <span className="w-8 text-right text-[10px] font-bold text-slate-500">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">No completed orders yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-900">
            <Clock size={16} className="text-rose-500" /> Busiest Hours
          </h3>
          <div className="space-y-3">
            {hourlyChart.map((slot, index) => (
              <div key={slot.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {HOURLY_ICONS[slot.name]}
                  <div>
                    <p className="text-xs font-black text-slate-800">{slot.name}</p>
                    <p className="text-[10px] text-slate-400">{slot.label}</p>
                  </div>
                </div>
                <p className="text-sm font-black" style={{ color: hourlyColors[index] }}>{slot.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analysis;
