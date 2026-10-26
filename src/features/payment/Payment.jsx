import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Download,
  Wallet,
  Smartphone,
  Receipt,
  Pencil,
  CheckCircle2,
  Printer,
  X,
  Search,
  CalendarDays,
  IndianRupee,
  ShoppingBag,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { getSelectedBillTemplate } from "../../constants/billTemplates";
import { printOrderBill } from "../../utils/printOrderBill";
import * as XLSX from "xlsx";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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
  const [paymentMethod, setPaymentMethod] = React.useState("ALL");
  const [filter, setFilter] = React.useState("today");
  const [billSearch, setBillSearch] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const socket = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const restaurantId = user?.restaurantId?._id || user?.restaurantId || null;
  const ITEMS_PER_PAGE = 10;
  const API_BASE = import.meta.env.VITE_APP_API_BASE;
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [showSettleModal, setShowSettleModal] = React.useState(false);

  const [selectedDueBill, setSelectedDueBill] = React.useState(null);
  const [reprintingId, setReprintingId] = React.useState("");
  const [storeDetails, setStoreDetails] = React.useState({
    name: "",
    logo: "",
    address: "",
    contact: "",
    fssaiNumber: "",
    gstin: "",
    upiId: "",
    upiQrCode: "",
    googleReviewQrCode: "",
  });
  const [selectedBillTemplate, setSelectedBillTemplate] = React.useState(() =>
    getSelectedBillTemplate(restaurantId),
  );

  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");

  const [settlePaymentMethod, setSettlePaymentMethod] = React.useState("CASH");

  const [isUpdatingCustomer, setIsUpdatingCustomer] = React.useState(false);

  const [isSettlingDue, setIsSettlingDue] = React.useState(false);

  React.useEffect(() => {
    if (!restaurantId) return;

    let ignore = false;

    axios
      .get(`${API_BASE}/restaurant/profile`, { withCredentials: true })
      .then((res) => {
        const profile = res.data?.data;
        if (!profile || ignore) return;

        const formattedAddress = profile.address
          ? [
              profile.address.street,
              profile.address.city,
              profile.address.state,
              profile.address.zip,
            ]
              .filter(Boolean)
              .join(", ")
          : "";

        setStoreDetails({
          name: profile.name || "",
          logo: profile.logo || "",
          address: formattedAddress,
          contact:
            profile.phone || profile.contactNumber || profile.contact || "",
          fssaiNumber: profile.fssaiNumber || "",
          gstin: profile.gstin || profile.gstNumber || "",
          upiId: profile.upiId || "",
          upiQrCode: profile.upiQrCode || profile.qrCodeUrl || "",
          googleReviewQrCode: profile.googleReviewQrCode || "",
        });

        if (profile.billTemplate) {
          setSelectedBillTemplate(profile.billTemplate);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [API_BASE, restaurantId]);

  const reprintBill = async (bill) => {
    if (!bill?._id || reprintingId) return;

    setReprintingId(String(bill._id));

    try {
      const res = await axios.post(
        `${API_BASE}/orders/${bill._id}/bill/reprint`,
        {},
        { withCredentials: true },
      );

      await printOrderBill({
        order: res.data?.data || bill,
        storeDetails,
        user,
        selectedBillTemplate,
        duplicate: true,
        onError: (message) => alert(message),
      });
    } catch (error) {
      alert(error.response?.data?.message || "Could not reprint this bill");
    } finally {
      setReprintingId("");
    }
  };

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
    queryKey: ["bills", restaurantId, filter],
    queryFn: () =>
      axios
        .get(`${API_BASE}/orders/billing?filter=${filter}&paymentMethod=ALL`, {
          withCredentials: true,
        })
        .then((res) => res.data),
    staleTime: 10_000,
    enabled: !!restaurantId,
  });

  const bills = billingData?.data || [];
  const summary = billingData?.summary || {};
  const visibleBills = React.useMemo(() => {
    const query = billSearch.trim().toLowerCase();
    return bills.filter((bill) => {
      if (paymentMethod !== "ALL" && bill.paymentMethod !== paymentMethod)
        return false;
      if (!query) return true;
      return [
        bill.orderId,
        bill.customerName,
        bill.customerPhone,
        bill.tableNumber,
        bill.paymentMethod,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [bills, paymentMethod, billSearch]);

  const { data: prevData } = useQuery({
    queryKey: ["bills-prev", restaurantId, filter],
    queryFn: () =>
      axios
        .get(`${API_BASE}/orders/billing/previous?filter=${filter}`, {
          withCredentials: true,
        })
        .then((res) => res.data)
        .catch(() => ({ total: 0 })),
    enabled: !!restaurantId,
  });

  const totalBills = visibleBills.length;
  const totalPages = Math.ceil(totalBills / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedBills = visibleBills.slice(startIndex, endIndex);

  const collected = Number(summary.totalCollected || 0);
  const pendingDue = Number(summary.due || 0);
  const orderCount =
    Number(summary.cashCount || 0) +
    Number(summary.upiCount || 0) +
    Number(summary.dueCount || 0);
  const averageOrder = orderCount ? (collected + pendingDue) / orderCount : 0;
  const prevRevenue = prevData?.total || 0;

  const revenueDifference = collected - prevRevenue;
  const isProfit = revenueDifference > 0;

  const percentageChange =
    prevRevenue > 0
      ? ((Math.abs(revenueDifference) / prevRevenue) * 100).toFixed(1)
      : collected > 0
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
           headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
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
    if (!visibleBills.length) return;
    const formattedData = visibleBills.map((bill) => ({
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
  const methodSlices = [
    {
      name: "Cash",
      value: summaryValues.CASH.count,
      amount: summaryValues.CASH.amount,
      color: "#22C55E",
    },
    {
      name: "UPI",
      value: summaryValues.UPI.count,
      amount: summaryValues.UPI.amount,
      color: "#8B5CF6",
    },
    {
      name: "Due",
      value: summaryValues.DUE.count,
      amount: summaryValues.DUE.amount,
      color: "#FB923C",
    },
  ].filter((slice) => slice.value > 0);
  const paymentDays = React.useMemo(() => {
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const rows = names.map((day) => ({ day, total: 0, count: 0 }));
    bills.forEach((bill) => {
      const index = (new Date(bill.createdAt).getDay() + 6) % 7;
      rows[index].total += Number(bill.total || 0);
      rows[index].count += 1;
    });
    return rows;
  }, [bills]);
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      <div className="-m-4 bg-[var(--background)] p-4 font-sans md:-m-6 md:p-5 lg:-m-8 lg:p-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Payments</h2>
                <p className="mt-1 text-sm text-white/85">
                  Manage all your bills, payments and due collection
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 text-right">
              <p className="flex items-center justify-end gap-2 text-sm font-bold">
                <CalendarDays size={14} /> {todayLabel}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-100">
                Today
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [
              "Total Sales",
              money(collected),
              IndianRupee,
              "text-emerald-600 bg-emerald-50",
              true,
            ],
            [
              "Total Orders",
              orderCount,
              ShoppingBag,
              "text-blue-600 bg-blue-50",
              false,
            ],
            [
              "Average Order Value",
              money(averageOrder),
              Receipt,
              "text-violet-600 bg-violet-50",
              false,
            ],
            [
              "Pending Dues",
              money(pendingDue),
              Clock,
              "text-amber-600 bg-amber-50",
              false,
            ],
          ].map(([label, value, Icon, tint, showChange]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}
                >
                  <Icon size={16} />
                </span>
                <p className="text-[11px] font-bold text-slate-400">{label}</p>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
              {showChange && (
                <p
                  className={`mt-1 text-[11px] font-bold ${isProfit ? "text-emerald-600" : "text-rose-500"}`}
                >
                  {revenueDifference === 0
                    ? "No change vs previous period"
                    : `${isProfit ? "+" : "-"}${percentageChange}% vs previous ${filter}`}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3">
              {[
                ["ALL", "All Payments"],
                ["CASH", "Cash"],
                ["UPI", "UPI"],
                ["DUE", "Due"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(key);
                    setCurrentPage(1);
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${paymentMethod === key ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-600"}`}
                >
                  {label}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                {[
                  ["today", "Today"],
                  ["week", "This Week"],
                  ["month", "This Month"],
                  ["year", "This Year"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setFilter(key);
                      setCurrentPage(1);
                    }}
                    className={`rounded-xl px-3 py-2 text-[11px] font-bold ${filter === key ? "bg-slate-900 text-white" : "text-slate-500"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-3 py-3">
              <h3 className="text-sm font-black text-slate-900">
                Recent Payments
              </h3>
              <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={billSearch}
                  onChange={(event) => {
                    setBillSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search orders..."
                  className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-rose-300"
                />
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!visibleBills.length}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                <Download size={14} /> Export
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="text-[10px] font-bold uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Order ID</th>
                    <th className="px-3 py-2">Date & Time</th>
                    <th className="px-3 py-2">Table / Type</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Items</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <SkeletonRow key={index} />
                    ))
                  ) : paginatedBills.length > 0 ? (
                    paginatedBills.map((bill, index) => {
                      const when = new Date(bill.createdAt);
                      const itemCount = Array.isArray(bill.items)
                        ? bill.items.filter(
                            (item) => item?.status !== "REJECTED",
                          ).length
                        : 0;
                      const amount =
                        paymentMethod === "DUE" || bill.paymentMethod === "DUE"
                          ? bill.dueAmount || bill.total || 0
                          : bill.total || 0;
                      const place =
                        String(bill.tableNumber || "").toUpperCase() ===
                        "PARCEL"
                          ? "Parcel"
                          : `Table ${bill.tableNumber || "—"}`;
                      return (
                        <tr key={bill._id} className="border-t border-slate-50">
                          <td className="px-3 py-3 font-black text-rose-500">
                            {startIndex + index + 1}
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800">
                            #{bill.orderId}
                          </td>
                          <td className="px-3 py-3 text-slate-500">
                            <p>
                              {when.toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[10px]">
                              {when.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-700">
                            {place}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-bold text-slate-800">
                              {bill.customerName || "Walk-in"}
                            </p>
                            {bill.customerPhone && (
                              <p className="text-[10px] text-slate-400">
                                {bill.customerPhone}
                              </p>
                            )}
                            {bill.isSplitBill && (
                              <span className="text-[9px] font-black text-violet-600">
                                Split
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-600">
                            {itemCount}
                          </td>
                          <td className="px-3 py-3 font-black text-slate-900">
                            {money(amount)}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black ${bill.paymentMethod === "DUE" ? "bg-amber-50 text-amber-700" : bill.paymentMethod === "UPI" ? "bg-violet-50 text-violet-700" : "bg-emerald-50 text-emerald-700"}`}
                            >
                              {bill.paymentMethod || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                              {bill.status || "COMPLETED"}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => reprintBill(bill)}
                                disabled={reprintingId === String(bill._id)}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:opacity-50"
                                title="Reprint bill"
                              >
                                <Printer size={13} />
                              </button>
                              {bill.paymentMethod === "DUE" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openCustomerEdit(bill)}
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-600"
                                    title="Edit customer"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openSettleDue(bill)}
                                    className="rounded-lg bg-emerald-600 p-1.5 text-white"
                                    title="Settle due"
                                  >
                                    <CheckCircle2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="10"
                        className="px-3 py-12 text-center text-sm text-slate-400"
                      >
                        No payment records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-3 text-xs">
                <p className="text-slate-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalBills)}{" "}
                  of {totalBills}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    className="rounded-xl border border-slate-200 px-3 py-2 font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    className="rounded-xl border border-slate-200 px-3 py-2 font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-black text-slate-900">
                Payment Methods
              </h3>
              {orderCount === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">
                  No payments in this range
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative h-36 w-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={methodSlices}
                          dataKey="value"
                          innerRadius={42}
                          outerRadius={60}
                          stroke="none"
                        >
                          {methodSlices.map((slice) => (
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-lg font-black text-slate-900">
                        {orderCount}
                      </p>
                      <p className="text-[10px] text-slate-400">Orders</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {methodSlices.map((slice) => (
                      <div key={slice.name}>
                        <p className="font-bold text-slate-800">{slice.name}</p>
                        <p className="text-slate-500">
                          {slice.value} ·{" "}
                          {orderCount
                            ? Math.round((slice.value / orderCount) * 100)
                            : 0}
                          %
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-black text-slate-900">
                Payments By Day
              </h3>
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">
                {filter}
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={paymentDays}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                  />
                  <Tooltip
                    formatter={(value) => [money(value), "Amount"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Bar dataKey="total" fill="#FB7185" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!visibleBills.length}
              className="flex w-full items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Download size={18} />
              </span>
              <span>
                <span className="block text-sm font-black text-slate-900">
                  Export to Excel
                </span>
                <span className="block text-[11px] text-slate-400">
                  Download the payments in this view
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
