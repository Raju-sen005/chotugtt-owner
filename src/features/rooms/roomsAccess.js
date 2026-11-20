/**
 * ROOM_MANAGEMENT access helpers.
 * Entitlement comes from backend availableFeatures (not plan-string PLUS checks).
 */

import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../subscription/featureAccess";

export const ROOM_TYPES = Object.freeze([
  "Standard",
  "Deluxe",
  "Super Deluxe",
  "Suite",
  "Executive",
]);

export const ROOM_STATUSES = Object.freeze([
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "CLEANING",
  "MAINTENANCE",
]);

/** Manual toggles allowed in UI (never RESERVED / OCCUPIED). */
export const SAFE_STATUS_ACTIONS = Object.freeze({
  AVAILABLE: [{ to: "MAINTENANCE", label: "Mark maintenance" }],
  MAINTENANCE: [{ to: "AVAILABLE", label: "Mark available" }],
  CLEANING: [{ to: "AVAILABLE", label: "Mark available" }],
  RESERVED: [{ to: "AVAILABLE", label: "Release reservation" }],
  OCCUPIED: [],
});

export function normalizePlan(user) {
  return String(
    user?.subscriptionPlan || user?.restaurant?.subscriptionPlan || "",
  )
    .trim()
    .toUpperCase();
}

export function isSubscriptionActive(user) {
  const expiry =
    user?.subscriptionExpiresAt ||
    user?.restaurant?.subscriptionExpiresAt ||
    null;
  const expiryMs = expiry ? new Date(expiry).getTime() : NaN;
  return (
    String(user?.subscriptionStatus || "").toUpperCase() === "ACTIVE" &&
    Number.isFinite(expiryMs) &&
    expiryMs > Date.now()
  );
}

/**
 * Active subscription + ROOM_MANAGEMENT entitlement.
 */
export function hasRoomManagementAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return (
    isSubscriptionActive(user) &&
    hasAvailableFeature(user, FEATURE_KEYS.ROOM_MANAGEMENT)
  );
}

export function normalizeRoomStatus(value) {
  const raw = String(value || "").trim();
  const map = {
    Available: "AVAILABLE",
    Occupied: "OCCUPIED",
    Maintenance: "MAINTENANCE",
    Booked: "RESERVED",
    AVAILABLE: "AVAILABLE",
    RESERVED: "RESERVED",
    OCCUPIED: "OCCUPIED",
    CLEANING: "CLEANING",
    MAINTENANCE: "MAINTENANCE",
  };
  return map[raw] || map[raw.toUpperCase()] || "AVAILABLE";
}

export function getApiErrorMessage(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (data?.code === "FEATURE_NOT_AVAILABLE") {
    return (
      data.message ||
      "This feature is not included in your current plan."
    );
  }
  return data?.message || error?.message || fallback;
}

export function isFeatureNotAvailable(error) {
  return error?.response?.data?.code === "FEATURE_NOT_AVAILABLE";
}

/**
 * Canonical room number field on Room documents / list API rows.
 * Do not invent alternate property names.
 * Runtime may be string ("101", "Room 101") or number (101).
 */
export function getRoomNumberValue(room) {
  if (!room || typeof room !== "object") return "";
  if (room.roomNumber == null || room.roomNumber === "") return "";
  return String(room.roomNumber).trim();
}

function roomStableId(room) {
  if (!room || typeof room !== "object") return "";
  if (room._id != null) return String(room._id);
  if (room.id != null) return String(room.id);
  return "";
}

/** Normalize unicode / odd whitespace so sort keys stay comparable. */
export function normalizeRoomNumberWhitespace(value) {
  return String(value ?? "")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sort key only — strips decorative leading "Room"/"Rm" labels and whitespace.
 * Does NOT change stored roomNumber.
 * "Room 101" / "101" / 101 → "101"
 */
export function normalizeRoomNumberForSort(value) {
  let s = normalizeRoomNumberWhitespace(value);
  if (!s) return "";
  // Repeat so "Room Room 101" collapses to "101".
  let prev;
  do {
    prev = s;
    s = s.replace(/^(rooms?|rm)\s+/i, "").trim();
  } while (s !== prev);
  return s;
}

/**
 * UI label without duplicating a stored "Room" prefix.
 * Stored "Room 101" or "101" → "Room 101". Does not mutate storage.
 */
export function formatRoomLabel(roomOrNumber) {
  const raw =
    roomOrNumber && typeof roomOrNumber === "object"
      ? getRoomNumberValue(roomOrNumber)
      : normalizeRoomNumberWhitespace(roomOrNumber);
  if (!raw) return "Room —";
  const identity = normalizeRoomNumberForSort(raw);
  if (!identity) return "Room —";
  return `Room ${identity}`;
}

/**
 * Split a room number into numeric / non-numeric chunks for natural order.
 * Uses normalizeRoomNumberForSort first.
 */
export function tokenizeRoomNumber(value) {
  const raw = normalizeRoomNumberForSort(value);
  if (!raw) return [];
  const tokens = [];
  const re = /(\d+)|(\D+)/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    if (match[1] != null) {
      tokens.push({ kind: "num", value: match[1] });
    } else {
      tokens.push({ kind: "str", value: match[2].toLowerCase() });
    }
  }
  return tokens;
}

/**
 * Natural / numeric ascending compare for room number values (string or number).
 * Empty / missing numbers sort last.
 */
export function compareRoomNumberStrings(a, b) {
  const left = normalizeRoomNumberForSort(a);
  const right = normalizeRoomNumberForSort(b);
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const aTokens = tokenizeRoomNumber(left);
  const bTokens = tokenizeRoomNumber(right);
  const len = Math.max(aTokens.length, bTokens.length);
  for (let i = 0; i < len; i += 1) {
    const at = aTokens[i];
    const bt = bTokens[i];
    if (!at) return -1;
    if (!bt) return 1;
    if (at.kind === "num" && bt.kind === "num") {
      const an = Number(at.value);
      const bn = Number(bt.value);
      if (an !== bn) return an < bn ? -1 : 1;
      if (at.value.length !== bt.value.length) {
        return at.value.length < bt.value.length ? -1 : 1;
      }
      if (at.value !== bt.value) {
        return at.value < bt.value ? -1 : 1;
      }
      continue;
    }
    if (at.kind !== bt.kind) {
      return at.kind === "num" ? -1 : 1;
    }
    if (at.value !== bt.value) {
      return at.value < bt.value ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Compare two room objects by roomNumber (natural), then stable id.
 * Ignores status / booking / QR fields.
 */
export function compareRoomsByNumber(a, b) {
  const byNumber = compareRoomNumberStrings(
    getRoomNumberValue(a),
    getRoomNumberValue(b),
  );
  if (byNumber !== 0) return byNumber;
  const idA = roomStableId(a);
  const idB = roomStableId(b);
  if (idA === idB) return 0;
  if (!idA) return 1;
  if (!idB) return -1;
  return idA < idB ? -1 : 1;
}

/**
 * Sort a room list ascending by roomNumber. Returns a new array.
 * Call on the final visible list immediately before render.
 */
export function sortRoomsByNumber(rooms) {
  const list = Array.isArray(rooms) ? rooms.slice() : [];
  list.sort(compareRoomsByNumber);
  return list;
}

/**
 * Room QR rows are { room, ... }. Same comparator as Room Management.
 */
export function sortRoomRowsByNumber(rows) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  list.sort((a, b) => compareRoomsByNumber(a?.room, b?.room));
  return list;
}
