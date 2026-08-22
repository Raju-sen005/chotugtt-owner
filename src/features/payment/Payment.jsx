import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Download,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Smartphone,
  Receipt,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useSocket } from "../../context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
const PAYMENT_TABS = [
  { key: "CASH", label: "Cash", icon: Wallet, accent: "emerald" },
  { key: "UPI", label: "UPI", icon: Smartphone, accent: "indigo" },
  { key: "DUE", label: "Due", icon: Receipt, accent: "amber" },
];

const ACCENT_MAP = {
  emerald: {
    active: "bg-emerald-600 text-white shadow-emerald-500/20",
    ring: "ring-emerald-200",
    text: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  indigo: {
    active: "bg-indigo-600 text-white shadow-indigo-500/20",
    ring: "ring-indigo-200",
    text: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  amber: {
    active: "bg-amber-500 text-white shadow-amber-500/20",
    ring: "ring-amber-200",
    text: "text-amber-600",
    bg: "bg-amber-50",
  },
};

function SkeletonRow() {
  return (
    <tr>
      <td className="p-4 sm:p-5">
        <div className="h-3 w-32 rounded-full bg-slate-100 animate-pulse" />
      </td>
      <td className="p-4 sm:p-5">
        <div className="h-3 w-24 rounded-full bg-slate-100 animate-pulse" />
      </td>
      <td className="p-4 sm:p-5">
        <div className="h-3 w-16 rounded-full bg-slate-100 animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

export default function Payment() {
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [filter, setFilter] = React.useState("today");
  const [currentPage, setCurrentPage] = React.useState(1);
  const socket = useSocket();
  const queryClient = useQueryClient();
  const ITEMS_PER_PAGE = 10;
  const API_BASE = import.meta.env.VITE_APP_API_BASE;

  React.useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (order) => {
      if (!order?._id) return;

      queryClient.invalidateQueries({
        queryKey: ["bills"],
      });

      queryClient.invalidateQueries({
        queryKey: ["bills-prev"],
      });
    };

    socket.on("ORDER_STATUS_UPDATED", handleOrderUpdate);

    return () => {
      socket.off("ORDER_STATUS_UPDATED", handleOrderUpdate);
    };
  }, [socket, queryClient]);
  const { data: billingData, isLoading } = useQuery({
    queryKey: ["bills", filter, paymentMethod],
    queryFn: () =>
      axios
        .get(
          `${API_BASE}/orders/billing?filter=${filter}&paymentMethod=${paymentMethod}`,
          { withCredentials: true },
        )
        .then((res) => res.data),
    staleTime: 10_000,
  });

  const bills = billingData?.data || [];
  const summary = billingData?.summary || {};

  const { data: prevData } = useQuery({
    queryKey: ["bills-prev", filter],
    queryFn: () =>
      axios
        .get(`${API_BASE}/orders/billing/previous?filter=${filter}`, {
          withCredentials: true,
        })
        .then((res) => res.data)
        .catch(() => ({ total: 0 })),
  });

  const totalBills = bills?.length || 0;
  const totalPages = Math.ceil(totalBills / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBills = bills?.slice(startIndex, endIndex) || [];

  const totalRevenue =
    bills?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
  const prevRevenue = prevData?.total || 0;

  const revenueDifference = totalRevenue - prevRevenue;
  const isProfit = revenueDifference > 0;

  const percentageChange =
    prevRevenue > 0
      ? ((Math.abs(revenueDifference) / prevRevenue) * 100).toFixed(1)
      : totalRevenue > 0
        ? "100"
        : "0";

  const handleDownload = () => {
    if (!bills || bills.length === 0) return;
    const formattedData = bills.map((bill) => ({
      "Order ID": bill.orderId,
      Customer: bill.customerName,
      Phone: bill.customerPhone,
      "Order Type": bill.orderType,
      Table: bill.tableNumber,
      Subtotal: bill.subtotal,
      Tax: bill.tax,
      "Total Amount": bill.total,
      Status: bill.status,
      Date: new Date(bill.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
    XLSX.writeFile(workbook, `Payment_Report_${filter}.xlsx`);
  };

  const summaryValues = {
    CASH: { amount: summary.cash || 0, count: summary.cashCount || 0 },
    UPI: { amount: summary.upi || 0, count: summary.upiCount || 0 },
    DUE: { amount: summary.due || 0, count: summary.dueCount || 0 },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto font-sans bg-[#F8F9FA] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Payment History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Overview of your store's revenue and financial performance.
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={!bills.length}
          className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-95 active:scale-95 transition shadow-sm shadow-red-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>

      {/* Date range filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {["today", "week", "month", "year"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer whitespace-nowrap ${
              filter === f
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Payment method summary cards — always visible, active tab highlighted */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {PAYMENT_TABS.map(({ key, label, icon: Icon, accent }) => {
          const isActive = paymentMethod === key;
          const colors = ACCENT_MAP[accent];
          const { amount, count } = summaryValues[key];

          return (
            <button
              key={key}
              onClick={() => {
                setPaymentMethod(key);
                setCurrentPage(1);
              }}
              className={`text-left bg-white p-5 rounded-3xl border transition cursor-pointer ${
                isActive
                  ? `border-transparent ring-2 ${colors.ring} shadow-sm`
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors.bg} ${colors.text}`}
                >
                  <Icon size={16} strokeWidth={2.5} />
                </span>
                <span
                  className={`text-[10px] uppercase font-black tracking-widest ${
                    isActive ? colors.text : "text-slate-300"
                  }`}
                >
                  {isActive ? "Selected" : ""}
                </span>
              </div>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                {label} Collection
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                ₹{Number(amount).toLocaleString("en-IN")}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {count} {label.toLowerCase()} transaction
                {count === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Revenue comparison card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
              Total Revenue ({filter})
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              vs previous {filter}:{" "}
              <span className="font-bold text-slate-600">
                ₹{prevRevenue.toLocaleString("en-IN")}
              </span>
            </p>
          </div>

          {revenueDifference !== 0 ? (
            <span
              className={`self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase ${
                isProfit
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}
            >
              {isProfit ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {percentageChange}% {isProfit ? "Profit" : "Loss"}
            </span>
          ) : (
            <span className="self-start sm:self-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase bg-slate-100 text-slate-500">
              <Minus size={14} /> No Change
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-sm">
            Transaction Logs
          </h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            {totalBills} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-400 text-left uppercase text-[10px] font-black tracking-wider">
                <th className="p-4 sm:p-5">OrderId</th>
                <th className="p-4 sm:p-5">Customer Name</th>
                <th className="p-4 sm:p-5">Date & Time</th>
                <th className="p-4 sm:p-5">Table / Type</th>
                <th className="p-4 sm:p-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : bills?.length > 0 ? (
                paginatedBills.map((bill) => (
                  <tr
                    key={bill._id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 sm:p-5 text-slate-600">
                      {bill.orderId}
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600">
                      {bill.customerName}
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600">
                      {new Date(bill.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-slate-800">
                      Table {bill.tableNumber}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ({bill.orderType || "Dine-in"})
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right font-black text-slate-900">
                      ₹{bill.total}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <Receipt size={32} strokeWidth={1.5} />
                      <p className="text-sm text-slate-400 italic">
                        No payment records found
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-medium">
              Showing{" "}
              <span className="font-bold text-slate-700">{startIndex + 1}</span>{" "}
              to{" "}
              <span className="font-bold text-slate-700">
                {Math.min(endIndex, totalBills)}
              </span>{" "}
              of <span className="font-bold text-slate-700">{totalBills}</span>{" "}
              transactions
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1,
                  )
                  .map((page, index, pages) => (
                    <React.Fragment key={page}>
                      {index > 0 && pages[index - 1] !== page - 1 && (
                        <span className="px-1 text-slate-400 text-xs">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition ${
                          currentPage === page
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
