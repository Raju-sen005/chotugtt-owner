import { useEffect, useState, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";
import { useNotificationSound } from "../../hooks/useNotificationSound";
import {
  Eye,
  Check,
  X,
  Users,
  Radio,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import OrderDetailsModal from "../../components/OrderDetailsModal";

const OrderRow = memo(function OrderRow({ order, onStatusChange, onView }) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;

  return (
    <tr className="hover:bg-slate-50/80 transition-all duration-150">
      <td className="px-6 py-4 font-mono font-bold text-rose-600 text-xs sm:text-sm whitespace-nowrap">
        {order.orderId}
      </td>
      <td className="px-6 py-4 font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          Table {order.tableNumber}
          {hasMergedTables && (
            <span
              title={`Merged with Table ${order.mergedTables.join(", ")}`}
              className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
            >
              <Users size={10} /> +{order.mergedTables.join(", ")}
            </span>
          )}
        </span>
      </td>
      <td className="px-6 py-4 text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
        {order.customerName}
      </td>
      <td className="px-6 py-4 text-xs text-slate-600 font-medium">
        <div className="flex flex-col gap-0.5 max-w-[220px]">
          {order.items.map((i, index) => (
            <span
              key={index}
              className={`truncate ${i.status === "REJECTED" ? "line-through text-rose-400 text-[11px]" : ""}`}
            >
              • {i.quantity}x {i.name}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-right font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap">
        ₹{order.total?.toLocaleString("en-IN")}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          {order.status === "PENDING" ? (
            <>
              <button
                onClick={() => onStatusChange(order._id, "ACCEPTED")}
                className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-xl hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
                title="Accept Order"
              >
                <Check size={15} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => onStatusChange(order._id, "REJECTED")}
                className="p-2 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-xl hover:bg-rose-100 transition shadow-2xs cursor-pointer"
                title="Reject Order"
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60 px-3 py-1.5 rounded-xl">
              {order.status}
            </span>
          )}
          <button
            onClick={() => onView(order)}
            className="p-2 bg-white text-slate-600 border border-slate-200/80 rounded-xl hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="View Order Details"
          >
            <Eye size={15} strokeWidth={2.5} />
          </button>
        </div>
      </td>
    </tr>
  );
});

const TableStatusStrip = memo(function TableStatusStrip({ tables, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-none py-1 animate-pulse">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 w-20 bg-slate-100 rounded-2xl shrink-0"
          />
        ))}
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <p className="text-xs text-slate-400 font-medium py-2">
        No tables configured yet — add tables from Store Settings.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
      {tables.map((t) => (
        <div
          key={t.tableNumber}
          title={
            t.isOccupied
              ? `${t.occupiedBy?.customerName || "Occupied"} · ${t.occupiedBy?.orderId || ""}${
                  t.occupiedBy?.mergedWith?.length
                    ? ` · merged with Table ${t.occupiedBy.mergedWith.join(", ")}`
                    : ""
                }`
              : "Free"
          }
          className={`shrink-0 min-w-[76px] text-center rounded-2xl border px-3.5 py-2.5 transition-all cursor-default ${
            t.isOccupied
              ? "bg-rose-50/80 border-rose-200 text-rose-700 shadow-2xs"
              : "bg-emerald-50/80 border-emerald-200 text-emerald-700 shadow-2xs"
          }`}
        >
          <p className="text-xs font-black tracking-tight">T{t.tableNumber}</p>
          <p className="text-[9px] font-black uppercase tracking-wider mt-0.5 opacity-90">
            {t.isOccupied ? "Occupied" : "Free"}
          </p>
        </div>
      ))}
    </div>
  );
});

