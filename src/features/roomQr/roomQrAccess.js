/**
 * ROOM_QR_ORDERING access helpers (Phase C).
 *
 * Backend: generate/get/revoke require requireFeature(ROOM_QR_ORDERING)
 * and authorize(OWNER, MANAGER). Entitlement from availableFeatures.
 *
 * Guest QR destination must come from backend data.publicUrl —
 * never reconstruct from VITE_APP_API_BASE.
 */

import {
  isSubscriptionActive,
  isFeatureNotAvailable,
  normalizeRoomStatus,
} from "../rooms/roomsAccess";
import {
  normalizeBookingStatus,
  bookingIdOf,
  roomIdOf,
  roomNumberOf,
} from "../bookings/bookingsAccess";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../subscription/featureAccess";
import { resolveBackendRoomQrPublicUrl } from "./roomQrPublicUrl";

export function hasRoomQrAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return (
    isSubscriptionActive(user) &&
    hasAvailableFeature(user, FEATURE_KEYS.ROOM_QR_ORDERING)
  );
}

/** Generate / get / revoke — OWNER|MANAGER only (matches backend). */
export function canManageRoomQr(user) {
  return ["OWNER", "MANAGER"].includes(user?.role);
}

export function getRoomQrApiErrorMessage(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (data?.code === "FEATURE_NOT_AVAILABLE") {
    return (
      data.message ||
      "This feature is not included in your current plan."
    );
  }
  if (data?.code === "ROOM_QR_NOT_FOUND") {
    return data.message || "No active room QR for this room.";
  }
  if (data?.code === "ROOM_QR_SECRET_MISSING") {
    return (
      data.message ||
      "Room QR signing is not configured on the server."
    );
  }
  if (data?.code === "ROOM_QR_PUBLIC_BASE_URL_MISSING") {
    return (
      data.message ||
      "Guest menu base URL is not configured on the server (ROOM_QR_PUBLIC_BASE_URL)."
    );
  }
  if (data?.code === "ROOM_QR_PUBLIC_BASE_URL_INVALID") {
    return data.message || "Guest menu base URL on the server is invalid.";
  }
  return data?.message || error?.message || fallback;
}

/**
 * @deprecated Do not use for QR encoding. Prefer resolveBackendRoomQrPublicUrl.
 * Kept only to avoid accidental API-origin reconstruction — always fails closed
 * unless the argument is already an absolute http(s) URL (passthrough).
 */
export function buildPublicRoomMenuUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  // Intentionally do NOT prefix VITE_APP_API_BASE.
  return "";
}

/**
 * Map generate/get API data → in-memory QR display model.
 * Fails closed when publicUrl is missing.
 */
export function mapRoomQrApiData(data) {
  const resolved = resolveBackendRoomQrPublicUrl(data);
  if (!resolved.ok) {
    const error = new Error(resolved.message);
    error.code = resolved.code;
    throw error;
  }
  return {
    roomId: data.roomId,
    roomNumber: data.roomNumber,
    bookingId: data.bookingId || null,
    bookingStatus: data.bookingStatus || null,
    roomStatus: data.roomStatus || null,
    tokenVersion: data.tokenVersion,
    tokenFormat: data.tokenFormat || "v2",
    usableForOrdering: Boolean(data.usableForOrdering),
    path: data.path || null,
    publicUrl: resolved.url,
    issuedAt: data.issuedAt || null,
    revoked: Boolean(data.revoked),
  };
}

/**
 * Stable room-level QR status from Room document fields (not booking).
 */
export function deriveRoomQrStatus(room) {
  if (!room) return "UNAVAILABLE";
  if (room.qrRevokedAt) return "REVOKED";
  if (Number(room.qrTokenVersion) >= 1) return "ACTIVE";
  return "NONE";
}

/**
 * Legacy booking-derived status — unused for wall QR after Phase C.
 * Kept for any residual booking list badges.
 */
export function deriveQrStatus(booking) {
  if (!booking) return "UNAVAILABLE";
  const status = normalizeBookingStatus(booking.bookingStatus);
  if (status === "CHECKED_OUT" || status === "CANCELLED") return "INACTIVE";
  if (booking.qrRevokedAt) return "REVOKED";
  if (Number(booking.qrTokenVersion) >= 1) return "ACTIVE";
  return "NONE";
}

/** Room wall QR can be generated without an active booking (stable v2). */
export function isRoomEligibleForQr(room) {
  if (!room) return false;
  const roomStatus = normalizeRoomStatus(room.status);
  if (roomStatus === "MAINTENANCE") return false;
  return true;
}

/** @deprecated Prefer isRoomEligibleForQr for wall QR. */
export function isBookingEligibleForQr(booking, room) {
  return isRoomEligibleForQr(room);
}

export {
  isFeatureNotAvailable,
  normalizeBookingStatus,
  normalizeRoomStatus,
  bookingIdOf,
  roomIdOf,
  roomNumberOf,
  resolveBackendRoomQrPublicUrl,
};
