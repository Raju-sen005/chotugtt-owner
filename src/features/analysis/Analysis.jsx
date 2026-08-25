import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSocket } from "../../context/SocketContext";
import React from "react";
import axios from "axios";
import {
  Sun,
  Coffee,
  Moon,
  CloudSun,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const queryClient = useQueryClient();

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
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/analytics/summary`,
      );
      return res.data.data;
    },
    staleTime: 60_000,
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

  const summaryCards = [
    {
      label: "Today Revenue",
      val: `₹${Number(rev.today || 0).toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Total Revenue",
      val: `₹${Number(rev.totalRevenue || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Total Orders",
      val: rev.totalOrders || 0,
      icon: ShoppingBag,
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Top Items",
      val: topItems.length,
      icon: Award,
      color: "text-rose-600 bg-rose-50",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      {/* Header Section */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
          <BarChart3 size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Business Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track revenue metrics, sales trends, and table performance.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3"
            >
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {item.label}
                </p>
                <div className={`p-2 rounded-xl ${item.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {item.val}
              </h3>
            </div>
          );
        })}
      </div>

      {/* Charts & Hourly Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Sales Trend */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-base">
              Weekly Sales Trend
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Last 7 Days
            </span>
          </div>
          <div className="pt-4">
            <ResponsiveContainer
              width="100%"
              height={240}
              className="w-full !max-w-full"
            >
              <BarChart data={chartData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value) => [
                    `₹${Number(value || 0).toFixed(2)}`,
                    "Sales",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                  }}
                />
                <Bar
                  dataKey="sales"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Activity Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(hourlyData).map(([label, val]) => (
            <div
              key={label}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-red-200 transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  {label}
                </p>
                <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-red-50 transition-colors">
                  {HOURLY_ICONS[label]}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">{val}</h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  orders placed
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tables & Top Items Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table Performance */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-base">
              Table Performance
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {sortedTableStats.length} Tables Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 text-left font-bold">Table No.</th>
                  <th className="pb-3 text-right font-bold">Orders Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayTables.length > 0 ? (
                  displayTables.map((t) => {
                    const percentage = (t.orderCount / maxOrders) * 100;
                    return (
                      <tr
                        key={t._id}
                        className="group hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-4 font-bold text-slate-800">
                          Table {t._id || "N/A"}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <span className="font-black text-red-500">
                              {t.orderCount}
                            </span>
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="2"
                      className="py-12 text-center text-slate-400 italic text-xs"
                    >
                      No active orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {sortedTableStats.length > 5 && (
            <button
              onClick={() => setShowAllTables(!showAllTables)}
              className="w-full mt-2 py-3 text-xs text-red-600 font-bold bg-red-50/50 hover:bg-red-50 rounded-2xl transition cursor-pointer"
            >
              {showAllTables
                ? "Show Less Tables"
                : `View All (${sortedTableStats.length}) Tables`}
            </button>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-base">
              Top Selling Items
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {topItems.length} Featured Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3 text-left font-bold">Item Name</th>
                  <th className="pb-3 text-right font-bold">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topItems.length > 0 ? (
                  topItems.map((item, i) => (
                    <tr
                      key={i}
                      className="group hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 font-bold text-slate-800">
                        {item._id}
                      </td>
                      <td className="py-4 text-right">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-black rounded-full text-xs border border-emerald-100">
                          {item.count} sold
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="2"
                      className="py-12 text-center text-slate-400 italic text-xs"
                    >
                      No top items data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analysis;