export default function LiveOrderMonitor() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const queryClient = useQueryClient();
  const socket = useSocket();
  const playAlert = useNotificationSound();
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [rejectReasonDropdown, setRejectReasonDropdown] =
    useState("Item Out of Stock");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["live-orders"],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/orders/live`,
        {
          withCredentials: true,
        },
      );
      return res.data.data || [];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: tableStatus = [], isLoading: isLoadingTableStatus } = useQuery({
    queryKey: ["table-status"],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_APP_API_BASE}/tables/status`,
        {
          withCredentials: true,
        },
      );
      return res.data.data || [];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      try {
        playAlert();
      } catch (e) {
        console.log("Audio play error:", e);
      }

      queryClient.setQueryData(["live-orders"], (oldOrders) => [
        newOrder,
        ...(oldOrders || []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["table-status"] });
      setCurrentPage(1);
    };

    // 🚀 Running order mein items add hone par sound bajane aur list update karne ke liye
    const handleOrderUpdated = (updatedOrder) => {
      queryClient.setQueryData(["live-orders"], (oldOrders) =>
        (oldOrders || []).map((order) =>
          order._id === updatedOrder._id ? updatedOrder : order,
        ),
      );
      queryClient.invalidateQueries({ queryKey: ["table-status"] });
    };

    const handlePlaySoundOnly = () => {
      try {
        playAlert();
      } catch (e) {
        console.log("Audio play error:", e);
      }
    };

    socket.on("NEW_ORDER_RECEIVED", handleNewOrder);
    socket.on("ORDER_STATUS_UPDATED", handleOrderUpdated);
    socket.on("PLAY_NOTIFICATION_SOUND", handlePlaySoundOnly);

    return () => {
      socket.off("NEW_ORDER_RECEIVED", handleNewOrder);
      socket.off("ORDER_STATUS_UPDATED", handleOrderUpdated);
      socket.off("PLAY_NOTIFICATION_SOUND", handlePlaySoundOnly);
    };
  }, [socket, queryClient, playAlert]);

  const handleStatusTransition = useCallback(
    async (orderId, targetStatus, customReason = "") => {
      let rejectReason = customReason;

      if (targetStatus === "REJECTED" && !rejectReason) {
        // Agar reason pass nahi hua to modal open karenge dropdown ke liye
        setRejectModalOrder(orderId);
        return;
      }

      try {
        const res = await axios.patch(
          `${import.meta.env.VITE_APP_API_BASE}/orders/${orderId}/status`,
          { status: targetStatus, rejectReason },
          { withCredentials: true },
        );

        const updatedOrderFromBackend = res.data.data;

        queryClient.setQueryData(["live-orders"], (oldOrders) =>
          (oldOrders || []).map((order) =>
            order._id === orderId
              ? {
                  ...order,
                  status: targetStatus,
                  rejectReason:
                    updatedOrderFromBackend?.rejectReason || rejectReason,
                }
              : order,
          ),
        );
        queryClient.invalidateQueries({ queryKey: ["table-status"] });
        setRejectModalOrder(null); // Modal close kar dein agar open ho toh
      } catch (err) {
        console.error("Error transitioning state context pipeline:", err);
      }
    },
    [queryClient],
  );

  const handleView = useCallback((order) => setSelectedOrder(order), []);
  const handleCloseModal = useCallback(() => setSelectedOrder(null), []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">
          Connecting to Live Kitchen Stream...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            Live Kitchen Monitor
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage incoming orders, table occupancy statuses, and kitchen
            execution queue.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-rose-50/80 border border-rose-100 px-4 py-2 rounded-2xl self-start sm:self-center shadow-2xs">
          <Radio size={16} className="text-rose-600 animate-pulse" />
          <span className="text-[11px] font-black tracking-wider uppercase text-rose-600">
            Stream Active
          </span>
        </div>
      </div>

      {/* Table Occupancy Strip */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Table Live Status Grid
          </p>
        </div>
        <TableStatusStrip
          tables={tableStatus}
          isLoading={isLoadingTableStatus}
        />
      </div>

      {/* Orders Section */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-3">
          <p className="text-sm font-bold text-slate-800">
            No live orders right now
          </p>
          <p className="text-xs text-slate-500 font-medium">
            New customer incoming orders will appear here automatically in
            real-time stream loop.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="sm:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider px-6 pt-4">
            ← Swipe horizontally to see table details →
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 whitespace-nowrap">Order ID</th>
                  <th className="px-6 py-4 whitespace-nowrap">Table</th>
                  <th className="px-6 py-4 whitespace-nowrap">Customer</th>
                  <th className="px-6 py-4 whitespace-nowrap">Items Summary</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">
                    Total
                  </th>
                  <th className="px-6 py-4 text-center whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentOrders.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    onStatusChange={handleStatusTransition}
                    onView={handleView}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer inside card container */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(indexOfLastOrder, orders.length)} of {orders.length}{" "}
                orders
              </p>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  <ArrowLeft size={14} /> Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {rejectModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">
              Select Rejection Reason
            </h3>
            <p className="text-xs text-slate-500">
              Please choose a reason why this order is being rejected:
            </p>

            <select
              value={rejectReasonDropdown}
              onChange={(e) => setRejectReasonDropdown(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="Item Out of Stock">Item Out of Stock</option>
              <option value="Kitchen Closed / Overloaded">
                Kitchen Closed / Overloaded
              </option>
              <option value="Customer Requested Cancellation">
                Customer Requested Cancellation
              </option>
              <option value="Store Closing Time">Store Closing Time</option>
            </select>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusTransition(
                    rejectModalOrder,
                    "REJECTED",
                    rejectReasonDropdown,
                  )
                }
                className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-rose-700 shadow-lg shadow-rose-600/20"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={handleCloseModal} />
      )}
    </div>
  );
}
