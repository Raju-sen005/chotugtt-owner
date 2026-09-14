import { useEffect, useState, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import QRCode from "qrcode";
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
  // Receipt,
  IndianRupee,
  Loader2,
} from "lucide-react";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import { getSelectedBillTemplate } from "../../constants/billTemplates";

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
}) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;
  const [showAllItems, setShowAllItems] = useState(false);
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
            (item) => (
              <div key={item._id} className="flex items-center gap-1.5 group">
                <span
                  className={`truncate ${
                    item.status === "REJECTED"
                      ? "line-through text-rose-400 text-[11px] opacity-50"
                      : ""
                  }`}
                >
                  • {item.quantity}x {item.name}
                </span>
                {item.status !== "REJECTED" &&
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
              onClick={() => onClear(order)}
              className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition shadow-2xs cursor-pointer"
              title="Generate Bill & Clear Table"
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
}) {
  const hasMergedTables = order.mergedTables && order.mergedTables.length > 0;
  const [showAllItems, setShowAllItems] = useState(false);

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
            (item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-2"
              >
                <span
                  className={`truncate ${
                    item.status === "REJECTED"
                      ? "line-through text-rose-400 opacity-50"
                      : ""
                  }`}
                >
                  • {item.quantity}x {item.name}
                </span>
                {item.status !== "REJECTED" &&
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
              onClick={() => onClear(order)}
              className="p-2 bg-slate-900 text-white rounded-xl active:bg-slate-800 transition"
              title="Generate Bill & Clear Table"
            >
              <IndianRupee size={16} strokeWidth={2.5} />
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
  const [rejectReasonDropdown, setRejectReasonDropdown] =
    useState("Item Out of Stock");
  const [selectedBillTemplate, setSelectedBillTemplate] = useState(() =>
    getSelectedBillTemplate(restaurantId),
  );

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
  });

  const printKOT = useCallback(
    async ({ order, items }) => {
      if (!order || !items?.length) {
        showError("No new items available for KOT.");
        return;
      }

      const activeItems = items.filter((item) => item.status !== "REJECTED");

      if (!activeItems.length) {
        showError("No active items available for KOT.");
        return;
      }

      const kotRows = order.items
        .map((item) => {
          return `
    <tr>
      <td class="item-col">
        <div class="item-name">
          ${escapeHtml(item.name)}
        </div>

        ${
          item.variant
            ? `<div class="item-meta">Variant: ${escapeHtml(item.variant)}</div>`
            : ""
        }

        ${
          item.notes
            ? `<div class="item-meta">Note: ${escapeHtml(item.notes)}</div>`
            : ""
        }
      </td>

      <td class="qty-col">
        ${escapeHtml(item.quantity)}
      </td>
    </tr>
  `;
        })
        .join("");

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

      const windowContent = `
<html>
  <head>
    <title>KOT ${escapeHtml(order.orderId)}</title>

    <style>
      @media print {
        @page {
          margin: 0;
          size: 80mm auto;
        }

        html,
        body {
          width: 80mm;
          margin: 0;
          padding: 0;
        }
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #fff;
      }

      body {
        font-family: "Courier New", Courier, monospace;
        color: #111;
        font-size: 12px;
        font-weight: 600;
      }

      .kot {
        width: 80mm;
        max-width: 80mm;
        padding: 14px 10px 16px;
      }

      .center {
        text-align: center;
      }

      .title {
        font-size: 17px;
        font-weight: 900;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }

      .order-id {
        font-size: 15px;
        font-weight: 900;
        margin-bottom: 6px;
      }

      .order-type {
        display: inline-block;
        border: 1.5px solid #111;
        padding: 3px 10px;
        font-size: 11px;
        font-weight: 900;
        margin-bottom: 8px;
        letter-spacing: 0.4px;
        border-radius: 3px;
      }

      .meta {
        font-size: 11px;
        line-height: 1.6;
        text-align: left;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      .meta-label {
        font-weight: 700;
        color: #444;
      }

      .meta-value {
        font-weight: 900;
        text-align: right;
      }

      .divider {
        border-top: 1.5px dashed #111;
        margin: 10px 0;
      }

      .section-title {
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th {
        font-size: 11px;
        font-weight: 900;
        padding: 5px 0 6px;
        border-bottom: 1.5px solid #111;
        text-transform: uppercase;
      }

      td {
        padding: 7px 0;
        vertical-align: top;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }

      .item-col {
        width: 76%;
        padding-right: 6px;
        text-align: left;
      }

      .qty-col {
        width: 24%;
        text-align: right;
        font-size: 14px;
        font-weight: 900;
      }

      .item-name {
        font-weight: 900;
      }

      .item-meta {
        font-size: 10px;
        font-weight: 600;
        margin-top: 2px;
        line-height: 1.3;
        color: #333;
      }

      .notes {
        border: 1.5px solid #111;
        padding: 8px;
        margin-top: 5px;
        border-radius: 3px;
      }

      .notes-title {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 4px;
        letter-spacing: 0.3px;
      }

      .note {
        font-size: 11px;
        font-weight: 700;
        line-height: 1.45;
      }

      .footer {
        text-align: center;
        margin-top: 12px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.6px;
      }

      .powered-by {
        text-align: center;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed #999;
        font-size: 8.5px;
        font-weight: 600;
        color: #999;
        letter-spacing: 0.3px;
      }

      .powered-by b {
        font-weight: 900;
        color: #555;
      }
    </style>
  </head>

  <body>
    <div class="kot">

      <!-- HEADER -->
      <div class="center">
        <div class="title">
          KITCHEN ORDER TICKET
        </div>

        <div class="order-id">
          ${escapeHtml(order.orderId)}
        </div>

        <div class="order-type">
          ${escapeHtml(order.orderType || "DINE IN")}
        </div>
      </div>

      <div class="divider"></div>

      <!-- ORDER INFORMATION -->
      <div class="meta">

        <div class="meta-row">
          <span class="meta-label">TABLE</span>
          <span class="meta-value">${escapeHtml(tableLabel)}</span>
        </div>

        <div class="meta-row">
          <span class="meta-label">CUSTOMER</span>
          <span class="meta-value">
            ${escapeHtml(order.customerName || "Guest")}
          </span>
        </div>

        <div class="meta-row">
          <span class="meta-label">DATE</span>
          <span class="meta-value">${dateStr}</span>
        </div>

        <div class="meta-row">
          <span class="meta-label">TIME</span>
          <span class="meta-value">${timeStr}</span>
        </div>

      </div>

      <div class="divider"></div>

      <!-- ITEMS -->
      <div class="section-title">
        Order Items
      </div>

      <table>
        <thead>
          <tr>
            <th class="item-col">
              ITEM
            </th>

            <th class="qty-col">
              QTY
            </th>
          </tr>
        </thead>

        <tbody>
          ${kotRows}
        </tbody>
      </table>

      <div class="divider"></div>

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

            <div class="divider"></div>
          `
          : ""
      }

      <!-- FOOTER -->
      <div class="footer">
        KITCHEN COPY
      </div>

      <div class="powered-by">
        Powered by <b>ChotuGTT</b>
      </div>

    </div>

    <script>
      window.focus();

      window.addEventListener("load", () => {
        setTimeout(() => {
          window.print();
        }, 150);
      });

      window.onafterprint = () => {
        window.close();
      };
    </script>
  </body>
</html>
`;

      const printWindow = window.open("", "_blank", "width=380,height=680");

      if (!printWindow) {
        showError(
          "Print window was blocked. Please allow popups for this site.",
        );
        return;
      }

      printWindow.document.open();
      printWindow.document.write(windowContent);
      printWindow.document.close();

      // 🆕 Mark ONLY these newly printed items
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

        queryClient.invalidateQueries({
          queryKey: ["live-orders", restaurantId],
        });

        showSuccess("KOT Printed Successfully");
      } catch (error) {
        console.error("Failed to mark KOT printed:", error);

        showError(
          error.response?.data?.message ||
            "KOT printed, but tracking update failed.",
        );
      }
    },
    [apiBase, queryClient, showError, showSuccess],
  );

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
    if (!socket) return;

    const handleNewOrder = (newOrder) => {
      // try {
      //   playAlert();
      // } catch (e) {
      //   console.log("Audio play error:", e);
      // }

      queryClient.setQueryData(["live-orders", restaurantId], (old = []) => {
        const exists = old.some((o) => o._id === newOrder._id);

        if (exists) {
          return old.map((o) => (o._id === newOrder._id ? newOrder : o));
        }

        return [newOrder, ...old];
      });
      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
      setCurrentPage(1);
    };

    const handleOrderUpdated = (updatedOrder) => {
      queryClient.setQueryData(["live-orders", restaurantId], (old = []) => {
        if (
          updatedOrder.status === "COMPLETED" ||
          updatedOrder.status === "REJECTED"
        ) {
          return old.filter((o) => o._id !== updatedOrder._id);
        }

        const exists = old.some((o) => o._id === updatedOrder._id);

        if (!exists) {
          return [updatedOrder, ...old];
        }

        return old.map((o) => (o._id === updatedOrder._id ? updatedOrder : o));
      });
      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
    };

    // const handlePlaySoundOnly = () => {
    //   try {
    //     playAlert();
    //   } catch (e) {
    //     console.log("Audio play error:", e);
    //   }
    // };

    socket.on("NEW_ORDER_RECEIVED", handleNewOrder);
    socket.on("ORDER_STATUS_UPDATED", handleOrderUpdated);
    // socket.on("PLAY_NOTIFICATION_SOUND", handlePlaySoundOnly);

    return () => {
      socket.off("NEW_ORDER_RECEIVED", handleNewOrder);
      socket.off("ORDER_STATUS_UPDATED", handleOrderUpdated);
      // socket.off("PLAY_NOTIFICATION_SOUND", handlePlaySoundOnly);
    };
  }, [socket, queryClient]);

  // 🆕 Cancel a single item — hits the real backend endpoint and refreshes
  // subtotal/tax/total from the response (backend does the recalculation).
  const handleCancelItem = useCallback((orderId, itemId) => {
    setCancelItemData({
      orderId,
      itemId,
    });
  }, []);

  const confirmCancelItem = useCallback(async () => {
    if (!cancelItemData) return;

    const { orderId, itemId } = cancelItemData;

    try {
      const res = await axios.patch(
        `${apiBase}/orders/${orderId}/item/${itemId}/cancel`,
        {},
        { withCredentials: true },
      );

      const updatedOrder = res.data.data;

      queryClient.setQueryData(
        ["live-orders", restaurantId],
        (oldOrders = []) =>
          oldOrders.map((order) =>
            order._id === orderId ? updatedOrder : order,
          ),
      );

      setCancelItemData(null);

      showSuccess("Item Cancelled Successfully");
    } catch (err) {
      console.error("Failed to cancel item", err);

      setCancelItemData(null);

      showError(err.response?.data?.message || "Failed to cancel item");
    }
  }, [cancelItemData, apiBase, queryClient, showSuccess, showError]);

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
          // 🧾 First order ka automatic KOT
          await printKOT({
            order: updatedOrderFromBackend,
            items: newKotItems,
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
    [queryClient, apiBase, showSuccess, showError, printKOT],
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
      const upiQrUrl = await (async () => {
        if (!storeDetails.upiId || Number(grandTotal) <= 0) {
          return "";
        }

        const amount = Number(grandTotal).toFixed(2);

        const upiString =
          `upi://pay?pa=${encodeURIComponent(storeDetails.upiId)}` +
          `&pn=${encodeURIComponent(storeDetails.name || "Restaurant")}` +
          `&am=${amount}` +
          `&cu=INR`;

        try {
          return await QRCode.toDataURL(upiString, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 300,
          });
        } catch (error) {
          console.error("Failed to generate bill UPI QR:", error);
          return "";
        }
      })();

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

      const windowContent = `
  <html>
    <head>
      <title>Bill - Table ${escapeHtml(tableLabel)}</title>
      <style>
        @media print {
          @page { margin: 0; }
        }
        * { box-sizing: border-box; }
        body {
          font-family: 'Courier New', ui-monospace, monospace;
          margin: 0; padding: 0;
          display: flex; justify-content: center;
          background: #fff;
        }
        .receipt {
          width: 300px;
          padding: 20px 16px 16px;
          color: #111;
        }
        .center { text-align: center; }
        .shop-logo {
  width: 55px;
  height: 55px;
  object-fit: contain;
  display: block;
  margin: 0 auto 6px;
}

.shop-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.3px;
  margin: 0 0 4px 0;
}

.shop-line {
  font-size: 11px;
  line-height: 1.45;
  margin: 0;
  color: #333;
}
        .shop-name { font-size: 17px; font-weight: 700; letter-spacing: 0.3px; margin: 0 0 4px 0; }
        .shop-line { font-size: 11px; line-height: 1.45; margin: 0; color: #333; }
        .divider { border-top: 1px dashed #444; margin: 11px 0; }
        .divider-solid { border-top: 2px solid #111; margin: 12px 0 10px; }
        .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; gap: 10px; }
        .row span { line-height: 1.4; }
        .row b { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
        thead td { font-weight: 700; font-size: 10.5px; padding-bottom: 6px; border-bottom: 1.5px solid #111; text-transform: uppercase; letter-spacing: 0.3px; }
        td { padding: 5px 0; vertical-align: top; }
        .col-item { width: 46%; }
        .col-qty { width: 14%; text-align: center; }
        .col-price { width: 20%; text-align: right; }
        .col-amount { width: 20%; text-align: right; font-weight: 600; }
        .totals-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
        .grand-total { font-size: 16px; font-weight: 700; border-top: 1.5px dashed #444; padding-top: 9px; margin-top: 9px; }
        .payment-row {
          display: flex;
          justify-content: space-between;
          font-size: 11.5px;
          font-weight: 600;
          color: #555;
          margin-top: 10px;
        }
        .payment-paid {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          margin-top: 4px;
        }
        .payment-due {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 700;
          color: #b45309;
          margin-top: 4px;
        }
        .upi-block { text-align: center; margin-top: 14px; }
        .upi-block img { width: 118px; height: 118px; object-fit: contain; }
        .upi-id { font-size: 11px; font-weight: 700; margin-top: 7px; letter-spacing: 0.2px; }
        .scan-label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 8px; color: #333; text-transform: uppercase; }
        .footer-line { font-size: 10.5px; text-align: center; margin-top: 16px; line-height: 1.6; color: #555; }
        .powered-by {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px dashed #ccc;
          text-align: center;
          font-size: 9px;
          font-weight: 600;
          color: #aaa;
          letter-spacing: 0.4px;
        }
        .powered-by b { color: #666; font-weight: 800; letter-spacing: 0.2px; }
        .template-minimal { font-family: Arial, sans-serif; }
        .receipt.template-minimal { padding: 12px 10px 10px; }
        .receipt.template-minimal .shop-name { font-size: 15px; text-transform: uppercase; }
        .receipt.template-minimal .shop-logo { display: none; }
        .receipt.template-minimal .divider-solid { border-top-width: 1px; margin: 8px 0; }
        .template-elegant { font-family: Georgia, serif; }
        .receipt.template-elegant { width: 340px; padding: 24px 20px 18px; }
        .receipt.template-elegant .shop-name { font-size: 20px; letter-spacing: 1px; }
        .receipt.template-elegant .shop-line { font-family: Arial, sans-serif; }
        .receipt.template-elegant .divider-solid { border-top: 1px solid #a16207; }
        .receipt.template-elegant .grand-total { border-top-color: #a16207; font-size: 18px; }
        .template-bold { font-family: Arial, sans-serif; }
        .receipt.template-bold { width: 360px; padding: 18px 18px 16px; }
        .receipt.template-bold .shop-name { font-size: 18px; text-transform: uppercase; }
        .receipt.template-bold .divider-solid { border-top: 4px solid #111; margin: 10px 0; }
        .receipt.template-bold .grand-total { background: #111; color: #fff; padding: 10px 8px; border-top: 0; }
        .receipt.template-terracotta { width: 340px; padding: 24px 20px 18px; font-family: Georgia, serif; color: #3f2923; }
        .receipt.template-terracotta .shop-name { color: #a3482b; font-size: 20px; letter-spacing: 1px; }
        .receipt.template-terracotta .divider-solid { border-top: 1px solid #a3482b; }
        .receipt.template-terracotta .grand-total { border-top-color: #a3482b; color: #a3482b; font-size: 18px; }
        .receipt.template-ledger { width: 360px; padding: 18px; font-family: Arial, sans-serif; }
        .receipt.template-ledger .shop-name { font-size: 18px; text-transform: uppercase; }
        .receipt.template-ledger .divider-solid { border-top: 4px solid #1e293b; }
        .receipt.template-ledger thead td { background: #1e293b; color: #fff; padding: 6px 4px; }
        .receipt.template-ledger .grand-total { border-top: 2px solid #1e293b; font-size: 17px; }
        .receipt {
          background: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .receipt.template-classic {
          background: linear-gradient(180deg, #fff 0%, #fffdf9 100%);
          border-top: 7px solid #111;
        }
        .receipt.template-classic .shop-name { letter-spacing: 1px; }
        .receipt.template-minimal {
          background-color: #fff;
          background-image: linear-gradient(#f1f5f9 1px, transparent 1px);
          background-size: 100% 22px;
          border: 1px solid #cbd5e1;
        }
        .receipt.template-elegant {
          background: #fffcf5;
          border: 1px solid #e7d7b0;
          box-shadow: inset 0 0 0 5px #fff8e7;
        }
        .receipt.template-elegant .shop-logo { border: 1px solid #b8892d; border-radius: 50%; padding: 4px; }
        .receipt.template-bold {
          background: #f8fafc;
          border-top: 18px solid #111827;
          border-bottom: 5px solid #111827;
        }
        .receipt.template-bold .shop-name { color: #111827; letter-spacing: 1.2px; }
        .receipt.template-terracotta {
          background: #fff7ed;
          border: 1px solid #e7a98d;
          box-shadow: inset 0 0 0 5px #fff1e6;
        }
        .receipt.template-terracotta .divider { border-top-color: #d98968; }
        .receipt.template-terracotta .shop-line { color: #70483c; }
        .receipt.template-ledger {
          background: #f8fafc;
          border: 1px solid #94a3b8;
          border-top: 14px solid #1e293b;
        }
        .receipt.template-ledger .shop-line { color: #475569; }
        .receipt.template-ledger .divider { border-top-color: #94a3b8; }
        .receipt.template-midnight { width: 360px; background: #111827; color: #f8fafc; border-top: 12px solid #38bdf8; font-family: Arial, sans-serif; }
        .receipt.template-midnight .shop-name, .receipt.template-midnight .grand-total { color: #7dd3fc; }
        .receipt.template-midnight .shop-line, .receipt.template-midnight .payment-row, .receipt.template-midnight .footer-line { color: #cbd5e1; }
        .receipt.template-midnight .divider, .receipt.template-midnight .divider-solid, .receipt.template-midnight .grand-total { border-color: #475569; }
        .receipt.template-saffron { width: 340px; background: #fffaf0; color: #422006; border: 2px solid #f59e0b; font-family: Georgia, serif; }
        .receipt.template-saffron .shop-name { color: #b45309; font-size: 20px; }
        .receipt.template-saffron .divider-solid { border-color: #f59e0b; }
        .receipt.template-coastal { width: 340px; background: #f0fdfa; color: #134e4a; border-top: 10px solid #0f766e; font-family: Arial, sans-serif; }
        .receipt.template-coastal .shop-name { color: #0f766e; }
        .receipt.template-coastal .divider { border-color: #5eead4; }
        .receipt.template-botanical { width: 340px; background: #f3f7f0; color: #263b2a; border: 1px solid #9caf88; font-family: Georgia, serif; }
        .receipt.template-botanical .shop-name { color: #3f6212; font-size: 20px; }
        .receipt.template-botanical .grand-total { border-color: #84a66d; color: #3f6212; }
        .receipt.template-monogram { width: 360px; background: #18181b; color: #fafafa; border: 3px solid #d4af37; font-family: Georgia, serif; }
        .receipt.template-monogram .shop-name, .receipt.template-monogram .grand-total { color: #f5d76e; }
        .receipt.template-monogram .shop-line, .receipt.template-monogram .payment-row, .receipt.template-monogram .footer-line { color: #d4d4d8; }
        .receipt.template-monogram .divider, .receipt.template-monogram .divider-solid, .receipt.template-monogram .grand-total { border-color: #a38427; }
        .receipt.template-studio { width: 360px; background: #f5f5f4; color: #292524; border: 1px solid #78716c; font-family: Arial, sans-serif; }
        .receipt.template-studio thead td { background: #292524; color: #fff; padding: 6px 4px; }
        .receipt.template-studio .grand-total { background: #d6d3d1; padding: 8px; border: 0; }
        .receipt.template-noir { width: 300px; background: #000; color: #fff; border-top: 8px solid #fff; font-family: 'Courier New', monospace; }
        .receipt.template-noir .shop-name, .receipt.template-noir .grand-total { color: #fff; }
        .receipt.template-noir .shop-line, .receipt.template-noir .payment-row, .receipt.template-noir .footer-line { color: #d4d4d4; }
        .receipt.template-noir .divider, .receipt.template-noir .divider-solid, .receipt.template-noir .grand-total { border-color: #737373; }
        .receipt.template-heritage { width: 340px; background: #f5efe3; color: #3f3125; border: 1px solid #b89b72; font-family: Georgia, serif; }
        .receipt.template-heritage .shop-name { color: #6b4423; font-size: 20px; }
        .receipt.template-heritage .divider, .receipt.template-heritage .divider-solid, .receipt.template-heritage .grand-total { border-color: #9a744c; }
      </style>
    </head>
    <body>
      <div class="receipt template-${escapeHtml(selectedBillTemplate)}">
        <div class="center">

  ${
    storeDetails.logo
      ? `<img
           class="shop-logo"
           src="${escapeHtml(storeDetails.logo)}"
           alt="Restaurant Logo"
         />`
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
          order.isSplitBill
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
          upiQrUrl
            ? `<div class="upi-block">
                <div class="divider"></div>
                <p class="scan-label">Scan &amp; Pay</p>
                <img src="${escapeHtml(upiQrUrl)}" alt="UPI QR" />
                ${storeDetails.upiId ? `<p class="upi-id">${escapeHtml(storeDetails.upiId)}</p>` : ""}
              </div>`
            : ""
        }

        <div class="footer-line">Thank you for visiting!<br/>Visit again 🙏</div>

        <div class="powered-by">Powered by <b>ChotuGTT</b></div>
      </div>
<script>
  window.focus();

  const printWhenReady = async () => {
    const images = Array.from(document.images);

    await Promise.all(
      images.map((img) => {
        if (img.complete) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    window.print();
  };

  window.addEventListener("load", printWhenReady);

  window.onafterprint = () => window.close();
</script>
    </body>
  </html>`;

      const printWindow = window.open("", "_blank", "width=380,height=680");
      if (!printWindow) {
        showError?.(
          "Print window was blocked. Please allow popups for this site.",
        );
        return;
      }
      printWindow.document.open();
      printWindow.document.write(windowContent);
      printWindow.document.close();
    },
    [storeDetails, user, apiBase, showError, selectedBillTemplate],
  );

  // Bill & WhatsApp clear table handler added from TableMonitor
  const handleBillAndWhatsApp = useCallback((order) => {
    setBillOrder(order);
    setSelectedPaymentMethod(null);
    setSplitMode(false); // 🆕
    setSplitCollectMethod("CASH"); // 🆕
    setSplitAmount(""); // 🆕
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
        { withCredentials: true },
      );

      const completedOrder = res.data?.data;

      await printBillReceipt(completedOrder || billOrder);

      queryClient.setQueryData(["live-orders", restaurantId], (prev) =>
        (prev || []).filter((o) => o._id !== billOrder._id),
      );

      queryClient.invalidateQueries({
        queryKey: ["table-status", restaurantId],
      });
      queryClient.invalidateQueries({ queryKey: ["table-monitor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills-prev"] });

      setBillOrder(null);
      setSelectedPaymentMethod(null);
      setSplitMode(false);
      setSplitAmount("");

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

  const confirmGenerateBill = useCallback(async () => {
    if (!billOrder || !selectedPaymentMethod) {
      showError("Please select a payment method.");
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
        },
      );

      const completedOrder = res.data?.data;

      // Print bill with payment information
      await printBillReceipt(completedOrder || billOrder);

      // Remove completed order from live monitor
      queryClient.setQueryData(["live-orders", restaurantId], (prev) =>
        (prev || []).filter((o) => o._id !== billOrder._id),
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

      setBillOrder(null);
      setSelectedPaymentMethod(null);

      showSuccess(
        selectedPaymentMethod === "DUE"
          ? "Bill generated and marked as Due"
          : `Bill generated via ${selectedPaymentMethod}`,
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
  ]);

  const handleView = useCallback(
    async (order) => {
      try {
        const res = await axios.get(`${apiBase}/orders/${order._id}/kot`, {
          withCredentials: true,
        });

        setSelectedOrder(order);
        setKotItems(res.data?.data?.items || []);
      } catch (error) {
        console.error("Failed to fetch KOT items:", error);

        setSelectedOrder(order);
        setKotItems([]);
      }
    },
    [apiBase],
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
                        setSelectedPaymentMethod("CASH");
                        setSplitMode(false);
                      }}
                      className={`
                  p-4 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "CASH"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/30"
                  }
                `}
                    >
                      <div className="text-xl mb-2">💵</div>

                      <p className="text-xs font-black">Cash</p>

                      <p className="text-[9px] mt-1 opacity-70">Paid</p>
                    </button>

                    {/* =================================================
                  UPI
              ================================================== */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentMethod("UPI");
                        setSplitMode(false);
                      }}
                      className={`
                  p-4 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "UPI"
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/30"
                  }
                `}
                    >
                      <div className="text-xl mb-2">🏦</div>

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
                  p-4 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "DUE"
                      ? "border-amber-500 bg-amber-50 text-amber-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/30"
                  }
                `}
                    >
                      <div className="text-xl mb-2">⏳</div>

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
                  p-4 rounded-2xl border-2 transition-all
                  active:scale-[0.98]
                  ${
                    selectedPaymentMethod === "SPLIT"
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50/30"
                  }
                `}
                    >
                      <div className="text-xl mb-2">🔀</div>

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
                        Number(splitAmount) > Number(billOrder.total || 0)
                      : !selectedPaymentMethod || isGeneratingBill
                  }
                  onClick={
                    selectedPaymentMethod === "SPLIT"
                      ? confirmSplitBill
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
            onPrintKOT={printKOT}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </>
  );
}
