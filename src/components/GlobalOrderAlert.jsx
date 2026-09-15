import { useCallback, useEffect, useRef, useState } from "react";

import { AlertCircle, ShoppingBag } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

const getRestaurantId = (order) => {
  if (!order?.restaurantId) {
    return null;
  }

  if (typeof order.restaurantId === "object") {
    return order.restaurantId?._id ? String(order.restaurantId._id) : null;
  }

  return String(order.restaurantId);
};

export default function GlobalOrderAlert() {
  const socket = useSocket();

  const navigate = useNavigate();

  const [orderAlert, setOrderAlert] = useState(null);

  const [isNavigating, setIsNavigating] = useState(false);

  const buttonRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("Item Out of Stock");
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [cancelItemData, setCancelItemData] = useState(null);
  /*
   * Prevent duplicate popup for the exact same
   * event/order arriving multiple times.
   *
   * We intentionally do NOT permanently deduplicate
   * by order ID because the same running order can
   * legitimately receive new items later.
   */
  const recentAlertsRef = useRef(new Map());

  const isPendingOrder =
    orderAlert?.order?.status === "PENDING" &&
    orderAlert?.eventType === "NEW_ORDER_RECEIVED";

  const activeItems = (orderAlert?.order?.items || []).filter(
    (item) => item?.status !== "REJECTED",
  );

  const handleAcceptOrder = useCallback(async () => {
    const orderId = orderAlert?.order?._id;

    if (!orderId || isProcessing || !isPendingOrder) return;

    try {
      setIsProcessing(true);

      const res = await axios.patch(
        `/orders/${orderId}/status`,
        { status: "ACCEPTED" },
        { withCredentials: true },
      );

      const updatedOrder = res.data?.data;

      if (updatedOrder) {
        setOrderAlert((current) =>
          current
            ? {
                ...current,
                order: updatedOrder,
              }
            : current,
        );
      }

      console.log("✅ Order accepted:", res.data);

      setShowRejectReason(false);
      recentAlertsRef.current.clear();
      setOrderAlert(null);
    } catch (error) {
      console.error("❌ Failed to accept order:", error);

      window.alert(
        error.response?.data?.message ||
          "Failed to accept order. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [orderAlert, isProcessing, isPendingOrder]);

  const handleRejectOrder = useCallback(async () => {
    const orderId = orderAlert?.order?._id;

    if (!orderId || isProcessing || !isPendingOrder) return;

    const reason = rejectReason?.trim();

    if (!reason) {
      setShowRejectReason(true);
      return;
    }

    try {
      setIsProcessing(true);

      const res = await axios.patch(
        `/orders/${orderId}/status`,
        {
          status: "REJECTED",
          rejectReason: reason,
        },
        { withCredentials: true },
      );

      console.log("❌ Order rejected:", res.data);

      setShowRejectReason(false);
      recentAlertsRef.current.clear();
      setOrderAlert(null);
    } catch (error) {
      console.error("❌ Failed to reject order:", error);

      window.alert(
        error.response?.data?.message ||
          "Failed to reject order. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [orderAlert, rejectReason, isProcessing, isPendingOrder]);

  const handleCancelItem = useCallback((orderId, itemId) => {
    if (!orderId || !itemId) return;

    setCancelItemData({
      orderId,
      itemId,
    });
  }, []);

  const confirmCancelItem = useCallback(async () => {
    const orderId = cancelItemData?.orderId;
    const itemId = cancelItemData?.itemId;

    if (!orderId || !itemId || isProcessing) return;

    try {
      setIsProcessing(true);

      const res = await axios.patch(
        `/orders/${orderId}/item/${itemId}/cancel`,
        {},
        { withCredentials: true },
      );

      const updatedOrder = res.data?.data;

      if (updatedOrder) {
        setOrderAlert((current) =>
          current
            ? {
                ...current,
                order: updatedOrder,
              }
            : current,
        );
      }

      setCancelItemData(null);
    } catch (error) {
      console.error("❌ Failed to cancel order item:", error);

      window.alert(
        error.response?.data?.message ||
          "Failed to cancel item. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  }, [cancelItemData, isProcessing]);

  const cancelItemName =
    orderAlert?.order?.items?.find(
      (item) => String(item?._id) === String(cancelItemData?.itemId),
    )?.name || "this item";

  /*
   * --------------------------------------------------
   * ALERT KEY
   * --------------------------------------------------
   */

  const getAlertKey = useCallback((order, eventType) => {
    if (!order) {
      return null;
    }

    const orderId = order?._id ?? order?.orderId ?? order?.id;

    if (!orderId) {
      return null;
    }

    /*
     * For a new order:
     *
     * ORDER_ID itself is enough.
     *
     * For running-order updates:
     * use updatedAt when available so another
     * legitimate update can still alert.
     */
    if (eventType === "NEW_ORDER_RECEIVED") {
      return `NEW:${String(orderId)}`;
    }

    const updatedAt = order?.updatedAt ?? order?.createdAt ?? Date.now();

    return `RUNNING:${String(orderId)}:${String(updatedAt)}`;
  }, []);

  /*
   * --------------------------------------------------
   * CLEAN OLD ALERT KEYS
   * --------------------------------------------------
   */

  const cleanupAlertCache = useCallback(() => {
    const now = Date.now();

    for (const [key, timestamp] of recentAlertsRef.current.entries()) {
      if (now - timestamp > 5000) {
        recentAlertsRef.current.delete(key);
      }
    }
  }, []);

  /*
   * --------------------------------------------------
   * SHOW ALERT
   * --------------------------------------------------
   */

  const showAlert = useCallback(
    (order, eventType) => {
      if (!order) {
        return;
      }

      const key = getAlertKey(order, eventType);

      /*
       * If no reliable order ID exists,
       * still show the alert.
       */
      if (key) {
        cleanupAlertCache();

        if (recentAlertsRef.current.has(key)) {
          console.log("🔇 Duplicate global order alert ignored:", key);

          return;
        }

        recentAlertsRef.current.set(key, Date.now());
      }

      setIsNavigating(false);

      /*
       * Keep the latest actionable order.
       *
       * The Order page contains all live orders,
       * so we don't need a large queue of blocking
       * modals.
       */
      setOrderAlert({
        order,
        eventType,
      });
    },
    [cleanupAlertCache, getAlertKey],
  );

  /*
   * --------------------------------------------------
   * SOCKET LISTENERS
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNewOrder = (order) => {
      console.log("🚨 GLOBAL NEW ORDER ALERT:", order);

      showAlert(order, "NEW_ORDER_RECEIVED");
    };

    const handleRunningOrderUpdated = (payload) => {
      const order = payload?.order ?? payload;

      console.log("🚨 GLOBAL RUNNING ORDER ALERT:", order);

      showAlert(order, "RUNNING_ORDER_UPDATED");
    };

    socket.on("NEW_ORDER_RECEIVED", handleNewOrder);

    socket.on("RUNNING_ORDER_UPDATED", handleRunningOrderUpdated);

    return () => {
      socket.off("NEW_ORDER_RECEIVED", handleNewOrder);

      socket.off("RUNNING_ORDER_UPDATED", handleRunningOrderUpdated);
    };
  }, [socket, showAlert]);

  /*
   * --------------------------------------------------
   * FOCUS + BODY LOCK
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!orderAlert) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = document.querySelector(
        '[data-global-order-alert-dialog="true"]',
      );

      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), select:not([disabled]), [href], input:not([disabled]), textarea:not([disabled])',
        ),
      ).filter((element) => {
        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      });

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [orderAlert]);

  /*
   * --------------------------------------------------
   * GO TO ORDER PAGE
   * --------------------------------------------------
   */

  const handleGoToOrders = useCallback(() => {
    if (isNavigating) {
      return;
    }

    setIsNavigating(true);

    /*
     * Close alert before navigation.
     *
     * /orders contains all live orders.
     */
    setOrderAlert(null);

    recentAlertsRef.current.clear();

    navigate("/orders");
  }, [isNavigating, navigate]);

  /*
   * --------------------------------------------------
   * NOTHING TO SHOW
   * --------------------------------------------------
   */

  if (!orderAlert) {
    return null;
  }

  const order = orderAlert.order;

  const orderNumber = order?.orderId ?? order?._id ?? "New Order";

  const tableNumber = order?.tableNumber ?? null;

  const orderType = order?.orderType ?? "ORDER";

  const isRunningOrder =
    orderAlert.eventType === "RUNNING_ORDER_UPDATED";

  const totalItemCount = activeItems.reduce(
    (sum, item) => sum + Number(item?.quantity || 0),
    0,
  );

  return (
    <div
      className="
        fixed inset-0 z-[99999]
        flex items-center justify-center
        bg-slate-950/80 backdrop-blur-md
        p-2 sm:p-4
      "
      role="presentation"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
    >
      <div
        data-global-order-alert-dialog="true"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="global-order-alert-title"
        aria-describedby="global-order-alert-description"
        className="
          relative flex w-full max-w-lg flex-col
          max-h-[96vh] overflow-hidden
          rounded-[1.75rem] sm:rounded-[2rem]
          border border-slate-200
          bg-white shadow-[0_25px_80px_rgba(0,0,0,0.35)]
        "
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {/* HEADER */}
        <div
          className={`shrink-0 px-4 py-4 sm:px-6 sm:py-5 ${
            isRunningOrder ? "bg-amber-500" : "bg-red-600"
          } text-white`}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center
                rounded-2xl bg-white/20
                sm:h-14 sm:w-14
              "
            >
              <AlertCircle
                size={30}
                strokeWidth={2.5}
                className="sm:h-8 sm:w-8"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="global-order-alert-title"
                  className="text-lg font-black tracking-tight sm:text-2xl"
                >
                  {isRunningOrder ? "RUNNING ORDER" : "NEW ORDER"}
                </h2>

                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider sm:text-[10px]">
                  Action Required
                </span>
              </div>

              <p
                id="global-order-alert-description"
                className="mt-1 text-xs font-medium text-white/90 sm:text-sm"
              >
                {isRunningOrder
                  ? "New items have been added to a running order."
                  : "A new order has been received."}
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            {/* ORDER META */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Order
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
                    #{orderNumber}
                  </p>
                </div>

                <div
                  className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
                    order?.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : order?.status === "ACCEPTED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {String(order?.status || "PENDING").replace(/_/g, " ")}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                <div className="rounded-xl bg-white p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Type
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-700 sm:text-sm">
                    {String(orderType).replace(/_/g, " ")}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Table
                  </p>
                  <p className="mt-1 truncate text-xs font-bold text-slate-700 sm:text-sm">
                    {tableNumber ? tableNumber : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* CUSTOMER */}
            {(order?.customerName || order?.customerPhone) && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Customer
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {order?.customerName && (
                    <span className="text-sm font-bold text-slate-800">
                      {order.customerName}
                    </span>
                  )}
                  {order?.customerPhone && (
                    <span className="text-xs font-semibold text-slate-500">
                      {order.customerPhone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ITEMS */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Order Items
                  </h3>
                  <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    {totalItemCount} item{totalItemCount === 1 ? "" : "s"}
                  </p>
                </div>

                {order?.total != null && (
                  <span className="text-base font-black text-slate-900 sm:text-lg">
                    ₹{Number(order.total || 0).toFixed(2)}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {order?.items?.length ? (
                  order.items.map((item) => {
                    const isRejected = item?.status === "REJECTED";
                    const canCancel =
                      !isRejected &&
                      order?.status !== "COMPLETED" &&
                      order?.status !== "REJECTED";

                    return (
                      <div
                        key={item?._id || `${item?.name}-${item?.itemId}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            isRejected
                              ? "bg-rose-50 text-rose-400"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item?.quantity ?? 0}x
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-bold ${
                              isRejected
                                ? "text-rose-400 line-through opacity-60"
                                : "text-slate-800"
                            }`}
                          >
                            {item?.name || "Unnamed item"}
                          </p>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {item?.price != null && (
                              <span className="text-[10px] font-semibold text-slate-400">
                                ₹{Number(item.price || 0).toFixed(2)} each
                              </span>
                            )}

                            {isRejected && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-rose-500">
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>

                        {canCancel && (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              handleCancelItem(order?._id, item?._id)
                            }
                            className="
                              shrink-0 rounded-lg border border-rose-200
                              bg-rose-50 px-2.5 py-2
                              text-[10px] font-black uppercase tracking-wide
                              text-rose-600 transition
                              hover:bg-rose-100
                              focus:outline-none focus:ring-2 focus:ring-rose-200
                              disabled:cursor-not-allowed disabled:opacity-50
                              sm:px-3
                            "
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-8 text-center">
                    <ShoppingBag
                      size={30}
                      className="mx-auto text-slate-300"
                    />
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      No items found
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* PENDING ACTIONS */}
            {isPendingOrder && (
              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleAcceptOrder}
                  className="
                    flex w-full items-center justify-center
                    rounded-2xl bg-emerald-600
                    px-5 py-3.5 sm:py-4
                    text-sm font-black uppercase tracking-wide text-white
                    shadow-lg shadow-emerald-600/20 transition
                    hover:bg-emerald-700
                    focus:outline-none focus:ring-4 focus:ring-emerald-200
                    disabled:cursor-wait disabled:opacity-60
                  "
                >
                  {isProcessing ? "PROCESSING..." : "✓ ACCEPT ORDER"}
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setShowRejectReason((prev) => !prev)}
                  className="
                    flex w-full items-center justify-center
                    rounded-2xl border border-rose-200 bg-rose-50
                    px-5 py-3.5 sm:py-4
                    text-sm font-black uppercase tracking-wide text-rose-600
                    transition hover:bg-rose-100
                    focus:outline-none focus:ring-4 focus:ring-rose-200
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  <span>✕ REJECT ORDER</span>
                  <span className="ml-2 text-xs">
                    {showRejectReason ? "▲" : "▼"}
                  </span>
                </button>

                {/* REJECTION PANEL
                    Kept outside the button so native select/dropdown
                    remains visible and clickable on mobile + desktop. */}
                {showRejectReason && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 sm:p-4">
                    <label
                      htmlFor="global-order-reject-reason"
                      className="mb-2 block text-[10px] font-black uppercase tracking-widest text-rose-700"
                    >
                      Rejection Reason
                    </label>

                    <select
                      id="global-order-reject-reason"
                      value={rejectReason}
                      onChange={(event) =>
                        setRejectReason(event.target.value)
                      }
                      disabled={isProcessing}
                      className="
                        block w-full appearance-auto rounded-xl
                        border border-slate-300 bg-white
                        px-3.5 py-3
                        text-sm font-semibold text-slate-800
                        outline-none transition
                        focus:border-rose-400 focus:ring-2 focus:ring-rose-200
                        disabled:cursor-not-allowed disabled:bg-slate-100
                      "
                    >
                      <option value="Item Out of Stock">
                        Item Out of Stock
                      </option>
                      <option value="Kitchen Busy">Kitchen Busy</option>
                      <option value="Store Closing Time">
                        Store Closing Time
                      </option>
                    </select>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleRejectOrder}
                      className="
                        mt-2.5 w-full rounded-xl bg-rose-600
                        px-4 py-3 text-xs font-black uppercase
                        tracking-wide text-white transition
                        hover:bg-rose-700
                        focus:outline-none focus:ring-4 focus:ring-rose-200
                        disabled:cursor-wait disabled:opacity-60
                      "
                    >
                      {isProcessing
                        ? "REJECTING..."
                        : "CONFIRM REJECTION"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* GO TO ORDERS */}
            <div className="mt-3">
              <button
                ref={buttonRef}
                type="button"
                disabled={isNavigating || isProcessing}
                onClick={handleGoToOrders}
                className="
                  w-full rounded-2xl bg-slate-900
                  px-5 py-3.5 sm:py-4
                  text-sm font-black uppercase tracking-wide text-white
                  shadow-lg shadow-slate-900/20 transition
                  hover:bg-slate-800
                  focus:outline-none focus:ring-4 focus:ring-slate-300
                  disabled:cursor-wait disabled:opacity-60
                "
              >
                {isNavigating ? "OPENING ORDERS..." : "GO TO ORDER PAGE"}
              </button>
            </div>

            <p className="mt-3 pb-1 text-center text-[10px] font-semibold text-slate-400">
              {isPendingOrder
                ? "Accept, reject, cancel an item, or open the Order Page."
                : "Review the new running-order items or open the Order Page."}
            </p>
          </div>
        </div>

        {/* ITEM CANCEL CONFIRMATION */}
        {cancelItemData && (
          <div
            className="
              absolute inset-0 z-20 flex items-center justify-center
              bg-slate-950/55 p-4 backdrop-blur-sm
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-item-title"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div
              className="
                w-full max-w-sm rounded-3xl
                border border-slate-200 bg-white
                p-5 shadow-2xl sm:p-6
              "
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertCircle size={26} />
              </div>

              <h3
                id="cancel-item-title"
                className="mt-4 text-lg font-black text-slate-900"
              >
                Cancel this item?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Are you sure you want to cancel{" "}
                <span className="font-bold text-slate-800">
                  {cancelItemName}
                </span>
                ?
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setCancelItemData(null)}
                  className="
                    rounded-xl border border-slate-200 bg-white
                    px-4 py-3 text-xs font-black uppercase
                    tracking-wide text-slate-600 transition
                    hover:bg-slate-50
                    disabled:opacity-50
                  "
                >
                  Keep
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={confirmCancelItem}
                  className="
                    rounded-xl bg-rose-600 px-4 py-3
                    text-xs font-black uppercase tracking-wide text-white
                    transition hover:bg-rose-700
                    disabled:cursor-wait disabled:opacity-60
                  "
                >
                  {isProcessing ? "CANCELLING..." : "Cancel Item"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
