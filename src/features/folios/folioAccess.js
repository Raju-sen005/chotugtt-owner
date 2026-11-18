/**
 * PLUS + ROOM_FOLIO access helpers (Milestone 6D).
 *
 * Backend: folio routes require requireFeature(ROOM_FOLIO) under
 * ROOM_MANAGEMENT parent. PRO does not receive ROOM_FOLIO.
 */

import {
  isSubscriptionActive,
  normalizePlan,
  isFeatureNotAvailable,
} from "../rooms/roomsAccess";
import {
  normalizeBookingStatus,
  bookingIdOf,
  roomIdOf,
  roomNumberOf,
  formatBookingDate,
  getBookingApiErrorMessage,
} from "../bookings/bookingsAccess";

export const FOLIO_STATUSES = Object.freeze([
  "OPEN",
  "SETTLING",
  "SETTLED",
  "VOID",
]);

export const LINE_SOURCE_TYPES = Object.freeze([
  "ROOM_RENT",
  "FOOD_ORDER",
  "HOTEL_SERVICE",
  "MANUAL_ADJUSTMENT",
]);

export const PAYMENT_METHODS = Object.freeze(["CASH", "UPI", "MIXED"]);

export function hasRoomFolioAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return isSubscriptionActive(user) && normalizePlan(user) === "PLUS";
}

/** Payments, adjustments, init, checkout — OWNER|MANAGER (matches backend). */
export function canManageFolioPayments(user) {
  return ["OWNER", "MANAGER"].includes(user?.role);
}

/** Sync / services / receipt / GET — OWNER|MANAGER|STAFF. */
export function canViewFolio(user) {
  return ["OWNER", "MANAGER", "STAFF"].includes(user?.role);
}

export function normalizeFolioStatus(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (FOLIO_STATUSES.includes(raw)) return raw;
  return raw || "OPEN";
}

export function formatMoney(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getFolioApiErrorMessage(error, fallback = "Request failed") {
  const data = error?.response?.data;
  const code = data?.code;
  if (code === "FEATURE_NOT_AVAILABLE") {
    return (
      data.message ||
      "Room Folio requires an active PLUS subscription (ROOM_FOLIO)."
    );
  }
  if (code === "FOLIO_NOT_FOUND") {
    return data.message || "Folio not found for this booking.";
  }
  if (code === "FOLIO_SETTLED") {
    return data.message || "This folio is settled and immutable.";
  }
  if (code === "FOLIO_BALANCE_DUE") {
    return (
      data.message ||
      "Cannot checkout while the folio has an outstanding balance."
    );
  }
  if (code === "PENDING_KITCHEN_ORDERS") {
    return (
      data.message ||
      "Cannot checkout while kitchen orders are still pending or accepted."
    );
  }
  if (code === "OVERPAYMENT") {
    return data.message || "Payment exceeds outstanding folio balance.";
  }
  if (code === "FOLIO_SETTLING" || code === "FOLIO_SETTLE_FAILED") {
    return (
      data.message ||
      "Folio settlement is in progress. Wait for checkout to finish before printing the final invoice."
    );
  }
  if (code === "FOLIO_VOID") {
    return (
      data.message ||
      "This folio has been voided. A guest invoice cannot be generated."
    );
  }
  if (code === "FOLIO_INVOICE_UNAVAILABLE") {
    return data.message || "Invoice is unavailable for this folio status.";
  }
  return data?.message || getBookingApiErrorMessage(error, fallback);
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `folio-pay-${crypto.randomUUID()}`;
  }
  return `folio-pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function guestNameOf(booking) {
  if (!booking) return "—";
  if (booking.guestId && typeof booking.guestId === "object") {
    return booking.guestId.fullName || booking.guestId.name || booking.customerName || "—";
  }
  return booking.customerName || "—";
}

export function bookingRefOf(booking) {
  if (!booking) return "—";
  return (
    booking.bookingReference ||
    booking.bookingNumber ||
    booking.reference ||
    String(booking.id || booking._id || "").slice(-8) ||
    "—"
  );
}

export {
  isFeatureNotAvailable,
  normalizeBookingStatus,
  bookingIdOf,
  roomIdOf,
  roomNumberOf,
  formatBookingDate,
};
