/**
 * Bookings → Room Folios checkout navigation contracts.
 * Run: node --test src/features/bookings/bookingsCheckoutNav.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOM_FOLIOS_PATH,
  ROOM_FOLIO_BOOKING_QUERY,
  buildRoomFoliosCheckoutHref,
  resolveRoomFolioFocusBookingId,
  evaluateRoomFolioFocusBooking,
} from "./bookingsCheckoutNav.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("[Unit] buildRoomFoliosCheckoutHref", () => {
  it("navigates with bookingId query only (no PII)", () => {
    const href = buildRoomFoliosCheckoutHref("507f1f77bcf86cd799439011");
    assert.equal(
      href,
      `${ROOM_FOLIOS_PATH}?${ROOM_FOLIO_BOOKING_QUERY}=507f1f77bcf86cd799439011`,
    );
    assert.doesNotMatch(href, /phone|mobile|guest|customer|name/i);
  });

  it("returns base path when booking id missing", () => {
    assert.equal(buildRoomFoliosCheckoutHref(""), ROOM_FOLIOS_PATH);
    assert.equal(buildRoomFoliosCheckoutHref(null), ROOM_FOLIOS_PATH);
  });
});

describe("[Unit] resolveRoomFolioFocusBookingId", () => {
  it("prefers query param over location state", () => {
    const params = new URLSearchParams(
      `${ROOM_FOLIO_BOOKING_QUERY}=507f1f77bcf86cd799439011`,
    );
    assert.equal(
      resolveRoomFolioFocusBookingId({
        searchParams: params,
        locationState: { bookingId: "aaaaaaaaaaaaaaaaaaaaaaaa" },
      }),
      "507f1f77bcf86cd799439011",
    );
  });

  it("falls back to location state bookingId", () => {
    assert.equal(
      resolveRoomFolioFocusBookingId({
        searchParams: new URLSearchParams(),
        locationState: { bookingId: "507f1f77bcf86cd799439011" },
      }),
      "507f1f77bcf86cd799439011",
    );
  });

  it("returns null for missing or invalid ids", () => {
    assert.equal(
      resolveRoomFolioFocusBookingId({
        searchParams: new URLSearchParams(),
        locationState: null,
      }),
      null,
    );
    assert.equal(
      resolveRoomFolioFocusBookingId({
        searchParams: new URLSearchParams(`${ROOM_FOLIO_BOOKING_QUERY}=abc`),
      }),
      null,
    );
    assert.equal(
      resolveRoomFolioFocusBookingId({
        searchParams: new URLSearchParams(
          `${ROOM_FOLIO_BOOKING_QUERY}=bad id with spaces`,
        ),
      }),
      null,
    );
  });
});

describe("[Unit] evaluateRoomFolioFocusBooking", () => {
  it("waits until bookings are loaded", () => {
    assert.deepEqual(
      evaluateRoomFolioFocusBooking({
        bookingId: "507f1f77bcf86cd799439011",
        booking: null,
        bookingsLoaded: false,
      }),
      { action: "wait", bookingId: "507f1f77bcf86cd799439011" },
    );
  });

  it("errors when booking id is missing from list", () => {
    const result = evaluateRoomFolioFocusBooking({
      bookingId: "507f1f77bcf86cd799439011",
      booking: null,
      bookingsLoaded: true,
    });
    assert.equal(result.action, "error");
    assert.match(result.message, /not found/i);
  });

  it("opens folio for CHECKED_IN booking without auto-checkout", () => {
    const result = evaluateRoomFolioFocusBooking({
      bookingId: "507f1f77bcf86cd799439011",
      booking: { bookingStatus: "CHECKED_IN" },
      bookingsLoaded: true,
    });
    assert.equal(result.action, "open");
    assert.equal(result.bookingId, "507f1f77bcf86cd799439011");
  });

  it("opens with warning when booking is not eligible for checkout", () => {
    const result = evaluateRoomFolioFocusBooking({
      bookingId: "507f1f77bcf86cd799439011",
      booking: { bookingStatus: "CONFIRMED" },
      bookingsLoaded: true,
    });
    assert.equal(result.action, "open-with-warning");
    assert.match(result.message, /checked in/i);
  });

  it("does nothing when booking id absent (normal Room Booking open)", () => {
    assert.deepEqual(
      evaluateRoomFolioFocusBooking({
        bookingId: null,
        booking: null,
        bookingsLoaded: true,
      }),
      { action: "none" },
    );
  });
});

describe("[Source] Bookings Checkout navigates; no checkout API", () => {
  it("Checkout button navigates to room-folios and does not call checkout API", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "BookingManagement.jsx"),
      "utf8",
    );
    assert.match(source, /buildRoomFoliosCheckoutHref/);
    assert.match(source, /goToRoomFolioCheckout/);
    assert.match(source, /intent:\s*"checkout"/);
    assert.doesNotMatch(
      source,
      /setConfirmAction\(\{\s*type:\s*"checkout"/,
    );
    assert.doesNotMatch(source, /checkoutMutation/);
    assert.doesNotMatch(
      source,
      /api\.post\(`\/rooms\/\$\{roomId\}\/checkout`/,
    );
    assert.doesNotMatch(source, /Confirm checkout\?/);
  });
});

describe("[Source] FolioManagement auto-selects deep-linked booking", () => {
  it("reads bookingId and opens folio without silent checkout", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../folios/FolioManagement.jsx"),
      "utf8",
    );
    assert.match(source, /resolveRoomFolioFocusBookingId/);
    assert.match(source, /evaluateRoomFolioFocusBooking/);
    assert.match(source, /setSelectedBookingId\(focusId\)/);
    assert.doesNotMatch(
      source,
      /evaluateRoomFolioFocusBooking[\s\S]{0,400}checkoutMutation/,
    );
    // Checkout API remains available on folio page itself (manual confirm)
    assert.match(source, /\/rooms\/\$\{roomId\}\/checkout/);
  });
});
