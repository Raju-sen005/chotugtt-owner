/**
 * Canonical TanStack Query keys for ChotuGTT Room Management.
 * Always use these prefixes so invalidateQueries hits every consumer.
 */

export const roomMgmtKeys = Object.freeze({
  /** Prefix: matches ["rooms", restaurantId] */
  rooms: () => ["rooms"],
  roomsByRestaurant: (restaurantId) => ["rooms", restaurantId],

  /** Prefix: matches ["room-bookings", restaurantId] */
  bookings: () => ["room-bookings"],
  bookingsByRestaurant: (restaurantId) => ["room-bookings", restaurantId],

  /** Prefix: matches ["room-availability", restaurantId, checkIn, checkOut] */
  availability: () => ["room-availability"],
  availabilityByRestaurant: (restaurantId) => [
    "room-availability",
    restaurantId,
  ],

  /** Prefix: matches ["room-folio", restaurantId, bookingId] */
  folio: () => ["room-folio"],
  folioByBooking: (restaurantId, bookingId) => [
    "room-folio",
    restaurantId,
    bookingId,
  ],

  /** Prefix: matches ["room-folio-summaries", restaurantId, ...] */
  folioSummaries: () => ["room-folio-summaries"],
  folioSummariesByRestaurant: (restaurantId) => [
    "room-folio-summaries",
    restaurantId,
  ],

  /** Prefix: matches ["guests", restaurantId, ...] including booking-picker */
  guests: () => ["guests"],
  guestsByRestaurant: (restaurantId) => ["guests", restaurantId],

  guest: (restaurantId, guestId) => ["guest", restaurantId, guestId],
  guestDocuments: (restaurantId, guestId) => [
    "guest-documents",
    restaurantId,
    guestId,
  ],
  guestBookings: (restaurantId, guestId) => [
    "guest-bookings",
    restaurantId,
    guestId,
  ],

  /** Live orders — only when folio/food linkage changes */
  orders: () => ["orders"],
});
