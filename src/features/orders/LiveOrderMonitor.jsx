import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
// import QRCode from "qrcode";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
// import { useNotificationSound } from "../../hooks/useNotificationSound";
import {
  Eye,
  Check,
  X,
  Users,
  Radio,
  ArrowLeft,
  ArrowRight,
  IndianRupee,
  Loader2,
  ChefHat,
  ClipboardList,
  Search,
  Printer,
  Flame,
} from "lucide-react";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import {
  getSelectedBillTemplate,
  saveSelectedBillTemplate,
} from "../../constants/billTemplates";
import { printThermalHtml } from "../../utils/thermalPrint";
import { printOrderBill } from "../../utils/printOrderBill";

// Shared status → badge style map (used by both the desktop row and mobile card
// so ACCEPTED / COMPLETED / REJECTED are visually distinct at a glance)
const STATUS_BADGE_STYLES = {
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-200",
};

const KITCHEN_PILL = {
  PENDING: "bg-orange-50 text-orange-600",
  PREPARING: "bg-orange-50 text-orange-600",
  READY: "bg-sky-50 text-sky-600",
  ACCEPTED: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-rose-50 text-rose-500",
};

function activeOrderItems(order) {
  return (order?.items || []).filter((item) => item?.status !== "REJECTED");
}

function kitchenLabel(order) {
  if (!order || order.status !== "ACCEPTED") return order?.status || "";
  const items = activeOrderItems(order);
  if (!items.length) return "ACCEPTED";
  const pendingPrep = items.some(
    (item) => item.itemReadyStatus !== "READY" && item.itemReadyStatus !== "SERVED",
  );
  if (pendingPrep) return "PREPARING";
  if (items.some((item) => item.itemReadyStatus === "READY")) return "READY";
  return "ACCEPTED";
}

