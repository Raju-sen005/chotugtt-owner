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
  Pencil,
  CheckCircle2,
  X,
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
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [showSettleModal, setShowSettleModal] = React.useState(false);

  const [selectedDueBill, setSelectedDueBill] = React.useState(null);

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");

  const [settlePaymentMethod, setSettlePaymentMethod] = React.useState("CASH");

  const [isUpdatingCustomer, setIsUpdatingCustomer] = React.useState(false);

  const [isSettlingDue, setIsSettlingDue] = React.useState(false);
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

  const openCustomerEdit = (bill) => {
    setSelectedDueBill(bill);
    setCustomerName(bill.customerName || "");
    setCustomerPhone(bill.customerPhone || "");
    setShowCustomerModal(true);
  };

  const handleCustomerUpdate = async () => {
    if (!selectedDueBill) return;

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();

    if (!cleanName) {
      alert("Customer name is required");
      return;
    }

    if (cleanPhone && !/^\d{10}$/.test(cleanPhone)) {
      alert("Mobile number must be exactly 10 digits");
      return;
    }

    try {
      setIsUpdatingCustomer(true);

      await axios.patch(
        `${API_BASE}/orders/${selectedDueBill._id}/due-details`,
        {
          customerName: cleanName,
          customerPhone: cleanPhone,
        },
        {
          withCredentials: true,
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["bills"],
      });

      setShowCustomerModal(false);
      setSelectedDueBill(null);
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to update customer details",
      );
    } finally {
      setIsUpdatingCustomer(false);
    }
  };

  const openSettleDue = (bill) => {
    setSelectedDueBill(bill);
    setSettlePaymentMethod("CASH");
    setShowSettleModal(true);
  };

  const handleSettleDue = async () => {
    if (!selectedDueBill || isSettlingDue) return;

    try {
      setIsSettlingDue(true);

      await axios.patch(
        `${API_BASE}/orders/${selectedDueBill._id}/settle-due`,
        {
          paymentMethod: settlePaymentMethod,
        },
        {
          withCredentials: true,
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["bills"],
      });

      setShowSettleModal(false);
      setSelectedDueBill(null);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to settle due payment");
    } finally {
      setIsSettlingDue(false);
    }
  };

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
    <>
      {showCustomerModal && selectedDueBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Customer Details
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Update details for {selectedDueBill.orderId}
                </p>
              </div>

              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Customer Name
                </label>

                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Mobile Number
                </label>

                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Enter 10 digit mobile number"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-slate-100">
              <button
                type="button"
                disabled={isUpdatingCustomer}
                onClick={() => setShowCustomerModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUpdatingCustomer}
                onClick={handleCustomerUpdate}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isUpdatingCustomer ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettleModal && selectedDueBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Settle Due Bill
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  Complete the outstanding payment
                </p>
              </div>

              <button
                onClick={() => setShowSettleModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-amber-700">
                  {selectedDueBill.customerName || "Walk-in Customer"}
                </p>

                <p className="text-xs text-amber-600 mt-1">
                  {selectedDueBill.orderId}
                </p>

                <div className="flex items-end justify-between mt-4">
                  <span className="text-xs font-bold text-amber-600">
                    Outstanding Amount
                  </span>

                  <span className="text-2xl font-black text-amber-700">
                    ₹
                    {Number(
                      selectedDueBill.dueAmount || selectedDueBill.total || 0,
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <label className="block text-xs font-bold text-slate-500 mb-3">
                Payment Method
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod("CASH")}
                  className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                    settlePaymentMethod === "CASH"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Wallet size={17} />
                  Cash
                </button>

                <button
                  type="button"
                  onClick={() => setSettlePaymentMethod("UPI")}
                  className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                    settlePaymentMethod === "UPI"
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-100"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Smartphone size={17} />
                  UPI
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-5 border-t border-slate-100">
              <button
                type="button"
                disabled={isSettlingDue}
                onClick={() => setShowSettleModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSettlingDue}
                onClick={handleSettleDue}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSettlingDue ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Settling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Mark as Paid
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
                  <th className="p-4 sm:p-5">Order ID</th>

                  <th className="p-4 sm:p-5">Customer</th>

                  {paymentMethod === "DUE" && (
                    <th className="p-4 sm:p-5">Mobile</th>
                  )}

                  <th className="p-4 sm:p-5">Date & Time</th>

                  <th className="p-4 sm:p-5">Table / Type</th>

                  <th className="p-4 sm:p-5 text-right">
                    {paymentMethod === "DUE" ? "Due Amount" : "Amount"}
                  </th>

                  {paymentMethod === "DUE" && (
                    <th className="p-4 sm:p-5 text-right">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : bills?.length > 0 ? (
                  paginatedBills.map((bill) => (
                    <tr
                      key={bill._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 sm:p-5 text-slate-600 font-semibold">
                        {bill.orderId}
                      </td>

                      <td className="p-4 sm:p-5 text-slate-700 font-semibold">
                        {bill.customerName || "Walk-in Customer"}
                      </td>

                      {paymentMethod === "DUE" && (
                        <td className="p-4 sm:p-5 text-slate-600">
                          {bill.customerPhone || "—"}
                        </td>
                      )}

                      <td className="p-4 sm:p-5 text-slate-600">
                        {new Date(bill.createdAt).toLocaleString()}
                      </td>

                      <td className="p-4 sm:p-5 font-bold text-slate-800">
                        Table {bill.tableNumber}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          ({bill.orderType || "Dine-in"})
                        </span>
                      </td>

                      <td
                        className={`p-4 sm:p-5 text-right font-black ${
                          paymentMethod === "DUE"
                            ? "text-amber-600"
                            : "text-slate-900"
                        }`}
                      >
                        ₹
                        {Number(
                          paymentMethod === "DUE"
                            ? bill.dueAmount || bill.total || 0
                            : bill.total || 0,
                        ).toFixed(2)}
                      </td>

                      {paymentMethod === "DUE" && (
                        <td className="p-4 sm:p-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openCustomerEdit(bill)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                            >
                              <Pencil size={13} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openSettleDue(bill)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                            >
                              <CheckCircle2 size={13} />
                              Settle
                            </button>
                          </div>
                        </td>
                      )}
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
                <span className="font-bold text-slate-700">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-slate-700">
                  {Math.min(endIndex, totalBills)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">{totalBills}</span>{" "}
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
                          <span className="px-1 text-slate-400 text-xs">
                            ...
                          </span>
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
    </>
  );
}
