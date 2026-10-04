import { useState } from "react";
import {
  X,
  Printer,
  Phone,
  User,
  MapPin,
  AlertCircle,
} from "lucide-react";

export default function OrderDetailsModal({
  order,
  onClose,
  kotItems = [],
  cancelledItems = [],
  onPrintKOT,
  kotType = "NEW",
}) {
  const [showPrintPopup, setShowPrintPopup] = useState(false);

  if (!order) return null;

  // ----------------------------------------------------------
  // 🔒 Normalize KOT type
  // ----------------------------------------------------------
  const normalizedKotType =
    kotType === "REVISED" ? "REVISED" : kotType === "RUNNING" ? "RUNNING" : "NEW";

  const isRunningOrder = normalizedKotType === "RUNNING";
  const isRevisedOrder = normalizedKotType === "REVISED";

  // ----------------------------------------------------------
  // 🧾 Only display active KOT items
  // ----------------------------------------------------------
  const activeKotItems = (kotItems || []).filter(
    (item) => item?.status !== "REJECTED",
  );

  // ----------------------------------------------------------
  // 🧾 Print button
  // ----------------------------------------------------------
  const handlePrint = () => {
    if (!activeKotItems.length) {
      return;
    }

    setShowPrintPopup(true);
  };

  // ----------------------------------------------------------
  // 🧾 Confirm print
  // ----------------------------------------------------------
  const confirmPrint = () => {
    setShowPrintPopup(false);

    if (!onPrintKOT) {
      console.warn("onPrintKOT handler is not available");
      return;
    }

    if (!activeKotItems.length) {
      return;
    }

    onPrintKOT({
      order,
      items: activeKotItems,
      cancelledItems,
      kotType: normalizedKotType,
    });
  };

  // ----------------------------------------------------------
  // 🧮 Safe total
  // ----------------------------------------------------------
  const totalAmount = Number(order.total || 0);

  const discount = Number(order.discount || 0);

  const tax = Number(order.tax || 0);

  return (
    <>
      {/* ======================================================
          PRINT CONFIRMATION POPUP
      ====================================================== */}
      {showPrintPopup && (
        <div className="no-print fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
              <Printer
                size={24}
                strokeWidth={2.5}
              />
            </div>

            {/* Title */}
            <h3 className="text-lg font-black text-slate-900">
              Print KOT?
            </h3>

            {/* Description */}
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to print the{" "}
              <span className="font-bold text-slate-700">
                {isRevisedOrder
                  ? "Updated KOT"
                  : isRunningOrder
                    ? "Running Order KOT"
                    : "New Order KOT"}
              </span>{" "}
              for{" "}
              <span className="font-bold text-slate-700">
                {order.orderId || "-"}
              </span>
              ?
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() =>
                  setShowPrintPopup(false)
                }
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPrint}
                disabled={!activeKotItems.length}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
              >
                Print KOT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MAIN MODAL
      ====================================================== */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
        <div
          id="printable-section"
          className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl border border-slate-100 transform transition-all"
        >
          {/* ==================================================
              HEADER
          ================================================== */}
          <div className="flex justify-between items-start border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Kitchen Order Ticket
              </span>

              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {order.orderId || "-"}
              </h2>

              {/* KOT TYPE */}
              <span
                className={`inline-flex mt-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                  isRevisedOrder
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : isRunningOrder
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                }`}
              >
                {isRevisedOrder
                  ? "Updated KOT"
                  : isRunningOrder
                    ? "Running Order KOT"
                    : "New Order KOT"}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="no-print p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close order details"
            >
              <X size={20} />
            </button>
          </div>

          {/* ==================================================
              CUSTOMER & TABLE
          ================================================== */}
          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-600 border border-slate-100/80">
            {/* Table */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-500">
                Table Number:
              </span>

              <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                {order.tableNumber || "N/A"}
              </span>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-medium text-slate-800">
              <User
                size={14}
                className="text-slate-400 shrink-0"
              />

              <span className="truncate">
                {order.customerName || "Guest"}
              </span>
            </div>

            {/* Phone */}
            {order.customerPhone && (
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <Phone
                  size={14}
                  className="text-slate-400 shrink-0"
                />

                <span>
                  {order.customerPhone}
                </span>
              </div>
            )}

            {/* Delivery Address */}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2 font-medium text-slate-800 pt-1">
                <MapPin
                  size={14}
                  className="text-slate-400 shrink-0 mt-0.5"
                />

                <span className="leading-tight">
                  {order.deliveryAddress}
                </span>
              </div>
            )}
          </div>

          {/* ==================================================
              REJECTION
          ================================================== */}
          {order.status === "REJECTED" &&
            order.rejectReason && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2.5 text-rose-700 text-xs">
                <AlertCircle
                  size={16}
                  className="shrink-0 mt-0.5"
                />

                <div>
                  <span className="font-bold block">
                    Rejection Reason:
                  </span>

                  <p>{order.rejectReason}</p>
                </div>
              </div>
            )}

          {/* ==================================================
              ITEMS
          ================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {isRevisedOrder
                  ? "Updated KOT Items"
                  : isRunningOrder
                    ? "Additional KOT Items"
                    : "KOT Items"}
              </p>

              <span className="text-[10px] font-black text-slate-400">
                {activeKotItems.length} item
                {activeKotItems.length !== 1
                  ? "s"
                  : ""}
              </span>
            </div>

            {activeKotItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-xs font-bold text-slate-500">
                  No unprinted KOT items available.
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  All active items have already been
                  printed.
                </p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-50">
                {activeKotItems.map((item, idx) => (
                  <div
                    key={item?._id || idx}
                    className="flex justify-between items-center pt-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Quantity */}
                      <span className="font-bold bg-slate-100 text-slate-800 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0">
                        {Number(item?.quantity || 0)}
                      </span>

                      {/* Item */}
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-700 block truncate">
                          {item?.name || "Item"}
                        </span>

                        {item?.variant && (
                          <span className="text-[10px] text-slate-400 block">
                            Variant: {item.variant}
                          </span>
                        )}

                        {item?.notes && (
                          <span className="text-[10px] text-slate-400 block italic">
                            Note: {item.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isRevisedOrder && cancelledItems.length > 0 && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                  Cancelled
                </p>
                {cancelledItems.map((item, idx) => (
                  <p
                    key={item?._id || idx}
                    className="text-xs font-semibold text-rose-700 line-through"
                  >
                    {Number(item?.quantity || 0)} x {item?.name || "Item"}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              SUMMARY
          ================================================== */}
          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5 text-xs">
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Offer Discount</span>

                <span>
                  -₹{discount.toFixed(2)}
                </span>
              </div>
            )}

            {tax > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Tax</span>

                <span>
                  ₹{tax.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Total Amount</span>

              <span className="text-rose-600 text-base">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ==================================================
              PRINT BUTTON
          ================================================== */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!activeKotItems.length}
            className="no-print w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Printer size={16} />

            {isRevisedOrder
              ? "Print Updated KOT"
              : isRunningOrder
                ? "Print Running Order KOT"
                : "Print New Order KOT"}
          </button>
        </div>
      </div>
    </>
  );
}