/**
 * Room-booking access helpers (Milestone 6B.2).
 *
 * Backend mounts booking routes under requireFeature(ROOM_MANAGEMENT).
 * Frontend entitlement uses ROOM_BOOKING from availableFeatures.
 */

import {
  isSubscriptionActive,
  normalizePlan,
  isFeatureNotAvailable,
  normalizeRoomStatus,
} from "../rooms/roomsAccess";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../subscription/featureAccess";

export const BOOKING_STATUSES = Object.freeze([
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
]);

export const ID_PROOF_TYPES = Object.freeze([
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Voter ID",
  "Other",
]);

/**
 * UI helper for the booking mobile field: digits only, hard-capped at 10.
 * Use on change so 11+ digits cannot enter the controlled input.
 */
export function sanitizeMobileDigitsInput(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 10);
}

/**
 * Paste-safe mobile normalize: prefer full Indian parse (+91 / 0 prefixes),
 * otherwise fall back to digit-only max-10 truncation.
 */
export function normalizeMobileInputValue(raw) {
  const parsed = parseIndianMobile(raw);
  if (parsed.ok) return parsed.value;
  return sanitizeMobileDigitsInput(raw);
}

/**
 * Indian mobile: 10 digits starting 6–9.
 * Accepts optional +91 / 91 / 0 prefix. Canonical value is 10 digits.
 */
export function parseIndianMobile(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { ok: false, message: "A valid Indian mobile number is required." };
  }
  const trimmed = String(raw).trim();
  if (/[a-zA-Z]/.test(trimmed)) {
    return { ok: false, message: "Mobile number must not contain letters." };
  }
  if (!/^[+\d][\d\s\-()]*$/.test(trimmed)) {
    return {
      ok: false,
      message: "Mobile number contains invalid characters.",
    };
  }
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) {
    return {
      ok: false,
      message: "Enter a valid 10-digit Indian mobile number.",
    };
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      ok: false,
      message: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }
  return { ok: true, value: digits };
}

export function canonicalizeIdProofType(raw) {
  const trimmed = String(raw || "").trim();
  if (ID_PROOF_TYPES.includes(trimmed)) return trimmed;
  const aliases = {
    aadhaar: "Aadhaar",
    aadhar: "Aadhaar",
    pan: "PAN",
    passport: "Passport",
    "driving license": "Driving License",
    driving_license: "Driving License",
    drivinglicence: "Driving License",
    "voter id": "Voter ID",
    voter_id: "Voter ID",
    voterid: "Voter ID",
    other: "Other",
  };
  return aliases[trimmed.toLowerCase()] || null;
}

/**
 * UI constraints for the ID proof number field (must match validateIdProof).
 * Does not invent formats for unsupported types.
 */
export function getIdProofInputConstraints(proofTypeRaw) {
  const proofType = canonicalizeIdProofType(proofTypeRaw) || "Aadhaar";
  switch (proofType) {
    case "Aadhaar":
      return {
        proofType,
        maxLength: 12,
        inputMode: "numeric",
        autoCapitalize: "off",
        placeholder: "12-digit Aadhaar",
        hint: "Exactly 12 numeric digits (spaces/hyphens are removed).",
      };
    case "PAN":
      return {
        proofType,
        maxLength: 10,
        inputMode: "text",
        autoCapitalize: "characters",
        placeholder: "ABCDE1234F",
        hint: "Format ABCDE1234F (5 letters, 4 digits, 1 letter).",
      };
    case "Passport":
      return {
        proofType,
        maxLength: 9,
        inputMode: "text",
        autoCapitalize: "characters",
        placeholder: "6–9 alphanumeric",
        hint: "6–9 alphanumeric characters (letters and digits).",
      };
    case "Driving License":
      return {
        proofType,
        maxLength: 20,
        inputMode: "text",
        autoCapitalize: "characters",
        placeholder: "8–20 alphanumeric",
        hint: "8–20 alphanumeric characters (state formats vary).",
      };
    case "Voter ID":
      return {
        proofType,
        maxLength: 10,
        inputMode: "text",
        autoCapitalize: "characters",
        placeholder: "ABC1234567",
        hint: "Format ABC1234567 (3 letters + 7 digits).",
      };
    case "Other":
    default:
      return {
        proofType: "Other",
        maxLength: 40,
        inputMode: "text",
        autoCapitalize: "off",
        placeholder: "ID number",
        hint: "3–40 characters with at least one letter or digit.",
      };
  }
}

/** Live input filter — type-aware; never applies Aadhaar digit-only to PAN. */
export function applyIdProofInputFilter(proofTypeRaw, raw) {
  const proofType = canonicalizeIdProofType(proofTypeRaw) || "Other";
  const value = String(raw ?? "");

  if (proofType === "Aadhaar") {
    return value.replace(/\D/g, "").slice(0, 12);
  }
  if (proofType === "PAN") {
    return value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);
  }
  if (proofType === "Passport") {
    return value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 9);
  }
  if (proofType === "Driving License") {
    return value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 20);
  }
  if (proofType === "Voter ID") {
    return value
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase()
      .slice(0, 10);
  }
  return value.slice(0, 40);
}