function timeAgo(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function orderPlaceLabel(order) {
  if (order?.tableNumber === "PARCEL") return "PARCEL";
  return order?.tableNumber ? `TABLE ${order.tableNumber}` : "TABLE";
}

function orderTypeLabel(order) {
  if (order?.tableNumber === "PARCEL") return "Counter Parcel";
  return "Dine In";
}

const OrderRow = memo(function OrderRow({
  order,
  onStatusChange,
  onView,
  onClear,
  onCancelItem,
  onItemReadyStatus,
  onSelect,
  isSelected,
}) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;
  const hasUnservedItems = (order.items || []).some(
    (item) => item?.status !== "REJECTED" && item?.itemReadyStatus !== "SERVED",
  );
  const label = kitchenLabel(order);
  const preview = activeOrderItems(order).slice(0, 1);
  const extra = Math.max(0, activeOrderItems(order).length - preview.length);
  const phone = order.customerPhone || order.phone || order.contactNumber || "";

  return (
    <tr
      onClick={() => onSelect?.(order)}
      className={`cursor-pointer transition-colors ${isSelected ? "bg-rose-50/60" : "hover:bg-slate-50"}`}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="font-mono text-sm font-black text-rose-500">#{order.orderId}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(order.createdAt)}</p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-xs font-black text-slate-800">{orderPlaceLabel(order)}</p>
        <p className="text-[11px] text-slate-400">{orderTypeLabel(order)}</p>
        {hasMergedTables && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
            <Users size={10} /> +{order.mergedTables.join(", ")}
          </p>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-bold text-slate-800">{order.customerName || "Guest"}</p>
        {phone && <p className="text-[11px] text-slate-400">{phone}</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {preview.map((item, index) => (
            <span
              key={item?._id || index}
              className="max-w-[120px] truncate rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600"
            >
              {item.quantity}x {item.name}
            </span>
          ))}
          {extra > 0 && (
            <span className="text-[11px] font-bold text-slate-400">+{extra} more</span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          {activeOrderItems(order).length} item{activeOrderItems(order).length === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-4 py-3 text-sm font-black text-slate-900 whitespace-nowrap">
        ₹{Number(order.total || 0).toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${KITCHEN_PILL[label] || "bg-slate-100 text-slate-600"}`}>
          {label === "PREPARING" && <Flame size={11} />}
          {label}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* <button
            type="button"
            onClick={() => onView(order)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
          >
            <Eye size={12} /> View
          </button> */}
          {order.status === "PENDING" && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(order._id, "ACCEPTED")}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white"
              >
                <Check size={12} /> Accept
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(order._id, "REJECTED")}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2 py-1 text-[11px] font-bold text-white"
              >
                <X size={12} /> Reject
              </button>
            </>
          )}
          {order.status === "ACCEPTED" && order.tableNumber !== "N/A" && (
            <button
              type="button"
              disabled={hasUnservedItems}
              onClick={() => {
                if (!hasUnservedItems) onClear(order);
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                hasUnservedItems
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-emerald-500 text-white"
              }`}
              title={
                hasUnservedItems
                  ? "All active items must be SERVED before billing"
                  : "Generate Bill & Clear Table"
              }
            >
              <Check size={12} /> {hasUnservedItems ? "Serve first" : "Complete"}
            </button>
          )}
          {order.status === "ACCEPTED" && (
            <ItemReadyShortcuts order={order} onItemReadyStatus={onItemReadyStatus} onCancelItem={onCancelItem} />
          )}
        </div>
      </td>
    </tr>
  );
});

function ItemReadyShortcuts({ order, onItemReadyStatus, onCancelItem }) {
  const next = activeOrderItems(order).find(
    (item) => item?._id && item.itemReadyStatus !== "READY" && item.itemReadyStatus !== "SERVED",
  );
  const ready = activeOrderItems(order).find(
    (item) => item?._id && item.itemReadyStatus === "READY",
  );
  const target = next || ready;
  if (!target) return null;
  return (
    <>
      <button
        type="button"
        onClick={() =>
          onItemReadyStatus(order._id, target._id, next ? "READY" : "SERVED")
        }
        className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700"
      >
        {next ? "Mark ready" : "Mark served"}
      </button>
      {/* {next && (
        <button
          type="button"
          onClick={() => onCancelItem(order._id, next._id)}
          className="rounded-lg border border-rose-100 px-2 py-1 text-[11px] font-bold text-rose-500"
        >
          Cancel item
        </button>
      )} */}
    </>
  );
}


// OrderRow — tables scroll poorly on phones, so below the `lg` breakpoint
// orders render as cards instead of a horizontally-scrolling table.
const OrderCard = memo(function OrderCard({
  order,
  onStatusChange,
  onView,
  onClear,
  onCancelItem,
  onItemReadyStatus,
}) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;
  const [showAllItems, setShowAllItems] = useState(false);
  const hasUnservedItems = (order.items || []).some(
    (item) => item?.status !== "REJECTED" && item?.itemReadyStatus !== "SERVED",
  );
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-mono font-bold text-rose-600 text-xs">
            {order.orderId}
          </p>
          <p className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-1.5 flex-wrap">
            Table {order.tableNumber}
            {hasMergedTables && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                <Users size={9} /> +{order.mergedTables.join(", ")}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
            {order.customerName}
          </p>
        </div>
        <span className="font-black text-slate-900 text-sm whitespace-nowrap font-mono shrink-0">
          ₹{order.total?.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="text-xs text-slate-600 font-medium border-t border-dashed border-slate-200 pt-2.5">
        <div className="flex flex-col gap-1">
          {(showAllItems ? order.items : order.items.slice(0, 2)).map(
            (item, index) => (
              <div
                key={
                  item?._id
                    ? String(item._id)
                    : `${order?._id || order?.orderId || "order"}:item:${index}`
                }
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`truncate ${
                      item.status === "REJECTED"
                        ? "line-through text-rose-400 opacity-50"
                        : ""
                    }`}
                  >
                    • {item.quantity}x {item.name}
                  </span>

                  {item.status !== "REJECTED" && (
                    <span
                      className={`shrink-0 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${
                        item.itemReadyStatus === "SERVED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : item.itemReadyStatus === "READY"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {item.itemReadyStatus === "SERVED"
                        ? "Served"
                        : item.itemReadyStatus === "READY"
                          ? "Ready"
                          : "Preparing"}
                    </span>
                  )}
                </div>

                {Boolean(item?._id) &&
                  item.status !== "REJECTED" &&
                  order.status === "ACCEPTED" && (
                    <button
                      type="button"
                      onClick={() =>
                        onItemReadyStatus(
                          order._id,
                          item._id,
                          item.itemReadyStatus === "READY" ? "SERVED" : "READY",
                        )
                      }
                      disabled={item.itemReadyStatus === "SERVED"}
                      title={
                        item.itemReadyStatus === "PREPARING"
                          ? "Mark item READY"
                          : item.itemReadyStatus === "READY"
                            ? "Mark item SERVED"
                            : "Item already SERVED"
                      }
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
                        item.itemReadyStatus === "SERVED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : item.itemReadyStatus === "READY"
                            ? "bg-blue-50 text-blue-600 border-blue-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <Check size={11} strokeWidth={3} />

                      <span className="text-[9px] font-black">
                        {item.itemReadyStatus === "PREPARING"
                          ? "Ready"
                          : item.itemReadyStatus === "READY"
                            ? "Serve"
                            : "Done"}
                      </span>
                    </button>
                  )}
                {Boolean(item?._id) &&
                  item.status !== "REJECTED" &&
                  order.status !== "COMPLETED" &&
                  order.status !== "REJECTED" && (
                    <button
                      onClick={() => onCancelItem(order._id, item._id)}
                      className="text-[10px] text-slate-300 active:text-rose-500 shrink-0"
                    >
                      Cancel
                    </button>
                  )}
              </div>
            ),
          )}
          {order.items.length > 2 && (
            <button
              type="button"
              onClick={() => setShowAllItems((prev) => !prev)}
              className="mt-0.5 text-left text-[10px] font-black text-rose-600"
            >
              {showAllItems
                ? "Show less"
                : `Show ${order.items.length - 2} more`}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        {order.status === "PENDING" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange(order._id, "ACCEPTED")}
              className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200/80 rounded-xl active:bg-emerald-100 transition"
              title="Accept Order"
            >
              <Check size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => onStatusChange(order._id, "REJECTED")}
              className="p-2 bg-rose-50 text-rose-600 border border-rose-200/80 rounded-xl active:bg-rose-100 transition"
              title="Reject Order"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <span
            className={`text-[10px] font-black uppercase tracking-wider border px-2.5 py-1.5 rounded-xl ${
              STATUS_BADGE_STYLES[order.status] ||
              "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {order.status}
          </span>
        )}

        <div className="flex items-center gap-2">
          {order.status === "ACCEPTED" && order.tableNumber !== "N/A" && (
            <button
              disabled={hasUnservedItems}
              onClick={() => {
                if (hasUnservedItems) {
                  return;
                }

                onClear(order);
              }}
              className={`p-2 rounded-xl transition shadow-2xs ${
                hasUnservedItems
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              }`}
              title={
                hasUnservedItems
                  ? "All active items must be SERVED before billing"
                  : "Generate Bill & Clear Table"
              }
            >
              <IndianRupee size={15} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={() => onView(order)}
            className="p-2 bg-white text-slate-600 border border-slate-200/80 rounded-xl active:bg-slate-50 transition"
            title="View Order Details"
          >
            <Eye size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
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
          <p className="text-xs font-black tracking-tight font-mono">
            {t.tableNumber}
          </p>
          <p className="text-[9px] font-black uppercase tracking-wider mt-0.5 opacity-90">
            {t.isOccupied ? "Occupied" : "Free"}
          </p>
        </div>
      ))}
    </div>
  );
});

export default function LiveOrderMonitor() {
  const { user } = useAuth();
  const location = useLocation();
  const restaurantId =
    typeof user?.restaurantId === "object"
      ? user.restaurantId?._id
      : user?.restaurantId;
  const [selectedOrder, setSelectedOrder] = useState(null);
  const queryClient = useQueryClient();
  const socket = useSocket();
  // const playAlert = useNotificationSound();
  const [rejectModalOrder, setRejectModalOrder] = useState(null);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [statusPopupType, setStatusPopupType] = useState("");
  const [statusPopupOrderId, setStatusPopupOrderId] = useState(null);
  const [kotItems, setKotItems] = useState([]);
  const [cancelledKotItems, setCancelledKotItems] = useState([]);
  const [cancelItemData, setCancelItemData] = useState(null);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [billOrder, setBillOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splitCollectMethod, setSplitCollectMethod] = useState("CASH");
  const [splitAmount, setSplitAmount] = useState("");
  const [isSplitSubmitting, setIsSplitSubmitting] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [kotType, setKotType] = useState("NEW");
  const [rejectReasonDropdown, setRejectReasonDropdown] =
    useState("Item Out of Stock");
  const [selectedBillTemplate, setSelectedBillTemplate] = useState(() =>
    getSelectedBillTemplate(restaurantId),
  );

  // ============================================================
  // MIXED PAYMENT
  // CASH + UPI
  // ============================================================

  const [mixedCashAmount, setMixedCashAmount] = useState("");
  const [mixedUpiAmount, setMixedUpiAmount] = useState("");
  const [isMixedSubmitting, setIsMixedSubmitting] = useState(false);

  // 🔒 XSS-safe interpolation — customer-controlled data (name, notes, variant, etc.)
  // ko HTML mein daalne se pehle escape karo taaki koi injected <script>/onerror na chal sake
  const escapeHtml = (value) => {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const apiBase = import.meta.env.VITE_APP_API_BASE;
  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);

    setTimeout(() => {
      setShowSuccessPopup(false);
    }, 3000);
  }, []);

  const showError = useCallback((message) => {
    setErrorMessage(message);
    setShowErrorPopup(true);

    setTimeout(() => {
      setShowErrorPopup(false);
    }, 3000);
  }, []);
  // 🧾 Restaurant profile — needed for the printed bill header (name, address, contact)
  const [storeDetails, setStoreDetails] = useState({
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

  const printKOT = useCallback(
    async ({ order, items, kotType = "NEW", cancelledItems = [] }) => {
      if (!order?._id) {
        showError("Invalid order.");
        return;
      }

      if (!Array.isArray(items) || !items.length) {
        showError("No new items available for KOT.");
        return;
      }

      const normalizedKotType =
        kotType === "REVISED" ? "REVISED" : kotType === "RUNNING" ? "RUNNING" : "NEW";

      const activeItems = items.filter(
        (item) => item && item.status !== "REJECTED",
      );

      if (!activeItems.length) {
        showError("No active items available for KOT.");
        return;
      }

      const isRunningOrder = normalizedKotType === "RUNNING";
      const isRevisedOrder = normalizedKotType === "REVISED";

      const kotTitle = isRevisedOrder
        ? "REVISED KOT"
        : isRunningOrder
          ? "RUNNING ORDER KOT"
          : "NEW ORDER KOT";

      const kotSubtitle = isRevisedOrder
        ? "ITEM CANCELLED"
        : isRunningOrder
          ? "ADDITIONAL ITEMS"
          : "NEW ORDER";

      // -----------------------------------------
      // KOT ITEMS
      // -----------------------------------------
      const kotRows = activeItems
        .map((item, index) => {
          return `
          <tr>
            <td class="sr-col">
              ${index + 1}
            </td>

            <td class="item-col">
              <div class="item-name">
                ${escapeHtml(item.name || "Item")}
              </div>

              ${
                item.variant
                  ? `
                    <div class="item-meta">
                      Variant: ${escapeHtml(item.variant)}
                    </div>
                  `
                  : ""
              }

              ${
                item.notes
                  ? `
                    <div class="item-meta note-text">
                      Note: ${escapeHtml(item.notes)}
                    </div>
                  `
                  : ""
              }
            </td>

            <td class="qty-col">
              ${escapeHtml(String(item.quantity ?? 0))}
            </td>
          </tr>
        `;
        })
        .join("");

      const cancelledRows = (cancelledItems || [])
        .filter((item) => item && item.status === "REJECTED")
        .map(
          (item) => `
          <tr>
            <td class="sr-col">x</td>
            <td class="item-col">
              <div class="item-name" style="text-decoration:line-through;">
                ${escapeHtml(item.name || "Item")} CANCELLED
              </div>
            </td>
            <td class="qty-col" style="text-decoration:line-through;">
              ${escapeHtml(String(item.quantity ?? 0))}
            </td>
          </tr>`,
        )
        .join("");

      // -----------------------------------------
      // TABLE LABEL
      // -----------------------------------------
      const tableLabel = order.mergedTables?.length
        ? `${order.tableNumber || "-"}, ${order.mergedTables.join(", ")}`
        : order.tableNumber || "-";

      // -----------------------------------------
      // DATE / TIME
      // -----------------------------------------
      const now = new Date();

      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;

      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // -----------------------------------------
      // ORDER TYPE
      // -----------------------------------------
      const orderType = String(order.orderType || "DINE IN").toUpperCase();

      // -----------------------------------------
      // PRINT HTML
      // -----------------------------------------
      const windowContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />

  <title>
    ${escapeHtml(kotTitle)} - ${escapeHtml(order.orderId || "")}
  </title>

  <style>

    @page {
      margin: 0;
      size: 80mm auto;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 80mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    body {
      font-family:
        "Courier New",
        Courier,
        monospace;

      color: #111;
      font-size: 11px;
      font-weight: 600;
    }

    .kot {
      width: 72mm;
      max-width: 72mm;
      margin: 0;
      padding: 0 1mm 2mm;
    }

    /* ================================
       HEADER
    ================================= */

   .header {
  text-align: center;
  margin: 0 0 4px;
  padding: 0;
}

    .brand {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }

    .main-title {
      font-size: 18px;
      line-height: 1.1;
      font-weight: 900;
      letter-spacing: 0.4px;
      margin-bottom: 5px;
    }

    .subtitle {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.2px;
      margin-bottom: 8px;
    }

    .order-id {
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .order-badge {
      display: inline-block;

      border: 2px solid #111;

      padding:
        4px
        12px;

      border-radius: 3px;

      font-size: 11px;
      font-weight: 900;

      letter-spacing: 0.8px;
    }

    /* ================================
       DIVIDER
    ================================= */

    .divider {
      border-top: 1.5px dashed #111;
      margin: 4px 0;
    }

    .solid-divider {
      border-top: 2px solid #111;
      margin: 4px 0;
    }

    /* ================================
       ORDER META
    ================================= */

    .section-heading {
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;

      margin-bottom: 5px;
    }

    .meta {
      width: 100%;
    }

    .meta-row {
      display: flex;

      justify-content: space-between;
      align-items: flex-start;

      gap: 8px;

      margin: 3px 0;
    }

    .meta-label {
      font-size: 10px;
      font-weight: 700;

      min-width: 58px;
    }

    .meta-value {
      flex: 1;

      text-align: right;

      font-size: 11px;
      font-weight: 900;

      word-break: break-word;
    }

    /* ================================
       ITEMS
    ================================= */

    .items-header {
      display: flex;
      align-items: center;

      font-size: 9px;
      font-weight: 900;

      letter-spacing: 0.8px;

      padding-bottom: 5px;

      border-bottom: 1.5px solid #111;
    }

    .items-header .number {
      width: 8%;
    }

    .items-header .name {
      width: 70%;
    }

    .items-header .quantity {
      width: 22%;

      text-align: right;
    }

    table {
      width: 100%;

      border-collapse: collapse;

      table-layout: fixed;
    }

    td {
      vertical-align: top;
      padding: 3px 0;
      border-bottom: 1px solid #000;
    }

    .sr-col {
      width: 8%;

      font-size: 10px;
      font-weight: 900;

      text-align: left;
    }

    .item-col {
      width: 70%;

      padding-right: 5px;

      text-align: left;
    }

.qty-col {
  width: 22%;
  text-align: right;
  font-size: 18px;
  font-weight: 700;
  color: #000;
}

    .item-name {
      font-size: 15px;
      line-height: 1.2;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
      word-break: break-word;
    }

    .item-meta {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 700;
  color: #000;
}

    .note-text {
      font-style: italic;
    }

    /* ================================
       SPECIAL INSTRUCTIONS
    ================================= */

    .notes {
      border: 1.5px solid #111;

      padding: 7px;

      margin-top: 7px;

      border-radius: 3px;
    }

    .notes-title {
      font-size: 9px;

      font-weight: 900;

      letter-spacing: 0.7px;

      text-transform: uppercase;

      margin-bottom: 4px;
    }

    .note {
      font-size: 10px;

      line-height: 1.4;

      font-weight: 700;

      word-break: break-word;
    }

    /* ================================
       SUMMARY
    ================================= */

    .item-summary {
      display: flex;

      justify-content: space-between;

      align-items: center;

      margin-top: 8px;

      padding:
        6px
        0;

      border-top: 2px solid #111;

      border-bottom: 1px solid #111;
    }

    .summary-label {
      font-size: 10px;

      font-weight: 900;

      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: 13px;

      font-weight: 900;
    }

    /* ================================
       FOOTER
    ================================= */

    .footer {
      text-align: center;
      margin-top: 4px;
    }

    .kitchen-copy {
      font-size: 11px;

      font-weight: 900;

      letter-spacing: 1.2px;
    }

    .powered-by {
      margin-top: 4px;
      padding-top: 3px;
      border-top: 1px dashed #999;
      font-size: 11px;
      font-weight: 700;
      color: #000;
    }

    .powered-by b {
      color: #000;

      font-weight: 900;
      font-size: 14px;

    }

    /* ================================
       PRINT
    ================================= */

   @media print {
  @page {
    margin: 0;
    size: 80mm auto;
  }
  html,
  body {
    width: 72mm !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
  }
  .kot {
    width: 72mm;
    margin: 0;
    padding: 0 1mm 2mm;
  }
}

  </style>
</head>

<body>

  <div class="kot">

    <!-- ==========================
         HEADER
    =========================== -->

    <div class="header">

      

      <div class="main-title">
        ${escapeHtml(kotTitle)}
      </div>

      <div class="subtitle">
        ${escapeHtml(kotSubtitle)}
      </div>

      <div class="order-id">
        #${escapeHtml(order.orderId || "-")}
      </div>

      <div class="order-badge">
        ${escapeHtml(orderType)}
      </div>

    </div>

    <div class="solid-divider"></div>

    <!-- ==========================
         ORDER INFORMATION
    =========================== -->

    <div class="section-heading">
      Order Information
    </div>

    <div class="meta">

      <div class="meta-row">
        <span class="meta-label">
          TABLE
        </span>

        <span class="meta-value">
          ${escapeHtml(tableLabel)}
        </span>
      </div>

      <div class="meta-row">
        <span class="meta-label">
          CUSTOMER
        </span>

        <span class="meta-value">
          ${escapeHtml(order.customerName || "Guest")}
        </span>
      </div>

      <div class="meta-row">
        <span class="meta-label">
          DATE
        </span>

        <span class="meta-value">
          ${dateStr}
        </span>
      </div>

      <div class="meta-row">
        <span class="meta-label">
          TIME
        </span>

        <span class="meta-value">
          ${timeStr}
        </span>
      </div>

    </div>

    <div class="divider"></div>

    <!-- ==========================
         ITEMS
    =========================== -->

    <div class="section-heading">
      Order Items
    </div>

    <div class="items-header">

      <div class="number">
        #
      </div>

      <div class="name">
        ITEM
      </div>

      <div class="quantity">
        QTY
      </div>

    </div>

    <table>

      <tbody>
        ${kotRows}
        ${cancelledRows}
      </tbody>

    </table>

    <!-- ==========================
         ITEM SUMMARY
    =========================== -->

    <div class="item-summary">

      <span class="summary-label">
        TOTAL ITEMS
      </span>

      <span class="summary-value">
        ${activeItems.reduce(
          (total, item) => total + Number(item.quantity || 0),
          0,
        )}
      </span>

    </div>

    <!-- ==========================
         SPECIAL INSTRUCTIONS
    =========================== -->

    ${
      order.notes
        ? `
          <div class="notes">

            <div class="notes-title">
              Special Instructions
            </div>

            <div class="note">
              ${escapeHtml(order.notes)}
            </div>

          </div>
        `
        : ""
    }

    <!-- ==========================
         FOOTER
    =========================== -->

    <div class="footer">

      <div class="kitchen-copy">
        KITCHEN COPY
      </div>

      <div class="powered-by">
        Powered by <b>ChotuGTT</b>
      </div>

    </div>

  </div>
</body>
</html>
`;

      // -----------------------------------------
      // OPEN PRINT WINDOW
      // -----------------------------------------
      try {
        await printThermalHtml(windowContent);
      } catch (error) {
        console.error("KOT print failed:", error);
        showError("KOT could not be printed. Check the printer and try again.");
        return;
      }

      try {
        await axios.patch(
          `${apiBase}/orders/${order._id}/kot/printed`,
          {
            itemIds: activeItems.map((item) => item._id),
            reprint: isRevisedOrder,
          },
          {
            withCredentials: true,
          },
        );

        const printedIds = new Set(activeItems.map((item) => String(item._id)));

        setKotItems((currentItems) =>
          isRevisedOrder
            ? []
            : currentItems.filter((item) => !printedIds.has(String(item._id))),
        );
        if (isRevisedOrder) {
          setCancelledKotItems([]);
          setSelectedOrder(null);
        }
        queryClient.invalidateQueries({
          queryKey: ["live-orders", restaurantId],
        });

        showSuccess(
          isRevisedOrder
            ? "Updated KOT printed"
            : isRunningOrder
              ? "Running Order KOT Printed Successfully"
              : "New Order KOT Printed Successfully",
        );
      } catch (error) {
        console.error("Failed to mark KOT printed:", error);

        showError(
          error.response?.data?.message ||
            "KOT printed, but tracking update failed.",
        );
      }
    },
    [apiBase, queryClient, restaurantId, showError, showSuccess],
  );

  useEffect(() => {
    const autoPrintKOT = location.state?.autoPrintKOT;

    if (
      !autoPrintKOT?.order ||
      !Array.isArray(autoPrintKOT.items) ||
      autoPrintKOT.items.length === 0
    ) {
      return;
    }

    /*
     * Give LiveOrderMonitor one render cycle to finish mounting
     * before opening the browser print window.
     */
    const timer = window.setTimeout(async () => {
      try {
        console.log("🧾 Auto printing KOT from global order alert:", {
          orderId: autoPrintKOT.order?.orderId,
          itemCount: autoPrintKOT.items.length,
        });

        await printKOT({
          order: autoPrintKOT.order,
          items: autoPrintKOT.items,
          kotType: autoPrintKOT.kotType || "NEW",
        });
      } catch (error) {
        console.error("❌ Auto KOT print failed:", error);
      } finally {
        /*
         * Remove navigation state so browser refresh/back-forward
         * does not print the same KOT again.
         */
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname + window.location.search,
        );
      }
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.state, printKOT]);
  useEffect(() => {
    axios
      .get(`${apiBase}/restaurant/profile`, { withCredentials: true })
      .then((res) => {
        const d = res.data?.data;
        if (d) {
          // 🔑 address ab object hai — string  lo
          const formattedAddress = d.address
            ? [d.address.street, d.address.city, d.address.state, d.address.zip]
                .filter(Boolean)
                .join(", ")
            : "";

          setStoreDetails({
            name: d.name || "",
            logo: d.logo || "",

            address: formattedAddress,
            contact: d.phone || d.contactNumber || d.contact || "",
            fssaiNumber: d.fssaiNumber || "",
            taxRate: Number(d.taxRate || 0),

            gstin: d.gstin || d.gstNumber || "",
            upiId: d.upiId || "",
            upiQrCode: d.upiQrCode || d.qrCodeUrl || "",
            googleReviewQrCode: d.googleReviewQrCode || "",
          });
          if (d.billTemplate) setSelectedBillTemplate(d.billTemplate);
        }
      })
      .catch((err) =>
        console.warn(
          "Could not fetch restaurant profile for bill print:",
          err?.message,
        ),
      );
  }, [apiBase]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["live-orders", restaurantId],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/orders/live`, {
        withCredentials: true,
      });
      return res.data.data || [];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: tableStatus = [], isLoading: isLoadingTableStatus } = useQuery({
    queryKey: ["table-status", restaurantId],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/tables/status`, {
        withCredentials: true,
      });
      return res.data.data || [];
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [listFilter, setListFilter] = useState("ALL");
  const [listSearch, setListSearch] = useState("");
  const [detailOrderId, setDetailOrderId] = useState(null);
  const [detailClosed, setDetailClosed] = useState(false);
  const itemsPerPage = 8;

  const visibleOrders = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (listFilter === "READY" && kitchenLabel(order) !== "READY") return false;
      if (
        listFilter !== "ALL" &&
        listFilter !== "READY" &&
        order.status !== listFilter
      ) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        order.orderId,
        order.tableNumber,
        order.customerName,
        order.customerPhone,
        order.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orders, listFilter, listSearch]);

  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = visibleOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(visibleOrders.length / itemsPerPage);
  const detailOrder = detailClosed
    ? null
    : orders.find((order) => String(order._id) === String(detailOrderId)) ||
      currentOrders[0] ||
      visibleOrders[0] ||
      null;

  useEffect(() => {
    setCurrentPage(1);
  }, [listFilter, listSearch]);

  const kitchenCounts = useMemo(() => {
    return {
      total: orders.length,
      preparing: orders.filter((order) => kitchenLabel(order) === "PREPARING").length,
      ready: orders.filter((order) => kitchenLabel(order) === "READY").length,
      completed: orders.filter((order) => order.status === "COMPLETED").length,
      rejected: orders.filter((order) => order.status === "REJECTED").length,
      pending: orders.filter((order) => order.status === "PENDING").length,
      accepted: orders.filter((order) => order.status === "ACCEPTED").length,
    };
  }, [orders]);

  const handleStatusClick = useCallback((orderId, status) => {
    if (status === "REJECTED") {
      setRejectModalOrder(orderId);
      return;
    }

    setStatusPopupOrderId(orderId);
    setStatusPopupType(status);
    setShowStatusPopup(true);
  }, []);

  useEffect(() => {
    if (!socket || !restaurantId) return;

    const sameTenant = (order) => {
      const eventRestaurantId =
        typeof order?.restaurantId === "object"
          ? order?.restaurantId?._id
          : order?.restaurantId;
      if (!eventRestaurantId) return true;
      return String(eventRestaurantId) === String(restaurantId);
    };

    // ==========================================
    // NEW ORDER
    // ==========================================
    const handleNewOrder = (newOrder) => {
      if (!sameTenant(newOrder)) return;

      queryClient.setQueryData(["live-orders", restaurantId], (old = []) => {
        const exists = old.some(
          (o) => String(o?._id) === String(newOrder?._id),
        );

        if (exists) {
          return old.map((o) =>
            String(o?._id) === String(newOrder?._id) ? newOrder : o,
          );
        }

        return [newOrder, ...old];
      });

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });

      setCurrentPage(1);
    };

    // ==========================================
    // NORMAL ORDER STATUS UPDATE
    // ==========================================
    const handleOrderUpdated = (updatedOrder) => {
      if (!sameTenant(updatedOrder)) return;

      queryClient.setQueryData(["live-orders", restaurantId], (old = []) => {
        if (
          updatedOrder.status === "COMPLETED" ||
          updatedOrder.status === "REJECTED"
        ) {
          return old.filter(
            (o) => String(o?._id) !== String(updatedOrder?._id),
          );
        }

        const exists = old.some(
          (o) => String(o?._id) === String(updatedOrder?._id),
        );

        if (!exists) {
          return [updatedOrder, ...old];
        }

        return old.map((o) =>
          String(o?._id) === String(updatedOrder?._id) ? updatedOrder : o,
        );
      });

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
    };

    // ==========================================
    // 🔥 RUNNING ORDER UPDATE
    // ==========================================
    const handleRunningOrderUpdated = (payload) => {
      const order = payload?.order ?? payload;
      if (!sameTenant(order)) return;

      /*
       * Backend contract:
       * {
       *   order: <FULL UPDATED ORDER>,
       *   items: <ONLY ITEMS ADDED BY THIS REQUEST>,
       *   kotType: "RUNNING"
       * }
       *
       * LiveOrderMonitor cache must keep the FULL order.
       * GlobalOrderAlert is responsible for displaying only payload.items
       * in the blocking running-order popup.
       */
      const updatedOrder = payload?.order ?? null;

      if (!updatedOrder?._id) {
        console.warn(
          "⚠️ RUNNING_ORDER_UPDATED received without order ID",
          payload,
        );
        return;
      }

      queryClient.setQueryData(["live-orders", restaurantId], (old = []) => {
        const exists = old.some(
          (order) => String(order?._id) === String(updatedOrder._id),
        );

        if (exists) {
          return old.map((order) =>
            String(order?._id) === String(updatedOrder._id)
              ? {
                  ...order,
                  ...updatedOrder,
                }
              : order,
          );
        }

        // Defensive fallback for a race where the socket event arrives
        // before the initial live-orders query has populated the cache.
        return [updatedOrder, ...old];
      });

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });

      // Keep existing UX: updated order appears on page 1.
      setCurrentPage(1);
    };

    // ==========================================
    // SOCKET LISTENERS
    // ==========================================
    socket.on("NEW_ORDER_RECEIVED", handleNewOrder);

    socket.on("ORDER_STATUS_UPDATED", handleOrderUpdated);

    socket.on("RUNNING_ORDER_UPDATED", handleRunningOrderUpdated);

    socket.on("ORDER_ITEM_READY_STATUS_UPDATED", handleItemReadyStatusUpdated);

    const handleReconnect = () => {
      queryClient.invalidateQueries({
        queryKey: ["live-orders", restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
    };

    socket.io.on("reconnect", handleReconnect);
    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      socket.off("NEW_ORDER_RECEIVED", handleNewOrder);

      socket.off("ORDER_STATUS_UPDATED", handleOrderUpdated);

      socket.off("RUNNING_ORDER_UPDATED", handleRunningOrderUpdated);
      socket.off(
        "ORDER_ITEM_READY_STATUS_UPDATED",
        handleItemReadyStatusUpdated,
      );
      socket.io.off("reconnect", handleReconnect);
    };
  }, [socket, restaurantId, queryClient]);

  // ==========================================
  // ITEM READY / SERVED UPDATE
  // ==========================================
  const handleItemReadyStatusUpdated = (payload) => {
    const orderId = payload?.orderId;
    const itemId = payload?.itemId;

    if (!orderId || !itemId) {
      return;
    }

    queryClient.setQueryData(["live-orders", restaurantId], (oldOrders = []) =>
      oldOrders.map((order) => {
        if (String(order?._id) !== String(orderId)) {
          return order;
        }

        return {
          ...order,
          items: (order.items || []).map((item) =>
            String(item?._id) === String(itemId)
              ? {
                  ...item,
                  itemReadyStatus:
                    payload.itemReadyStatus || item.itemReadyStatus,
                  readyAt: payload.readyAt ?? item.readyAt ?? null,
                  readyBy: payload.readyBy ?? item.readyBy ?? null,
                  servedAt: payload.servedAt ?? item.servedAt ?? null,
                  servedBy: payload.servedBy ?? item.servedBy ?? null,
                }
              : item,
          ),
        };
      }),
    );
  };

  // ==========================================================
  // ITEM READY / SERVED STATUS
  // ==========================================================
  // PREPARING -> READY -> SERVED
  //
  // Backend is the final authority for:
  // - authentication
  // - tenant isolation
  // - order ownership
  // - item ownership
  // - allowed state transition
  //
  // Frontend only sends the requested next state.
  // ==========================================================

  // ==========================================================
  // ITEM READY / SERVED STATUS
  // PREPARING -> READY -> SERVED
  // ==========================================================

  const handleItemReadyStatus = useCallback(
    async (orderId, itemId, nextStatus) => {
      if (!orderId || !itemId) {
        showError("Invalid order item. Please refresh and try again.");
        return;
      }

      if (!["READY", "SERVED"].includes(nextStatus)) {
        showError("Invalid item status.");
        return;
      }

      try {
        const res = await axios.patch(
          `${apiBase}/orders/${orderId}/item/${itemId}/ready-status`,
          {
            status: nextStatus,
          },
          {
            withCredentials: true,
          },
        );

        // Backend currently returns:
        // data: {
        //   orderId,
        //   itemId,
        //   itemReadyStatus,
        //   readyAt,
        //   readyBy,
        //   servedAt,
        //   servedBy
        // }
        const updatedData = res.data?.data;

        if (!updatedData?.itemId) {
          throw new Error("Updated item was not returned by server.");
        }

        // ------------------------------------------------------
        // Update ONLY the changed item in React Query cache
        // ------------------------------------------------------

        queryClient.setQueryData(
          ["live-orders", restaurantId],
          (oldOrders = []) =>
            oldOrders.map((order) => {
              if (String(order?._id) !== String(orderId)) {
                return order;
              }

              return {
                ...order,

                items: (order.items || []).map((item) => {
                  if (String(item?._id) !== String(itemId)) {
                    return item;
                  }

                  return {
                    ...item,

                    itemReadyStatus: updatedData.itemReadyStatus || nextStatus,

                    readyAt: updatedData.readyAt ?? item.readyAt ?? null,

                    readyBy: updatedData.readyBy ?? item.readyBy ?? null,

                    servedAt: updatedData.servedAt ?? item.servedAt ?? null,

                    servedBy: updatedData.servedBy ?? item.servedBy ?? null,
                  };
                }),
              };
            }),
        );

        showSuccess(
          nextStatus === "READY" ? "Item marked READY" : "Item marked SERVED",
        );
      } catch (err) {
        console.error("❌ Failed to update item ready status:", err);

        showError(
          err.response?.data?.message ||
            err.message ||
            "Failed to update item status",
        );
      }
    },
    [apiBase, queryClient, restaurantId, showError, showSuccess],
  );
  // 🆕 Cancel a single item — hits the real backend endpoint and refreshes
  // subtotal/tax/total from the response (backend does the recalculation).
  //
  // IMPORTANT:
  // `itemId` here MUST be the embedded Order.items._id.
  // It must never fall back to the catalog MenuItem/Combo `itemId`.
  const handleCancelItem = useCallback((orderId, itemId) => {
    if (!orderId || !itemId) {
      console.warn("⚠️ Cancel item ignored: missing order-item id", {
        orderId,
        itemId,
      });
      return;
    }

    setCancelItemData({
      orderId: String(orderId),
      itemId: String(itemId),
    });
  }, []);

  const confirmCancelItem = useCallback(async () => {
    if (!cancelItemData) return;

    const { orderId, itemId } = cancelItemData;

    if (!orderId || !itemId) {
      setCancelItemData(null);
      showError("Invalid order item. Please refresh the order and try again.");
      return;
    }

    try {
      const res = await axios.patch(
        `${apiBase}/orders/${orderId}/item/${itemId}/cancel`,
        {},
        { withCredentials: true },
      );

      const updatedOrder = res.data?.data;

      if (!updatedOrder?._id) {
        throw new Error("Updated order was not returned by server.");
      }

      queryClient.setQueryData(
        ["live-orders", restaurantId],
        (oldOrders = []) =>
          oldOrders.map((order) =>
            String(order?._id) === String(orderId) ? updatedOrder : order,
          ),
      );

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });

      setCancelItemData(null);

      showSuccess(
        updatedOrder.kotReprintRequired
          ? "Item cancelled. Open the order and print the updated KOT."
          : "Item Cancelled Successfully",
      );
    } catch (err) {
      console.error("❌ Failed to cancel item:", err);

      setCancelItemData(null);

      showError(
        err.response?.data?.message || err.message || "Failed to cancel item",
      );
    }
  }, [
    cancelItemData,
    apiBase,
    queryClient,
    restaurantId,
    showSuccess,
    showError,
  ]);

  const handleStatusTransition = useCallback(
    async (orderId, targetStatus, customReason = "") => {
      let rejectReason = customReason;

      if (targetStatus === "REJECTED" && !rejectReason) {
        setRejectModalOrder(orderId);
        return;
      }

      try {
        const res = await axios.patch(
          `${apiBase}/orders/${orderId}/status`,
          { status: targetStatus, rejectReason },
          { withCredentials: true },
        );
        showSuccess(
          targetStatus === "ACCEPTED"
            ? "Order Accepted Successfully"
            : "Order Rejected Successfully",
        );
        const updatedOrderFromBackend = res.data.data;
        const newKotItems = res.data.kotItems || [];

        queryClient.setQueryData(["live-orders", restaurantId], (oldOrders) =>
          (oldOrders || []).map((order) =>
            order._id === orderId ? updatedOrderFromBackend : order,
          ),
        );

        if (targetStatus === "ACCEPTED" && newKotItems.length > 0) {
          // 🧾 Initial customer order
          // MUST always print as NEW ORDER KOT.
          await printKOT({
            order: updatedOrderFromBackend,
            items: newKotItems,
            kotType: "NEW",
          });
        }

        queryClient.setQueryData(["live-orders", restaurantId], (oldOrders) =>
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
        queryClient.invalidateQueries({
          queryKey: ["table-status", restaurantId],
        });
        setRejectModalOrder(null);
      } catch (err) {
        showError(
          err.response?.data?.message ||
            `Failed to ${
              targetStatus === "ACCEPTED" ? "accept" : "reject"
            } order`,
        );
        console.error("Error transitioning state context pipeline:", err);
      }
    },
    [queryClient, apiBase, restaurantId, showSuccess, showError, printKOT],
  );

  // 🧾 Opens a thermal-receipt-style print window for a completed order
  const printBillReceipt = useCallback(
    (order, options = {}) =>
      printOrderBill({
        order,
        storeDetails,
        user,
        selectedBillTemplate,
        onError: showError,
        duplicate: Boolean(options.duplicate),
      }),
    [storeDetails, user, showError, selectedBillTemplate],
  );

  // 🔄 Live-sync bill template & store details when owner updates
  // restaurant profile (e.g. from a different tab/device) or completes
  // a Pro template payment. Without this, cashiers had to refresh the
  // page to pick up the new template — which was the root cause of
  // "sometimes applies, sometimes doesn't".
  useEffect(() => {
    if (!socket || !restaurantId) return;

    const handleProfileUpdated = async (payload) => {
      // Fast-path: apply template instantly if server sent it in the event
      if (payload?.restaurant?.billTemplate) {
        setSelectedBillTemplate(payload.restaurant.billTemplate);
        saveSelectedBillTemplate(restaurantId, payload.restaurant.billTemplate);
      }

      // Always re-fetch full profile so logo/address/UPI/GST/tax etc.
      // used on the printed bill stay accurate too.
      try {
        const res = await axios.get(`${apiBase}/restaurant/profile`, {
          withCredentials: true,
        });
        const d = res.data?.data;
        if (!d) return;

        const formattedAddress = d.address
          ? [d.address.street, d.address.city, d.address.state, d.address.zip]
              .filter(Boolean)
              .join(", ")
          : "";

        setStoreDetails({
          name: d.name || "",
          logo: d.logo || "",
          address: formattedAddress,
          contact: d.phone || d.contactNumber || d.contact || "",
          fssaiNumber: d.fssaiNumber || "",
          taxRate: Number(d.taxRate || 0),
          gstin: d.gstin || d.gstNumber || "",
          upiId: d.upiId || "",
          upiQrCode: d.upiQrCode || d.qrCodeUrl || "",
          googleReviewQrCode: d.googleReviewQrCode || "",
        });

        if (d.billTemplate) {
          setSelectedBillTemplate(d.billTemplate);
          saveSelectedBillTemplate(restaurantId, d.billTemplate);
        }
      } catch (err) {
        console.warn(
          "Could not refresh restaurant profile after live update:",
          err?.message,
        );
      }
    };

    socket.on("RESTAURANT_PROFILE_UPDATED", handleProfileUpdated);

    return () => {
      socket.off("RESTAURANT_PROFILE_UPDATED", handleProfileUpdated);
    };
  }, [socket, restaurantId, apiBase]);

  const initializeMixedPayment = useCallback(() => {
    const total = Number(billOrder?.total || 0);

    if (!Number.isFinite(total) || total <= 0) {
      setMixedCashAmount("");
      setMixedUpiAmount("");
      return;
    }

    const half = (total / 2).toFixed(2);

    setMixedCashAmount(half);
    setMixedUpiAmount(half);
  }, [billOrder]);

  // Bill & WhatsApp clear table handler added from TableMonitor
  const handleBillAndWhatsApp = useCallback((order) => {
    setBillOrder(order);

    setSelectedPaymentMethod(null);

    // Existing split state
    setSplitMode(false);
    setSplitCollectMethod("CASH");
    setSplitAmount("");

    // Mixed payment state
    setMixedCashAmount("");
    setMixedUpiAmount("");
    setIsMixedSubmitting(false);
  }, []);

  const confirmSplitBill = useCallback(async () => {
    if (!billOrder) return;

    const total = Number(billOrder.total || 0);
    const amount = Number(splitAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Enter a valid amount to collect now.");
      return;
    }

    if (amount >= total) {
      showError("Split amount must be less than the total bill.");
      return;
    }

    if (isSplitSubmitting) return;
    setIsSplitSubmitting(true);

    try {
      const res = await axios.patch(
        `${apiBase}/orders/${billOrder._id}/split-complete`,
        {
          paymentMethod: splitCollectMethod,
          paidAmount: amount,
        },
        {
          withCredentials: true,
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
      );

      const completedOrder = res.data?.data;
      const billedId = billOrder._id;

      setBillOrder(null);
      setSelectedPaymentMethod(null);
      setSplitMode(false);
      setSplitAmount("");

      await printBillReceipt(completedOrder || billOrder);

      queryClient.setQueryData(["live-orders", restaurantId], (prev) =>
        (prev || []).filter((o) => o._id !== billedId),
      );

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
      queryClient.invalidateQueries({ queryKey: ["table-monitor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-prev"] });

      showSuccess(
        `₹${amount.toFixed(2)} collected via ${splitCollectMethod}. Remaining ₹${(total - amount).toFixed(2)} saved as Due.`,
      );
    } catch (err) {
      console.error("Failed to split bill:", err);
      showError(
        err.response?.data?.message || "Failed to process split payment.",
      );
      queryClient.invalidateQueries({
        queryKey: ["live-orders", restaurantId],
      });
    } finally {
      setIsSplitSubmitting(false);
    }
  }, [
    billOrder,
    splitAmount,
    splitCollectMethod,
    isSplitSubmitting,
    apiBase,
    printBillReceipt,
    queryClient,
    restaurantId,
    showSuccess,
    showError,
  ]);

  const confirmMixedPayment = useCallback(async () => {
    if (!billOrder) return;

    if (isMixedSubmitting) return;

    const total = Number(billOrder.total || 0);
    const cash = Number(mixedCashAmount);
    const upi = Number(mixedUpiAmount);

    if (!Number.isFinite(total) || total <= 0) {
      showError("Invalid bill total.");
      return;
    }

    if (!Number.isFinite(cash) || !Number.isFinite(upi)) {
      showError("Enter valid Cash and UPI amounts.");
      return;
    }

    if (cash <= 0 || upi <= 0) {
      showError("Both Cash and UPI amounts must be greater than zero.");
      return;
    }

    const collected = Number((cash + upi).toFixed(2));

    if (collected !== Number(total.toFixed(2))) {
      showError(`Cash + UPI must exactly equal ₹${total.toFixed(2)}.`);
      return;
    }

    setIsMixedSubmitting(true);

    try {
      const res = await axios.patch(
        `${apiBase}/orders/${billOrder._id}/mixed-payment`,
        {
          cashAmount: Number(cash.toFixed(2)),
          upiAmount: Number(upi.toFixed(2)),
        },
        {
          withCredentials: true,
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
      );

      const completedOrder = res.data?.data;

      if (!completedOrder) {
        throw new Error("Payment completed but bill data was not returned.");
      }

      const billedId = billOrder._id;

      setBillOrder(null);
      setSelectedPaymentMethod(null);
      setSplitMode(false);
      setSplitAmount("");
      setMixedCashAmount("");
      setMixedUpiAmount("");

      // Print ONLY after server confirms payment.
      await printBillReceipt(completedOrder);

      // Remove from local live orders immediately.
      queryClient.setQueryData(["live-orders", restaurantId], (prev) =>
        (prev || []).filter((o) => o._id !== billedId),
      );

      // Refresh related data.
      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });

      queryClient.invalidateQueries({
        queryKey: ["table-monitor-orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["bills"],
      });

      queryClient.invalidateQueries({
        queryKey: ["bills-prev"],
      });

      showSuccess(
        `₹${cash.toFixed(2)} Cash + ₹${upi.toFixed(
          2,
        )} UPI collected successfully.`,
      );
    } catch (err) {
      console.error("Failed to process mixed payment:", err);

      showError(
        err.response?.data?.message || "Failed to process mixed payment.",
      );

      // Re-sync live state from server.
      queryClient.invalidateQueries({
        queryKey: ["live-orders", restaurantId],
      });
    } finally {
      setIsMixedSubmitting(false);
    }
  }, [
    billOrder,
    mixedCashAmount,
    mixedUpiAmount,
    isMixedSubmitting,
    apiBase,
    printBillReceipt,
    queryClient,
    restaurantId,
    showSuccess,
    showError,
  ]);

  const confirmGenerateBill = useCallback(async () => {
    if (!billOrder || !selectedPaymentMethod) {
      showError("Please select a payment method.");
      return;
    }

    if (selectedPaymentMethod === "MIXED") {
      await confirmMixedPayment();
      return;
    }
    if (isGeneratingBill) return;

    setIsGeneratingBill(true);

    try {
      const res = await axios.patch(
        `${apiBase}/orders/${billOrder._id}/complete`,
        {
          paymentMethod: selectedPaymentMethod,
        },
        {
          withCredentials: true,
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        },
      );

      const completedOrder = res.data?.data;
      const billedId = billOrder._id;
      const paymentLabel = selectedPaymentMethod;

      setBillOrder(null);
      setSelectedPaymentMethod(null);

      // Print bill with payment information
      await printBillReceipt(completedOrder || billOrder);

      // Remove completed order from live monitor
      queryClient.setQueryData(["live-orders", restaurantId], (prev) =>
        (prev || []).filter((o) => o._id !== billedId),
      );

      // Refresh table status
      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });

      queryClient.invalidateQueries({
        queryKey: ["table-monitor-orders"],
      });

      // Refresh payment page data if cached
      queryClient.invalidateQueries({
        queryKey: ["bills"],
      });

      queryClient.invalidateQueries({
        queryKey: ["bills-prev"],
      });

      showSuccess(
        paymentLabel === "DUE"
          ? "Bill generated and marked as Due"
          : `Bill generated via ${paymentLabel}`,
      );
    } catch (err) {
      console.error("Failed to complete order:", err);

      showError(err.response?.data?.message || "Failed to generate bill.");

      queryClient.invalidateQueries({
        queryKey: ["live-orders", restaurantId],
      });
    } finally {
      setIsGeneratingBill(false);
    }
  }, [
    restaurantId,
    billOrder,
    selectedPaymentMethod,
    isGeneratingBill,
    apiBase,
    printBillReceipt,
    queryClient,
    showSuccess,
    showError,
    confirmMixedPayment,
  ]);

  const handleView = useCallback(
    async (order) => {
      if (!order?._id) {
        showError("Invalid order selected.");
        return;
      }

      try {
        const res = await axios.get(`${apiBase}/orders/${order._id}/kot`, {
          withCredentials: true,
        });

        const responseData = res.data || {};
        const data = responseData.data || {};

        const latestOrder = data.order || order;

        const items = Array.isArray(data.items)
          ? data.items.filter((item) => item?.status !== "REJECTED")
          : [];
        const cancelledItems = Array.isArray(data.cancelledItems)
          ? data.cancelledItems
          : [];

        const type =
          responseData.kotType ||
          data.kotType ||
          (latestOrder.status === "PENDING" ? "NEW" : "RUNNING");

        console.log("👁️ VIEW KOT:", {
          orderId: latestOrder.orderId,
          kotType: type,
          itemIds: items.map((item) => String(item._id)),
        });

        setSelectedOrder(latestOrder);
        setKotItems(items);
        setCancelledKotItems(cancelledItems);
        setKotType(type);
      } catch (error) {
        console.error("Failed to fetch KOT items:", error);

        setSelectedOrder(order);
        setKotItems([]);
        setCancelledKotItems([]);
        setKotType("NEW");

        showError(error.response?.data?.message || "Failed to load KOT items.");
      }
    },
    [apiBase, showError],
  );
  const handleCloseModal = useCallback(() => {
    setSelectedOrder(null);
    setKotItems([]);
    setCancelledKotItems([]);
  }, []);

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
    <>
      {showStatusPopup && statusPopupType === "ACCEPTED" && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <Check size={24} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">Accept Order?</h3>

            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to accept this order?
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStatusPopup(false);
                  setStatusPopupOrderId(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowStatusPopup(false);

                  handleStatusTransition(statusPopupOrderId, "ACCEPTED");

                  setStatusPopupOrderId(null);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-200"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelItemData && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <X size={24} strokeWidth={2.5} />
            </div>

            <h3 className="text-lg font-black text-slate-900">Cancel Item?</h3>

            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to cancel this item? The order total will be
              recalculated.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCancelItemData(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                Keep Item
              </button>

              <button
                onClick={confirmCancelItem}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 transition shadow-sm shadow-rose-200"
              >
                Cancel Item
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed top-6 right-6 z-[10001] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-3 w-[calc(100%-2rem)] max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check size={20} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Success</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowSuccessPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {billOrder && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center">
            {/* BILL MODAL */}
            <div className="w-full max-w-md max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              {/* =========================================================
            HEADER
        ========================================================== */}
              <div className="px-5 py-5 sm:p-6 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <IndianRupee size={22} strokeWidth={2.5} />
                  </div>

                  {/* Title */}
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900">
                      Generate Bill
                    </h3>

                    <p className="text-xs text-slate-500 mt-0.5">
                      Select payment method to complete the bill
                    </p>
                  </div>
                </div>
              </div>

              {/* =========================================================
            SCROLLABLE BODY
        ========================================================== */}
              <div
                className="
            flex-1
            min-h-0
            overflow-y-auto
            overscroll-contain
            scrollbar-thin
            scrollbar-thumb-slate-300
            scrollbar-track-transparent
          "
              >
                {/* =======================================================
              ORDER SUMMARY
          ======================================================== */}
                <div className="px-5 pt-5 sm:px-6 sm:pt-5">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-start gap-4">
                      {/* Order */}
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                          Order
                        </p>

                        <p className="text-sm font-black text-slate-800 mt-1 font-mono truncate">
                          {billOrder.orderId}
                        </p>

                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {billOrder.customerName || "Guest"}
                        </p>
                      </div>

                      {/* Table */}
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                          Table
                        </p>

                        <p className="text-sm font-black text-slate-800 mt-1 font-mono">
                          {billOrder.tableNumber}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">
                        Amount Payable
                      </span>

                      <span className="text-xl font-black text-slate-900 font-mono">
                        ₹{Number(billOrder.total || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* =======================================================
              PAYMENT METHODS
          ======================================================== */}
                <div className="p-5 sm:p-6">
                  <p className="text-[10px] uppercase tracking-wider font-black text-slate-400 mb-3">
                    Payment Method
                  </p>

                  {/* PAYMENT GRID */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* =================================================
                  CASH
              ================================================== */}
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode(false);

                        if (
                          selectedPaymentMethod === "UPI" ||
                          selectedPaymentMethod === "MIXED"
                        ) {
                          setSelectedPaymentMethod("MIXED");

                          const total = Number(billOrder?.total || 0);

                          if (total > 0) {
                            const half = (total / 2).toFixed(2);

                            setMixedCashAmount(half);
                            setMixedUpiAmount(half);
                          }
                        } else {
                          setSelectedPaymentMethod("CASH");
                        }
                      }}
                      className={`
                  p-2 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "CASH"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30"
                  }
                `}
                    >
                      {/* <div className="text-xl mb-2">💵</div> */}

                      <p className="text-xs font-black">Cash</p>

                      <p className="text-[9px] mt-1 opacity-70">Paid</p>
                    </button>

                    {/* =================================================
                  UPI
              ================================================== */}
                    <button
                      type="button"
                      onClick={() => {
                        setSplitMode(false);

                        if (
                          selectedPaymentMethod === "CASH" ||
                          selectedPaymentMethod === "MIXED"
                        ) {
                          setSelectedPaymentMethod("MIXED");

                          const total = Number(billOrder?.total || 0);

                          if (total > 0) {
                            const half = (total / 2).toFixed(2);

                            setMixedCashAmount(half);
                            setMixedUpiAmount(half);
                          }
                        } else {
                          setSelectedPaymentMethod("UPI");
                        }
                      }}
                      className={`
                  p-2 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "UPI"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/30"
                  }
                `}
                    >
                      {/* <div className="text-xl mb-2">🏦</div> */}

                      <p className="text-xs font-black">UPI</p>

                      <p className="text-[9px] mt-1 opacity-70">Paid</p>
                    </button>

                    {/* =================================================
                  DUE
              ================================================== */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("DUE");
                        setSplitMode(false);
                      }}
                      className={`
                  p-2 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "DUE"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/30"
                  }
                `}
                    >
                      {/* <div className="text-xl mb-2">⏳</div> */}

                      <p className="text-xs font-black">Due</p>

                      <p className="text-[9px] mt-1 opacity-70">Unpaid</p>
                    </button>

                    {/* =================================================
                  SPLIT BILL
              ================================================== */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("SPLIT");
                        setSplitMode(true);

                        setSplitAmount(
                          billOrder
                            ? (Number(billOrder.total || 0) / 2).toFixed(2)
                            : "",
                        );
                      }}
                      className={`
                  p-2 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "SPLIT"
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/30"
                  }
                `}
                    >
                      {/* <div className="text-xl mb-2">🔀</div> */}

                      <p className="text-xs font-black">Split Bill</p>

                      <p className="text-[9px] mt-1 opacity-70">Pay part now</p>
                    </button>
                  </div>

                  {/* =====================================================
                DUE INFORMATION
            ====================================================== */}
                  {selectedPaymentMethod === "DUE" && (
                    <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-start gap-2">
                        <span className="text-sm">⏳</span>

                        <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                          ₹
                          {Number(billOrder.total || 0).toLocaleString("en-IN")}{" "}
                          will be recorded as customer due.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* =====================================================
    MIXED PAYMENT PANEL
====================================================== */}

                  {selectedPaymentMethod === "MIXED" && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                      {/* HEADER */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            Mixed Payment
                          </p>

                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Collect the bill using Cash + UPI
                          </p>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                          💵
                        </div>
                      </div>

                      {/* BILL TOTAL */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                        <span className="text-xs font-bold text-slate-500">
                          Bill Total
                        </span>

                        <span className="text-base font-black text-slate-900">
                          ₹{Number(billOrder?.total || 0).toFixed(2)}
                        </span>
                      </div>

                      {/* CASH */}
                      <div className="mt-4">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-2">
                          Cash Amount
                        </label>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                            ₹
                          </span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={mixedCashAmount}
                            onChange={(e) => {
                              const value = e.target.value;

                              setMixedCashAmount(value);

                              const total = Number(billOrder?.total || 0);
                              const cash = Number(value);

                              if (
                                Number.isFinite(total) &&
                                Number.isFinite(cash) &&
                                cash >= 0 &&
                                cash <= total
                              ) {
                                setMixedUpiAmount(
                                  Math.max(0, total - cash).toFixed(2),
                                );
                              }
                            }}
                            className="
            w-full
            pl-8
            pr-4
            py-3
            rounded-xl
            border
            border-slate-200
            bg-white
            text-sm
            font-bold
            text-slate-900
            focus:outline-none
            focus:border-emerald-500
            focus:ring-4
            focus:ring-emerald-500/10
          "
                          />
                        </div>
                      </div>

                      {/* UPI */}
                      <div className="mt-4">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-blue-700 mb-2">
                          UPI Amount
                        </label>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                            ₹
                          </span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            inputMode="decimal"
                            value={mixedUpiAmount}
                            onChange={(e) => {
                              const value = e.target.value;

                              setMixedUpiAmount(value);

                              const total = Number(billOrder?.total || 0);
                              const upi = Number(value);

                              if (
                                Number.isFinite(total) &&
                                Number.isFinite(upi) &&
                                upi >= 0 &&
                                upi <= total
                              ) {
                                setMixedCashAmount(
                                  Math.max(0, total - upi).toFixed(2),
                                );
                              }
                            }}
                            className="
            w-full
            pl-8
            pr-4
            py-3
            rounded-xl
            border
            border-slate-200
            bg-white
            text-sm
            font-bold
            text-slate-900
            focus:outline-none
            focus:border-blue-500
            focus:ring-4
            focus:ring-blue-500/10
          "
                          />
                        </div>
                      </div>

                      {/* BREAKDOWN */}
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-500">Cash</span>

                          <span className="font-black text-emerald-600">
                            ₹{Number(mixedCashAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-500">UPI</span>

                          <span className="font-black text-blue-600">
                            ₹{Number(mixedUpiAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-xs font-black text-slate-700">
                            Total Collected
                          </span>

                          <span className="text-sm font-black text-slate-900">
                            ₹
                            {(
                              Number(mixedCashAmount || 0) +
                              Number(mixedUpiAmount || 0)
                            ).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-slate-500">
                            Remaining
                          </span>

                          <span
                            className={`text-sm font-black ${
                              Math.abs(
                                Number(billOrder?.total || 0) -
                                  Number(mixedCashAmount || 0) -
                                  Number(mixedUpiAmount || 0),
                              ) < 0.01
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            ₹
                            {Math.max(
                              0,
                              Number(billOrder?.total || 0) -
                                Number(mixedCashAmount || 0) -
                                Number(mixedUpiAmount || 0),
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* =====================================================
                SPLIT BILL PANEL
            ====================================================== */}
                  {splitMode && selectedPaymentMethod === "SPLIT" && (
                    <div className="mt-4 p-4 rounded-2xl bg-purple-50 border border-purple-100">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-black text-purple-900">
                            Split Payment
                          </p>

                          <p className="text-[10px] text-purple-600 mt-0.5">
                            Collect part of the bill now
                          </p>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-sm">
                          🔀
                        </div>
                      </div>

                      {/* =================================================
                    COLLECT VIA
                ================================================== */}
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 mb-2">
                          Collect via
                        </label>

                        <div className="grid grid-cols-2 gap-2">
                          {/* CASH */}
                          <button
                            type="button"
                            onClick={() => setSplitCollectMethod("CASH")}
                            className={`
                        py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                        active:scale-[0.98]
                        ${
                          splitCollectMethod === "CASH"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }
                      `}
                          >
                            💵 Cash
                          </button>

                          {/* UPI */}
                          <button
                            type="button"
                            onClick={() => setSplitCollectMethod("UPI")}
                            className={`
                        py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                        active:scale-[0.98]
                        ${
                          splitCollectMethod === "UPI"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                        }
                      `}
                          >
                            🏦 UPI
                          </button>
                        </div>
                      </div>

                      {/* =================================================
                    AMOUNT
                ================================================== */}
                      <div className="mt-4">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-purple-700 mb-2">
                          Amount to collect now
                        </label>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">
                            ₹
                          </span>

                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={Number(billOrder.total || 0)}
                            value={splitAmount}
                            onChange={(e) => setSplitAmount(e.target.value)}
                            className="
                        w-full
                        pl-8
                        pr-4
                        py-3
                        rounded-xl
                        border
                        border-purple-200
                        bg-white
                        text-sm
                        font-bold
                        text-slate-900
                        focus:outline-none
                        focus:border-purple-500
                        focus:ring-4
                        focus:ring-purple-500/10
                      "
                          />
                        </div>

                        {/* 50% BUTTON */}
                        <button
                          type="button"
                          onClick={() =>
                            setSplitAmount(
                              (Number(billOrder.total || 0) / 2).toFixed(2),
                            )
                          }
                          className="mt-2 text-[10px] font-bold text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          Set to 50%
                        </button>
                      </div>

                      {/* =================================================
                    PAYMENT BREAKDOWN
                ================================================== */}
                      <div className="mt-4 pt-3 border-t border-purple-200">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-500">
                            Total Bill
                          </span>

                          <span className="font-black text-slate-800">
                            ₹{Number(billOrder.total || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs mt-2">
                          <span className="font-bold text-slate-500">
                            Collect Now
                          </span>

                          <span className="font-black text-emerald-600">
                            ₹{Number(splitAmount || 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-purple-200">
                          <span className="text-xs font-bold text-slate-600">
                            Remaining Due
                          </span>

                          <span className="text-sm font-black text-purple-700">
                            ₹
                            {Math.max(
                              0,
                              Number(billOrder.total || 0) -
                                Number(splitAmount || 0),
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================
            FIXED ACTION FOOTER
        ========================================================== */}
              <div className="px-5 pb-5 pt-3 sm:px-6 sm:pb-6 flex gap-3 shrink-0 bg-white border-t border-slate-100">
                {/* CANCEL */}
                <button
                  type="button"
                  onClick={() => {
                    setBillOrder(null);
                    setSelectedPaymentMethod(null);

                    setSplitMode(false);
                    setSplitAmount("");

                    setMixedCashAmount("");
                    setMixedUpiAmount("");
                  }}
                  disabled={isGeneratingBill || isSplitSubmitting}
                  className="
              flex-1
              py-3
              rounded-xl
              border
              border-slate-200
              text-slate-700
              text-sm
              font-bold
              hover:bg-slate-50
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
                >
                  Cancel
                </button>

                {/* CONFIRM */}
                <button
                  type="button"
                  disabled={
                    selectedPaymentMethod === "SPLIT"
                      ? isSplitSubmitting ||
                        !splitAmount ||
                        Number(splitAmount) <= 0 ||
                        Number(splitAmount) >= Number(billOrder.total || 0)
                      : selectedPaymentMethod === "MIXED"
                        ? isMixedSubmitting ||
                          !mixedCashAmount ||
                          !mixedUpiAmount ||
                          Number(mixedCashAmount) <= 0 ||
                          Number(mixedUpiAmount) <= 0 ||
                          Number(
                            (
                              Number(mixedCashAmount || 0) +
                              Number(mixedUpiAmount || 0)
                            ).toFixed(2),
                          ) !== Number(Number(billOrder.total || 0).toFixed(2))
                        : !selectedPaymentMethod || isGeneratingBill
                  }
                  onClick={
                    selectedPaymentMethod === "SPLIT"
                      ? confirmSplitBill
                      : selectedPaymentMethod === "MIXED"
                        ? confirmMixedPayment
                        : confirmGenerateBill
                  }
                  className="
              flex-1
              py-3
              rounded-xl
              bg-slate-900
              text-white
              text-sm
              font-bold
              hover:bg-slate-800
              transition
              disabled:opacity-40
              disabled:cursor-not-allowed
              flex
              items-center
              justify-center
              gap-2
            "
                >
                  {(selectedPaymentMethod === "SPLIT"
                    ? isSplitSubmitting
                    : isGeneratingBill) && (
                    <Loader2 size={16} className="animate-spin" />
                  )}

                  {selectedPaymentMethod === "SPLIT"
                    ? isSplitSubmitting
                      ? "Processing..."
                      : "Collect & Save Rest as Due"
                    : selectedPaymentMethod === "MIXED"
                      ? isMixedSubmitting
                        ? "Processing..."
                        : "Confirm Cash + UPI"
                      : isGeneratingBill
                        ? "Processing..."
                        : selectedPaymentMethod === "DUE"
                          ? "Save as Due"
                          : "Generate Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showErrorPopup && (
        <div className="fixed top-6 right-6 z-[10002] animate-in slide-in-from-right-5 fade-in duration-300">
          <div className="bg-white border border-slate-200 border-l-4 border-l-rose-500 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-3 w-[calc(100%-2rem)] max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <X size={20} strokeWidth={2.5} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-black text-slate-900">Error</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowErrorPopup(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="-m-4 bg-[var(--background)] p-4 font-sans md:-m-6 md:p-5 lg:-m-8 lg:p-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--primary)] via-[var(--primary)] to-[var(--secondary)] px-5 py-5 text-white shadow-sm">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight">Live Kitchen Monitor</h1>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-black">
                    {orders.filter((order) => order.status === "PENDING" || order.status === "ACCEPTED").length} LIVE
                  </span>
                </div>
                <p className="mt-1 max-w-xl text-sm text-white/85">
                  Manage incoming orders, table occupancy statuses, and kitchen execution queue.
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-black">
                <Radio size={14} className="animate-pulse" /> STREAM ACTIVE
              </div>
              <p className="mt-2 text-xs font-semibold text-white/80">
                {new Date().toLocaleString("en-IN", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            ["Total Orders", kitchenCounts.total, "bg-rose-50 text-rose-500", ClipboardList],
            ["Preparing", kitchenCounts.preparing, "bg-orange-50 text-orange-500", ChefHat],
            ["Ready", kitchenCounts.ready, "bg-sky-50 text-sky-500", Check],
            ["Completed", kitchenCounts.completed, "bg-emerald-50 text-emerald-500", Check],
            ["Cancelled", kitchenCounts.rejected, "bg-rose-50 text-rose-500", X],
          ].map(([label, count, tint, Icon]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
                  <Icon size={16} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">{count}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3">
              {[
                ["ALL", kitchenCounts.total],
                ["PENDING", kitchenCounts.pending],
                ["ACCEPTED", kitchenCounts.accepted],
                ["READY", kitchenCounts.ready],
                ["COMPLETED", kitchenCounts.completed],
                ["REJECTED", kitchenCounts.rejected],
              ].map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setListFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-black ${
                    listFilter === key ? "bg-rose-500 text-white" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {key} {count}
                </button>
              ))}
              <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={listSearch}
                  onChange={(event) => setListSearch(event.target.value)}
                  placeholder="Search by order ID, table or customer..."
                  className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-xs font-semibold outline-none focus:border-rose-300"
                />
              </div>
            </div>

            {visibleOrders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Radio className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">
                  {orders.length === 0 ? "No live orders right now" : "No orders match this filter"}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 lg:hidden">
                  {currentOrders.map((order) => (
                    <OrderCard
                      key={order._id}
                      order={order}
                      onStatusChange={handleStatusClick}
                      onView={handleView}
                      onClear={handleBillAndWhatsApp}
                      onCancelItem={handleCancelItem}
                      onItemReadyStatus={handleItemReadyStatus}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[860px] text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Table / Type</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Items Summary</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentOrders.map((order) => (
                        <OrderRow
                          key={order._id}
                          order={order}
                          isSelected={String(detailOrder?._id) === String(order._id)}
                          onSelect={(selected) => {
                            setDetailClosed(false);
                            setDetailOrderId(selected._id);
                          }}
                          onStatusChange={handleStatusClick}
                          onView={handleView}
                          onClear={handleBillAndWhatsApp}
                          onCancelItem={handleCancelItem}
                          onItemReadyStatus={handleItemReadyStatus}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row">
                    <p className="text-xs font-medium text-slate-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                      {Math.min(indexOfLastOrder, visibleOrders.length)} of {visibleOrders.length} orders
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((page) => page - 1)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                      >
                        <ArrowLeft size={14} /> Previous
                      </button>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((page) => page + 1)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                      >
                        Next <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {detailOrder && (
            <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-black text-slate-900">#{detailOrder.orderId}</p>
                  <p className="text-[11px] text-slate-400">{timeAgo(detailOrder.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${KITCHEN_PILL[kitchenLabel(detailOrder)] || "bg-slate-100 text-slate-600"}`}>
                    {kitchenLabel(detailOrder)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailClosed(true)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close order details"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="font-bold text-slate-800">{detailOrder.customerName || "Guest"}</p>
                <p className="text-xs text-slate-500">
                  {orderPlaceLabel(detailOrder)} · {orderTypeLabel(detailOrder)}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                  Items ({activeOrderItems(detailOrder).length})
                </p>
                {activeOrderItems(detailOrder).map((item, index) => (
                  <div key={item._id || index} className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800">{item.name}</p>
                      <p className="text-slate-400">₹{item.price} · {item.itemReadyStatus || "PREPARING"}</p>
                    </div>
                    <span className="font-bold text-slate-700">{item.quantity}</span>
                    {detailOrder.status === "ACCEPTED" && item._id && item.itemReadyStatus !== "SERVED" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleItemReadyStatus(
                            detailOrder._id,
                            item._id,
                            item.itemReadyStatus === "READY" ? "SERVED" : "READY",
                          )
                        }
                        className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700"
                      >
                        {item.itemReadyStatus === "READY" ? "Served" : "Ready"}
                      </button>
                    )}
                    {item._id && detailOrder.status !== "COMPLETED" && detailOrder.status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleCancelItem(detailOrder._id, item._id)}
                        className="text-[10px] font-bold text-rose-500"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Item Total</span>
                  <span>₹{Number(detailOrder.subtotal || detailOrder.total || 0).toLocaleString("en-IN")}</span>
                </div>
                {Number(detailOrder.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-₹{Number(detailOrder.discount).toLocaleString("en-IN")}</span>
                  </div>
                )}
                {Number(detailOrder.tax) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Tax</span>
                    <span>₹{Number(detailOrder.tax).toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-black text-rose-500">
                  <span>Grand Total</span>
                  <span>₹{Number(detailOrder.total || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {detailOrder.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => handleStatusClick(detailOrder._id, "ACCEPTED")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white"
                  >
                    <Check size={16} /> Accept Order
                  </button>
                )}
                {detailOrder.status === "ACCEPTED" && detailOrder.tableNumber !== "N/A" && (
                  <button
                    type="button"
                    disabled={activeOrderItems(detailOrder).some((item) => item.itemReadyStatus !== "SERVED")}
                    onClick={() => handleBillAndWhatsApp(detailOrder)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <IndianRupee size={16} /> Generate Bill
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleView(detailOrder)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700"
                  >
                    <Printer size={14} /> Print KOT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleView(detailOrder)}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700"
                  >
                    <Eye size={14} /> Full Details
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">Table Live Status</p>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Free</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Occupied</span>
            </div>
          </div>
          <TableStatusStrip tables={tableStatus} isLoading={isLoadingTableStatus} />
        </div>

        {rejectModalOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <X size={22} strokeWidth={2.5} />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  Select Rejection Reason
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Please choose a reason why this order is being rejected:
                </p>
              </div>

              <select
                value={rejectReasonDropdown}
                onChange={(e) => setRejectReasonDropdown(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 cursor-pointer"
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-200 transition"
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
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-rose-700 transition shadow-lg shadow-rose-600/20"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            kotItems={kotItems}
            cancelledItems={cancelledKotItems}
            kotType={kotType}
            onPrintKOT={printKOT}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </>
  );
}
