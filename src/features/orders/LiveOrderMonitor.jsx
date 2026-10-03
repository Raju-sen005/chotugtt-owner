import { useEffect, useState, useCallback, memo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
// import QRCode from "qrcode";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { getBillReceiptCSS } from "../../constants/billReceiptStyles";
// import { useNotificationSound } from "../../hooks/useNotificationSound";
import {
  Eye,
  Check,
  X,
  Users,
  Radio,
  ArrowLeft,
  ArrowRight,
  // Receipt,
  IndianRupee,
  Loader2,
} from "lucide-react";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import {
  getSelectedBillTemplate,
  saveSelectedBillTemplate,
} from "../../constants/billTemplates";
import {
  prepareImageForThermal,
  generateThermalQr,
} from "../../utils/thermalImage";
import { printThermalHtml } from "../../utils/thermalPrint";

// Shared status → badge style map (used by both the desktop row and mobile card
// so ACCEPTED / COMPLETED / REJECTED are visually distinct at a glance)
const STATUS_BADGE_STYLES = {
  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-200",
};

const OrderRow = memo(function OrderRow({
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
    <tr className="hover:bg-slate-50/80 transition-all duration-150">
      <td className="px-6 py-4 font-mono font-bold text-rose-600 text-xs sm:text-sm whitespace-nowrap">
        {order.orderId}
      </td>
      <td className="px-6 py-4 font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          {order.tableNumber}
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
          {(showAllItems ? order.items : order.items.slice(0, 1)).map(
            (item, index) => (
              <div
                key={
                  item?._id
                    ? String(item._id)
                    : `${order?._id || order?.orderId || "order"}:item:${index}`
                }
                className="flex items-center gap-1.5 group"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`truncate ${
                      item.status === "REJECTED"
                        ? "line-through text-rose-400 text-[11px] opacity-50"
                        : ""
                    }`}
                  >
                    • {item.quantity}x {item.name}
                  </span>

                  {item.status !== "REJECTED" && (
                    <span
                      className={`shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${
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
                      title={
                        item.itemReadyStatus === "PREPARING"
                          ? "Mark item READY"
                          : item.itemReadyStatus === "READY"
                            ? "Mark item SERVED"
                            : "Item already SERVED"
                      }
                      disabled={item.itemReadyStatus === "SERVED"}
                      className={`shrink-0 inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg border transition ${
                        item.itemReadyStatus === "SERVED"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 cursor-default"
                          : item.itemReadyStatus === "READY"
                            ? "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 cursor-pointer"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer"
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
                      title="Cancel this item"
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition"
                    >
                      Cancel
                    </button>
                  )}
              </div>
            ),
          )}
          {order.items.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllItems((prev) => !prev)}
              className="mt-1 text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              {showAllItems
                ? "Show less"
                : `Show ${order.items.length - 1} more`}
            </button>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-right font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap font-mono">
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
            <span
              className={`text-[10px] font-black uppercase tracking-wider border px-3 py-1.5 rounded-xl ${
                STATUS_BADGE_STYLES[order.status] ||
                "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {order.status}
            </span>
          )}

          {/* Generate Bill & Clear Table Button */}
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

// Mobile-only card presentation of the exact same order data + handlers as
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
    async ({ order, items, kotType = "NEW" }) => {
      if (!order?._id) {
        showError("Invalid order.");
        return;
      }

      if (!Array.isArray(items) || !items.length) {
        showError("No new items available for KOT.");
        return;
      }

      const normalizedKotType = kotType === "RUNNING" ? "RUNNING" : "NEW";

      const activeItems = items.filter(
        (item) => item && item.status !== "REJECTED",
      );

      if (!activeItems.length) {
        showError("No active items available for KOT.");
        return;
      }

      const isRunningOrder = normalizedKotType === "RUNNING";

      const kotTitle = isRunningOrder ? "RUNNING ORDER KOT" : "NEW ORDER KOT";

      const kotSubtitle = isRunningOrder ? "ADDITIONAL ITEMS" : "NEW ORDER";

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
          },
          {
            withCredentials: true,
          },
        );

        const printedIds = new Set(activeItems.map((item) => String(item._id)));

        setKotItems((currentItems) =>
          currentItems.filter((item) => !printedIds.has(String(item._id))),
        );
        queryClient.invalidateQueries({
          queryKey: ["live-orders", restaurantId],
        });

        showSuccess(
          isRunningOrder
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
  const itemsPerPage = 5;

  const indexOfLastOrder = currentPage * itemsPerPage;
  const indexOfFirstOrder = indexOfLastOrder - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

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

    // ==========================================
    // NEW ORDER
    // ==========================================
    const handleNewOrder = (newOrder) => {
      console.log("🆕 NEW_ORDER_RECEIVED:", newOrder?.orderId);

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
      console.log(
        "🔄 ORDER_STATUS_UPDATED:",
        updatedOrder?.orderId,
        updatedOrder?.status,
      );

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
      console.log("🔥 RUNNING_ORDER_UPDATED:", payload);

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

      showSuccess("Item Cancelled Successfully");
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
    async (order) => {
      // 🔑 FIX: cancelled/rejected items bill par
      const items = (order.items || []).filter((i) => i.status !== "REJECTED");

      const subtotal =
        order.subtotal ??
        items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
      const discount = order.discount || 0;
      const taxRate = Number(order.taxRate || 0);
      const grandTotal = order.total ?? subtotal - discount + taxRate;
      const roundOff = grandTotal - (subtotal - discount + taxRate);
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

      const tableLabel = order.mergedTables?.length
        ? `${order.tableNumber}, ${order.mergedTables.join(", ")}`
        : order.tableNumber;

      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;
      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const cashierName =
        user?.name || user?.username || user?.email || "Staff";

      // 🔑 image ko absolute URL (relative path ho to base attach karo)
      // =========================================================
      // BILL QR LOGIC
      // =========================================================
      // UPI      -> UPI QR
      // CASH     -> Google Review QR
      // DUE      -> Google Review QR
      // SPLIT    -> based on splitPaymentMethod
      // =========================================================

      const isSplit = order.paymentMethod === "SPLIT" || order.isSplitBill;

      const isMixed = order.paymentMethod === "MIXED";

      const effectivePaymentMethod = isMixed
        ? "UPI"
        : isSplit
          ? order.splitPaymentMethod
          : order.paymentMethod;

      const mixedUpiAmount = isMixed
        ? Number(
            order.payments?.find((payment) => payment.method === "UPI")
              ?.amount || 0,
          )
        : 0;
      // Never let an image failure block printing — just skip that image.
      const safe = async (fn) => {
        try {
          return await fn();
        } catch (e) {
          console.warn("Thermal image prep failed:", e);
          return null;
        }
      };

      const buildQr = async () => {
        if (effectivePaymentMethod === "UPI") {
          // Split bill: QR amount must be what is being collected NOW, not the full total
          const payable = isSplit
            ? Number(order.paidAmount || 0)
            : isMixed
              ? mixedUpiAmount
              : Number(grandTotal);

          if (storeDetails.upiId && payable > 0) {
            const upiString =
              `upi://pay?pa=${encodeURIComponent(String(storeDetails.upiId).trim())}` +
              `&pn=${encodeURIComponent(String(storeDetails.name || "Restaurant").trim())}` +
              `&am=${payable.toFixed(2)}` +
              `&cu=INR` +
              `&tn=${encodeURIComponent(`Bill ${order.orderId || ""}`.trim())}`;

            const generated = await safe(async () => ({
              ...generateThermalQr(upiString, { targetMm: 42, ecl: "M" }),
              type: "UPI",
            }));
            if (generated) return generated;
          }

          if (storeDetails.upiQrCode) {
            return safe(async () => ({
              ...(await prepareImageForThermal(storeDetails.upiQrCode, {
                mode: "qr",
                widthMm: 42,
              })),
              type: "UPI",
            }));
          }
          return null;
        }

        if (storeDetails.googleReviewQrCode) {
          return safe(async () => ({
            ...(await prepareImageForThermal(storeDetails.googleReviewQrCode, {
              mode: "qr",
              widthMm: 28,
            })),
            type: "GOOGLE_REVIEW",
          }));
        }
        return null;
      };

      const buildLogo = async () => {
        if (!storeDetails.logo || selectedBillTemplate === "minimal")
          return null;
        return safe(() =>
          prepareImageForThermal(storeDetails.logo, {
            mode: "logo",
            widthMm: 20,
          }),
        );
      };

      const [qr, logo] = await Promise.all([buildQr(), buildLogo()]);
      const billQrType = qr?.type || "";

      const itemRows = items
        .map(
          (i) => `
    <tr>
      <td class="col-item">${escapeHtml(i.name)}</td>
      <td class="col-qty">${escapeHtml(i.quantity)}</td>
      <td class="col-price">${(i.price || 0).toFixed(2)}</td>
      <td class="col-amount">${((i.price || 0) * (i.quantity || 0)).toFixed(2)}</td>
    </tr>`,
        )
        .join("");

      const windowContent = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Bill - Table ${escapeHtml(tableLabel)}</title>
      <style>${getBillReceiptCSS()}</style>
    </head>
    <body>
      <div class="receipt template-${escapeHtml(selectedBillTemplate)}">
        <div class="center">

   ${
     logo
       ? `<img class="shop-logo thermal-img" src="${logo.src}" alt="Logo"
           style="width:${logo.widthMm}mm !important;height:auto !important;" />`
       : ""
   }

  <p class="shop-name">
    ${escapeHtml(storeDetails.name || "OUR RESTAURANT")}
  </p>

  ${
    storeDetails.address
      ? `<p class="shop-line">
           ${escapeHtml(storeDetails.address)}
         </p>`
      : ""
  }

  ${
    storeDetails.contact
      ? `<p class="shop-line">
           Contact: ${escapeHtml(storeDetails.contact)}
         </p>`
      : ""
  }

  ${
    storeDetails.fssaiNumber
      ? `<p class="shop-line">
           FSSAI: ${escapeHtml(storeDetails.fssaiNumber)}
         </p>`
      : ""
  }

  ${
    storeDetails.gstin
      ? `<p class="shop-line">
           GSTIN: ${escapeHtml(storeDetails.gstin)}
         </p>`
      : ""
  }

</div>

        <div class="divider-solid"></div>

        <div class="row">
          <span>Date: ${dateStr}<br/>Time: ${timeStr}</span>
          <span>Dine In: ${escapeHtml(tableLabel)}</span>
        </div>
        <div class="row">
          <span>Cashier:<br/>${escapeHtml(cashierName)}</span>
          <span>Bill No.:<br/>${escapeHtml(order.orderId)}</span>
        </div>
        <p class="row"><span>Name:</span><span>${escapeHtml(order.customerName || "Guest")}</span></p>

        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <td class="col-item">Item</td>
              <td class="col-qty">Qty.</td>
              <td class="col-price">Price</td>
              <td class="col-amount">Amount</td>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="divider"></div>

<div class="totals-row">
  <span>Total Qty: ${totalQty}</span>
  <span>Sub Total ₹${subtotal.toFixed(2)}</span>
</div>

${
  discount
    ? `<div class="totals-row">
       <span>Discount</span>
       <span>-₹${discount.toFixed(2)}</span>
     </div>`
    : ""
}

${
  taxRate
    ? `<div class="totals-row">
       <span>Tax${taxRate ? ` @ ${taxRate.toFixed(2)}%` : ""}</span>
       <span>₹${taxRate.toFixed(2)}</span>
     </div>`
    : ""
}

${
  roundOff
    ? `<div class="totals-row">
       <span>Round off</span>
       <span>${roundOff.toFixed(2)}</span>
     </div>`
    : ""
}

<div class="row grand-total">
  <span>Grand Total</span>
  <span>₹${grandTotal.toFixed(2)}</span>
</div>
        <div class="payment-row">
          <span>Payment Mode</span>
          <span>${escapeHtml(order.paymentMethod || "N/A")}</span>
        </div>

      ${
        order.paymentMethod === "MIXED"
          ? `
      <div class="payment-paid">
        <span>Cash</span>
        <span>₹${Number(
          order.payments?.find((p) => p.method === "CASH")?.amount || 0,
        ).toFixed(2)}</span>
      </div>

      <div class="payment-paid">
        <span>UPI</span>
        <span>₹${Number(
          order.payments?.find((p) => p.method === "UPI")?.amount || 0,
        ).toFixed(2)}</span>
      </div>

      <div class="payment-paid">
        <span>Total Paid</span>
        <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
      </div>
    `
          : order.isSplitBill
            ? `
        <div class="payment-paid">
          <span>Paid Now (${escapeHtml(order.splitPaymentMethod || "")})</span>
          <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
        </div>

        <div class="payment-due">
          <span>Remaining Due</span>
          <span>₹${Number(order.dueAmount || 0).toFixed(2)}</span>
        </div>
      `
            : order.paymentMethod === "DUE"
              ? `
          <div class="payment-due">
            <span>Amount Due</span>
            <span>₹${Number(order.dueAmount || 0).toFixed(2)}</span>
          </div>
        `
              : `
          <div class="payment-paid">
            <span>Amount Paid</span>
            <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
          </div>
        `
      }
      ${
        qr
          ? `<div class="upi-block">
        <div class="divider"></div>
        <p class="scan-label">
          ${billQrType === "UPI" ? "Scan &amp; Pay" : "Scan &amp; Review Us"}
        </p>

        <img class="thermal-img" src="${qr.src}" alt="QR"
             style="width:${qr.widthMm}mm !important;height:auto !important;" />

        ${
          billQrType === "UPI" && storeDetails.upiId
            ? `<p class="upi-id">
                 ${escapeHtml(storeDetails.upiId)}
               </p>`
            : ""
        }

        ${
          billQrType === "GOOGLE_REVIEW"
            ? `<p class="upi-id">
                 We'd love your feedback ❤️
               </p>`
            : ""
        }
      </div>`
          : ""
      }

        <div class="footer-line">Thank you for visiting!<br/>Visit again 🙏</div>

        <div class="powered-by">Powered by <b>ChotuGTT</b></div>
      </div>
    </body>
  </html>`;

      try {
        await printThermalHtml(windowContent);
      } catch (error) {
        console.error("Bill print failed:", error);
        showError?.("Bill could not be printed. Check the printer and try again.");
      }
    },
    [storeDetails, user, apiBase, showError, selectedBillTemplate],
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
        setKotType(type);
      } catch (error) {
        console.error("Failed to fetch KOT items:", error);

        setSelectedOrder(order);
        setKotItems([]);
        setKotType("NEW");

        showError(error.response?.data?.message || "Failed to load KOT items.");
      }
    },
    [apiBase, showError],
  );
  const handleCloseModal = useCallback(() => {
    setSelectedOrder(null);
    setKotItems([]);
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
          <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-3 min-w-[320px] max-w-[400px]">
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
          <div className="bg-white border border-slate-200 border-l-4 border-l-rose-500 shadow-2xl rounded-2xl px-5 py-4 flex items-start gap-3 min-w-[320px] max-w-[400px]">
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 font-sans bg-[#F8F9FA] min-h-screen">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Live Kitchen Monitor
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage incoming orders, table occupancy statuses, and kitchen
              execution queue.
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {orders.length > 0 && (
              <span className="text-[11px] font-black tracking-wider uppercase text-slate-500 bg-slate-100 px-3 py-2 rounded-2xl font-mono">
                {orders.length} live
              </span>
            )}
            <div className="flex items-center gap-2.5 bg-rose-50/80 border border-rose-100 px-4 py-2 rounded-2xl shadow-2xs">
              <Radio size={16} className="text-rose-600 animate-pulse" />
              <span className="text-[11px] font-black tracking-wider uppercase text-rose-600">
                Stream Active
              </span>
            </div>
          </div>
        </div>

        {/* Table Occupancy Strip */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Table Live Status Grid
            </p>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Occupied
              </span>
            </div>
          </div>
          <TableStatusStrip
            tables={tableStatus}
            isLoading={isLoadingTableStatus}
          />
        </div>

        {/* Orders Section */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 mb-1">
              <Radio size={24} />
            </div>
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
            {/* Mobile / tablet: card list — tables don't work well on small touch screens */}
            <div className="lg:hidden p-4 sm:p-5 space-y-3">
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

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 whitespace-nowrap">Order ID</th>
                    <th className="px-6 py-4 whitespace-nowrap">Table</th>
                    <th className="px-6 py-4 whitespace-nowrap">Customer</th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Items Summary
                    </th>
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

            {/* Pagination Footer inside card container */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center px-4 sm:px-6 py-4 bg-slate-50/50 border-t border-slate-100">
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
            kotType={kotType}
            onPrintKOT={printKOT}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </>
  );
}
