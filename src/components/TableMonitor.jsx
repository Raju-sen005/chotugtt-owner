import { useEffect, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Users, Receipt, ShieldCheck, Sparkles } from "lucide-react";
import { useSocket } from "../context/SocketContext";

const TableCard = memo(function TableCard({ order, onClear }) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 opacity-50 group-hover:scale-110 transition-transform duration-500" />
      
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-block">
              Occupied Active
            </span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 pt-1">
              Table {order.tableNumber}
              {hasMergedTables && (
                <span
                  title={`Merged with Table ${order.mergedTables.join(", ")}`}
                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                >
                  <Users size={10} /> +{order.mergedTables.join(", ")}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="bg-slate-50/80 border border-slate-100 p-4 rounded-2xl space-y-1">
          <p className="font-bold text-slate-900 text-sm tracking-tight">{order.customerName}</p>
          <p className="text-xs text-slate-500 font-medium">{order.customerPhone || "No phone provided"}</p>
        </div>

        <div className="flex items-baseline justify-between pt-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Bill</span>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{order.total?.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <div className="pt-6 relative z-10">
        <button
          onClick={() => onClear(order)}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          <Receipt size={16} strokeWidth={2.5} /> Generate Bill & Clear Table
        </button>
      </div>
    </div>
  );
});

export default function TableMonitor() {
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ["table-monitor-orders"],
    queryFn: async () => {
      const res = await axios.get(`${import.meta.env.VITE_APP_API_BASE}/orders/live`, {
        withCredentials: true,
      });
      return (res.data.data || []).filter(
        (o) => o.status === "ACCEPTED" && o.tableNumber !== "N/A",
      );
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!socket) return;

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["table-monitor-orders"] });

    socket.on("NEW_ORDER_RECEIVED", refresh);
    socket.on("ORDER_STATUS_UPDATED", refresh);
    return () => {
      socket.off("NEW_ORDER_RECEIVED", refresh);
      socket.off("ORDER_STATUS_UPDATED", refresh);
    };
  }, [socket, queryClient]);

  const handleBillAndWhatsApp = useCallback(
    async (order) => {
      const tableLabel = order.mergedTables?.length
        ? `${order.tableNumber} & ${order.mergedTables.join(", ")}`
        : order.tableNumber;

      const confirmed = window.confirm(
        `Send the bill to ${order.customerName} (Table ${tableLabel}) and clear the table? This can't be undone.`,
      );
      if (!confirmed) return;

      const message = ` *PAYMENT RECEIPT*

Hello *${order.customerName}*,

Thank you for dining with us.
Your payment has been successfully received.

 *Table No:* ${tableLabel}
 *Total Paid:* ₹${Number(order.total).toFixed(2)}

━━━━━━━━━━━━━━━━━━

We hope you enjoyed your experience.

Thank you for choosing us.
We look forward to serving you again!

 Have a wonderful day.`;

      let formattedPhone = String(order.customerPhone || "").replace(/\D/g, "");
      if (formattedPhone && !formattedPhone.startsWith("91")) {
        formattedPhone = `91${formattedPhone}`;
      }

      if (formattedPhone) {
        window.open(
          `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`,
          "_blank",
        );
      } else {
        console.warn("No customer phone on file — skipping WhatsApp, completing order anyway.");
      }

      try {
        await axios.patch(
          `${import.meta.env.VITE_APP_API_BASE}/orders/${order._id}/complete`,
          {},
          { withCredentials: true },
        );

        queryClient.setQueryData(["table-monitor-orders"], (prev) =>
          (prev || []).filter((o) => o._id !== order._id),
        );
        queryClient.invalidateQueries({ queryKey: ["table-status"] });
      } catch (err) {
        console.error("Failed to complete order", err);
        queryClient.invalidateQueries({ queryKey: ["table-monitor-orders"] });
      }
    },
    [queryClient],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Loading table status...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Live Table Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor active dining tables, review live bills, and process checkout completions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-50/80 border border-emerald-100 px-4 py-2 rounded-2xl self-start sm:self-center shadow-2xs">
          <Sparkles size={16} className="text-emerald-600" />
          <span className="text-[11px] font-black tracking-wider uppercase text-emerald-700">
            {activeOrders.length} Tables Occupied
          </span>
        </div>
      </div>

      {/* Grid Content */}
      {activeOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-3">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 border border-emerald-100">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-black text-slate-900">All Tables Are Free</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              There are no active dine-in orders at the moment. All tables are available for new customers.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map((order) => (
            <TableCard key={order._id} order={order} onClear={handleBillAndWhatsApp} />
          ))}
        </div>
      )}
    </div>
  );
}