/**
 * When ID type changes: keep the number if still valid for the new type;
 * clear only when incompatible. Never silently rewrite a valid value.
 */
export function resolveProofNumberAfterTypeChange(
  nextProofTypeRaw,
  currentProofNumber,
) {
  const nextType = canonicalizeIdProofType(nextProofTypeRaw);
  const current = String(currentProofNumber || "");
  if (!nextType || !current.trim()) {
    return { proofNumber: "", cleared: Boolean(current.trim()) };
  }
  const filtered = applyIdProofInputFilter(nextType, current);
  const validated = validateIdProof(nextType, filtered);
  if (validated.ok) {
    return { proofNumber: validated.value.proofNumber, cleared: false };
  }
  // Partially typed values that still look compatible with the new charset
  // are kept after filtering; fully incompatible values are cleared.
  if (filtered && filtered === applyIdProofInputFilter(nextType, filtered)) {
    const stillLooksCompatible =
      nextType === "Aadhaar"
        ? /^\d*$/.test(filtered)
        : nextType === "Other" || /^[A-Z0-9]*$/i.test(filtered);
    if (stillLooksCompatible && filtered.length > 0) {
      return { proofNumber: filtered, cleared: false };
    }
  }
  return { proofNumber: "", cleared: true };
}

/** Format validation matching backend parseIdProof (no full number in messages). */
export function validateIdProof(proofTypeRaw, proofNumberRaw) {
  const proofType = canonicalizeIdProofType(proofTypeRaw);
  if (!proofType) {
    return {
      ok: false,
      message: `Select a valid ID proof type (${ID_PROOF_TYPES.join(", ")}).`,
    };
  }
  const trimmed = String(proofNumberRaw || "").trim();
  if (!trimmed) {
    return { ok: false, message: "ID proof number is required." };
  }

  if (proofType === "Aadhaar") {
    const digits = trimmed.replace(/\s|-/g, "");
    if (!/^\d{12}$/.test(digits)) {
      return { ok: false, message: "Aadhaar number must be exactly 12 digits." };
    }
    return { ok: true, value: { proofType, proofNumber: digits } };
  }
  if (proofType === "PAN") {
    const pan = trimmed.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return { ok: false, message: "PAN must match format ABCDE1234F." };
    }
    return { ok: true, value: { proofType, proofNumber: pan } };
  }
  if (proofType === "Passport") {
    const passport = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,9}$/.test(passport)) {
      return {
        ok: false,
        message: "Passport number must be 6–9 alphanumeric characters.",
      };
    }
    return { ok: true, value: { proofType, proofNumber: passport } };
  }
  if (proofType === "Driving License") {
    const dl = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8,20}$/.test(dl)) {
      return {
        ok: false,
        message: "Driving License must be 8–20 alphanumeric characters.",
      };
    }
    return { ok: true, value: { proofType, proofNumber: dl } };
  }
  if (proofType === "Voter ID") {
    const epic = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z]{3}[0-9]{7}$/.test(epic)) {
      return { ok: false, message: "Voter ID must match format ABC1234567." };
    }
    return { ok: true, value: { proofType, proofNumber: epic } };
  }
  if (trimmed.length < 3 || trimmed.length > 40) {
    return { ok: false, message: "ID proof number must be 3–40 characters." };
  }
  if (!/[A-Za-z0-9]/.test(trimmed)) {
    return {
      ok: false,
      message: "ID proof number must include letters or digits.",
    };
  }
  return {
    ok: true,
    value: { proofType, proofNumber: trimmed.slice(0, 40) },
  };
}

export function hasRoomBookingAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return (
    isSubscriptionActive(user) &&
    hasAvailableFeature(user, FEATURE_KEYS.ROOM_BOOKING)
  );
}

export function canWriteBookings(user) {
  return ["OWNER", "MANAGER"].includes(user?.role);
}

export function normalizeBookingStatus(value) {
  const raw = String(value || "").trim();
  const map = {
    Confirmed: "CONFIRMED",
    "Checked-In": "CHECKED_IN",
    "Checked-Out": "CHECKED_OUT",
    Cancelled: "CANCELLED",
    Completed: "CHECKED_OUT",
    CONFIRMED: "CONFIRMED",
    CHECKED_IN: "CHECKED_IN",
    CHECKED_OUT: "CHECKED_OUT",
    CANCELLED: "CANCELLED",
  };
  return map[raw] || map[raw.toUpperCase()] || raw.toUpperCase();
}

export function bookingIdOf(booking) {
  return String(booking?.id || booking?._id || "");
}

export function roomIdOf(roomOrBooking) {
  if (!roomOrBooking) return "";
  if (typeof roomOrBooking === "string") return roomOrBooking;
  if (roomOrBooking.roomId && typeof roomOrBooking.roomId === "object") {
    return String(roomOrBooking.roomId.id || roomOrBooking.roomId._id || "");
  }
  return String(
    roomOrBooking.roomId || roomOrBooking.id || roomOrBooking._id || "",
  );
}

