/**
 * Bookings → Room Folios checkout handoff (no PII in URL/state).
 * Pure helpers — no React Router imports (easy for node:test).
 */

export const ROOM_FOLIOS_PATH = "/room-folios";
export const ROOM_FOLIO_BOOKING_QUERY = "bookingId";

const STATUS_MAP = Object.freeze({
  Confirmed: "CONFIRMED",
  "Checked-In": "CHECKED_IN",
  "Checked-Out": "CHECKED_OUT",
  Cancelled: "CANCELLED",
  Completed: "CHECKED_OUT",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  CHECKED_OUT: "CHECKED_OUT",
  CANCELLED: "CANCELLED",
});

function canonicalizeBookingStatus(value) {
  const raw = String(value || "").trim();
  return STATUS_MAP[raw] || STATUS_MAP[raw.toUpperCase()] || raw.toUpperCase();
}

/**
 * Build Room Folios href with booking id query param only.
 * @param {string} bookingId
 * @returns {string}
 */
export function buildRoomFoliosCheckoutHref(bookingId) {
  const id = String(bookingId || "").trim();
  if (!id) return ROOM_FOLIOS_PATH;
  const params = new URLSearchParams();
  params.set(ROOM_FOLIO_BOOKING_QUERY, id);
  return `${ROOM_FOLIOS_PATH}?${params.toString()}`;
}

/**
 * Resolve booking id from router search params and/or location state.
 * Prefers query param; state is a supported alternate. Never reads guest PII.
 * @param {{ searchParams?: URLSearchParams | null, locationState?: object | null }} input
 * @returns {string|null}
 */
export function resolveRoomFolioFocusBookingId({
  searchParams = null,
  locationState = null,
} = {}) {
  const fromQuery = String(
    searchParams?.get?.(ROOM_FOLIO_BOOKING_QUERY) || "",
  ).trim();
  const fromState = String(locationState?.bookingId || "").trim();
  const id = fromQuery || fromState;
  if (!id) return null;
  // Soft guard: reject empty / absurd values; do not invent ids.
  if (id.length < 8 || id.length > 64) return null;
  if (/\s/.test(id)) return null;
  return id;
}

/**
 * Decide how Folio page should react to a deep-linked booking.
 * Does not perform checkout.
 */
export function evaluateRoomFolioFocusBooking({
  bookingId,
  booking,
  bookingsLoaded,
}) {
  if (!bookingId) {
    return { action: "none" };
  }
  if (!bookingsLoaded) {
    return { action: "wait", bookingId };
  }
  if (!booking) {
    return {
      action: "error",
      bookingId,
      message:
        "That booking was not found on Room Booking. It may be outside this restaurant or no longer listed.",
    };
  }
  const canonical = canonicalizeBookingStatus(booking.bookingStatus);

  if (canonical !== "CHECKED_IN") {
    return {
      action: "open-with-warning",
      bookingId,
      bookingStatus: canonical,
      message:
        canonical === "CONFIRMED"
          ? "Guest must be checked in before checkout. Review the folio if needed."
          : `Checkout is only available for checked-in stays (current status: ${canonical || "unknown"}).`,
    };
  }
  return { action: "open", bookingId, bookingStatus: canonical };
}
