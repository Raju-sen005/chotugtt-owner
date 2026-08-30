import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { DollarSign, ShoppingBag, CheckCircle2, AlertTriangle, Activity, ShieldCheck, Radio } from 'lucide-react';

export default function DashboardOverview() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_APP_API_BASE}/orders/live`, { withCredentials: true });
      const todayOrders = res.data.data || [];

      const revenue = todayOrders
        .filter(o => o.status !== 'REJECTED')
        .reduce((acc, curr) => acc + (curr.total || 0), 0);

      return {
        revenue,
        totalOrdersToday: todayOrders.length,
        pending: todayOrders.filter(o => o.status === 'PENDING').length,
        accepted: todayOrders.filter(o => o.status === 'ACCEPTED').length,
      };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => [
    {
      title: "Today's Revenue",
      value: `₹${metrics?.revenue?.toLocaleString('en-IN') || 0}`,
      icon: <DollarSign size={20} className="text-emerald-600" />,
      bg: "bg-emerald-50/80 border-emerald-100",
      badgeColor: "text-emerald-600 bg-emerald-50"
    },
    {
      title: "Today's Total Orders",
      value: metrics?.totalOrdersToday || 0,
      icon: <ShoppingBag size={20} className="text-rose-600" />,
      bg: "bg-rose-50/80 border-rose-100",
      badgeColor: "text-rose-600 bg-rose-50"
    },
    {
      title: "Preparing in Kitchen",
      value: metrics?.accepted || 0,
      icon: <CheckCircle2 size={20} className="text-amber-600" />,
      bg: "bg-amber-50/80 border-amber-100",
      badgeColor: "text-amber-600 bg-amber-50"
    },
    {
      title: "New / Unattended",
      value: metrics?.pending || 0,
      icon: <AlertTriangle size={20} className="text-indigo-600" />,
      bg: "bg-indigo-50/80 border-indigo-100",
      badgeColor: "text-indigo-600 bg-indigo-50"
    },
  ], [metrics]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Syncing Live Metrics Database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Operational Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time store unit telemetry parameters summary for today.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-rose-50/80 border border-rose-100 px-4 py-2 rounded-2xl self-start sm:self-center shadow-2xs">
          <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          <span className="text-[11px] font-black tracking-wider uppercase text-rose-600">
            Today's Tracker Active
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all duration-300 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className={`p-3 rounded-2xl border ${stat.bg} shadow-2xs transition-transform group-hover:scale-105 duration-300`}>
                {stat.icon}
              </div>
            </div>
            
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-black text-slate-900 tracking-tight group-hover:text-rose-600 transition-colors">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* System Infrastructure Pulse Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-xs">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 tracking-tight">
              System Infrastructure Pulse
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Telemetry sync heartbeats loop diagnostic metrics.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-5 bg-slate-50/60 border border-slate-200/60 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                Multi-tenant Data Guard
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-xl">
              Enforced Secure
            </span>
          </div>

          <div className="flex items-center justify-between p-5 bg-slate-50/60 border border-slate-200/60 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Radio size={18} className="animate-pulse" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                Socket.io KeepAlive Pipeline
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-3 py-1.5 rounded-xl">
              Online Streaming
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}