export function roomNumberOf(booking) {
  const room = booking?.roomId;
  if (room && typeof room === "object") return room.roomNumber || "—";
  return "—";
}

/**
 * Rooms selectable for new bookings (status-only fallback).
 * Prefer availability API results when stay dates are known.
 * CLEANING and MAINTENANCE are excluded. RESERVED/OCCUPIED remain selectable
 * so non-overlapping future stays can be booked; backend enforces overlaps.
 */
export function isRoomSelectableForBooking(room) {
  const status = normalizeRoomStatus(room?.status);
  return (
    status === "AVAILABLE" ||
    status === "RESERVED" ||
    status === "OCCUPIED"
  );
}

/**
 * Prefer backend availability.available rows when present.
 * If rooms inventory is still loading / id mismatch, synthesize options
 * from the availability payload so AVAILABLE rooms are not dropped.
 */
export function pickBookableRoomsFromAvailability(availabilityRows, rooms) {
  if (!Array.isArray(availabilityRows) || availabilityRows.length === 0) {
    return rooms.filter(isRoomSelectableForBooking);
  }
  const availableRows = availabilityRows.filter((row) => row.available);
  if (availableRows.length === 0) return [];

  const byId = new Map(
    (rooms || []).map((room) => [roomIdOf(room), room]),
  );

  return availableRows.map((row) => {
    const id = String(row.roomId || row.id || "");
    const existing = byId.get(id);
    if (existing) return existing;
    return {
      _id: id,
      id,
      roomNumber: row.roomNumber,
      roomType: row.roomType,
      pricePerNight: row.pricePerNight,
      capacity: row.capacity,
      status: row.status || "AVAILABLE",
    };
  });
}

/** Human-readable empty-state from availability API payload. */
export function formatAvailabilityEmptyMessage(availabilityPayload) {
  if (availabilityPayload?.emptyReason) return availabilityPayload.emptyReason;
  const cleaning = availabilityPayload?.unavailableSummary?.cleaningRoomNumbers;
  if (Array.isArray(cleaning) && cleaning.length > 0) {
    return `${cleaning.length} room(s) are CLEANING after checkout (${cleaning.join(
      ", ",
    )}). Mark them AVAILABLE in Rooms after housekeeping — early checkout does not skip cleaning.`;
  }
  return "No rooms available for these dates.";
}

export function canEditBookingStay(booking) {
  const status = normalizeBookingStatus(booking?.bookingStatus);
  return status === "CONFIRMED" || status === "CHECKED_IN";
}

export const CHECKOUT_EXTENSION_ONLY_MESSAGE =
  "Checkout date can only be extended here. For early checkout, use the Checkout action.";

/**
 * Change Stay Dates may only push scheduled checkout later than the
 * booking's current scheduled checkout (YYYY-MM-DD string compare).
 */
export function isCheckoutDateExtended(currentCheckOut, nextCheckOut) {
  const current = toDateInputValue(currentCheckOut);
  const next = String(nextCheckOut || "").trim();
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    return false;
  }
  return next > current;
}

export function getBookingApiErrorMessage(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (data?.code === "FEATURE_NOT_AVAILABLE") {
    return (
      data.message ||
      "This feature is not included in your current plan."
    );
  }
  if (data?.code === "GUEST_STORAGE_NOT_CONFIGURED") {
    return (
      data.message ||
      "Guest identity encryption is not configured. Create the booking without saving identity on the guest record, or configure guest document encryption."
    );
  }
  if (data?.code === "ROOM_CLEANING" || data?.code === "ROOM_UNDER_MAINTENANCE") {
    return data.message || "This room cannot be booked in its current status.";
  }
  if (
    data?.code === "STAY_EDIT_NOT_ALLOWED" ||
    data?.code === "CHECKIN_DATE_LOCKED" ||
    data?.code === "CHECKOUT_EXTENSION_ONLY" ||
    data?.code === "FOLIO_NOT_MUTABLE_FOR_STAY_EDIT" ||
    data?.code === "FOLIO_HAS_PAYMENTS" ||
    data?.code === "FOLIO_RENT_ALLOCATED" ||
    data?.code === "ROOM_BOOKING_CONFLICT" ||
    data?.code === "STAY_EDIT_RECOVERY_REQUIRED"
  ) {
    return data.message || fallback;
  }
  if (data?.code === "GUEST_COUNT_EXCEEDS_CAPACITY") {
    return data.message || "Guest count exceeds room capacity.";
  }
  if (data?.code === "INVALID_MOBILE_NUMBER" || data?.code === "INVALID_ID_PROOF") {
    return data.message || fallback;
  }
  return data?.message || error?.message || fallback;
}

export function formatBookingDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatBookingDateTime(value) {
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

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return 0;
  }
  return Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

export { isFeatureNotAvailable, normalizeRoomStatus };
