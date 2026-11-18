/**
 * Label: Unit / source-contract
 * Early checkout availability UX + Change Stay Dates wiring.
 * Does not import Vite extensionless modules.
 *
 * Run: node --test src/features/bookings/bookingAvailability.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHECKOUT_EXTENSION_ONLY_MESSAGE =
  "Checkout date can only be extended here. For early checkout, use the Checkout action.";

/** Mirrors bookingsAccess helpers without Vite extensionless imports. */
function canEditBookingStay(booking) {
  const status = String(booking?.bookingStatus || "").toUpperCase();
  return status === "CONFIRMED" || status === "CHECKED_IN";
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isCheckoutDateExtended(currentCheckOut, nextCheckOut) {
  const current = toDateInputValue(currentCheckOut);
  const next = String(nextCheckOut || "").trim();
  if (!current || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
    return false;
  }
  return next > current;
}

/** Mirrors updated pickBookableRoomsFromAvailability (synthesize rows). */
function pickBookableRoomsFromAvailability(availabilityRows, rooms) {
  if (!Array.isArray(availabilityRows) || availabilityRows.length === 0) {
    return (rooms || []).filter((room) => {
      const status = String(room?.status || "").toUpperCase();
      return (
        status === "AVAILABLE" ||
        status === "RESERVED" ||
        status === "OCCUPIED"
      );
    });
  }
  const availableRows = availabilityRows.filter((row) => row.available);
  if (availableRows.length === 0) return [];
  const byId = new Map(
    (rooms || []).map((room) => [String(room.id || room._id || ""), room]),
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

describe("[Unit] booking availability helpers (pure mirror)", () => {
  it("pickBookableRoomsFromAvailability uses available flags", () => {
    const rooms = [
      { _id: "r1", status: "AVAILABLE" },
      { _id: "r2", status: "AVAILABLE" },
      { _id: "r3", status: "CLEANING" },
    ];
    const picked = pickBookableRoomsFromAvailability(
      [
        { roomId: "r1", available: true },
        { roomId: "r2", available: false },
        { roomId: "r3", available: false },
      ],
      rooms,
    );
    assert.deepEqual(
      picked.map((r) => r._id),
      ["r1"],
    );
  });

  it("synthesizes bookable rooms from availability rows when inventory missing", () => {
    const picked = pickBookableRoomsFromAvailability(
      [
        {
          roomId: "only-in-availability",
          available: true,
          roomNumber: "9",
          roomType: "Deluxe",
          pricePerNight: 1500,
          capacity: 2,
          status: "AVAILABLE",
        },
      ],
      [],
    );
    assert.equal(picked.length, 1);
    assert.equal(picked[0].roomNumber, "9");
  });

  it("canEditBookingStay only for CONFIRMED / CHECKED_IN", () => {
    assert.equal(canEditBookingStay({ bookingStatus: "CONFIRMED" }), true);
    assert.equal(canEditBookingStay({ bookingStatus: "CHECKED_IN" }), true);
    assert.equal(canEditBookingStay({ bookingStatus: "CHECKED_OUT" }), false);
    assert.equal(canEditBookingStay({ bookingStatus: "CANCELLED" }), false);
  });

  it("isCheckoutDateExtended requires a later calendar checkout", () => {
    assert.equal(
      isCheckoutDateExtended("2026-12-03T12:00:00.000Z", "2026-12-05"),
      true,
    );
    assert.equal(
      isCheckoutDateExtended("2026-12-05T12:00:00.000Z", "2026-12-05"),
      false,
    );
    assert.equal(
      isCheckoutDateExtended("2026-12-05T12:00:00.000Z", "2026-12-04"),
      false,
    );
    assert.equal(
      CHECKOUT_EXTENSION_ONLY_MESSAGE.includes("Checkout action"),
      true,
    );
    assert.equal(toDateInputValue("2026-12-05T12:00:00.000Z"), "2026-12-05");
  });
});

describe("[Unit/Source] BookingManagement + bookingsAccess stay wiring", () => {
  const management = fs.readFileSync(
    path.join(__dirname, "BookingManagement.jsx"),
    "utf8",
  );
  const access = fs.readFileSync(
    path.join(__dirname, "bookingsAccess.js"),
    "utf8",
  );

  it("wires availability API and Change Stay Dates action", () => {
    assert.match(management, /\/rooms\/availability/);
    assert.match(management, /Change Stay Dates/);
    assert.doesNotMatch(management, />\s*Edit Stay\s*</);
    assert.match(management, /bookings\/\$\{bookingId\}\/stay/);
    assert.match(management, /checkedInAt/);
    assert.match(management, /checkedOutAt/);
    assert.match(management, /availabilityEmptyReason/);
    assert.match(management, /formatAvailabilityEmptyMessage/);
    assert.match(management, /CHECKOUT_EXTENSION_ONLY_MESSAGE/);
    assert.match(management, /isCheckoutDateExtended/);
  });

  it("locks check-in date field for CHECKED_IN stay edits", () => {
    assert.match(management, /Check-in date is locked after actual check-in/);
    assert.match(
      management,
      /disabled=\{\s*normalizeBookingStatus\(stayEdit\.bookingStatus\) ===\s*"CHECKED_IN"\s*\}/,
    );
  });

  it("bookingsAccess exports stay/availability helpers", () => {
    assert.match(access, /pickBookableRoomsFromAvailability/);
    assert.match(access, /formatAvailabilityEmptyMessage/);
    assert.match(access, /canEditBookingStay/);
    assert.match(access, /formatBookingDateTime/);
    assert.match(access, /FOLIO_HAS_PAYMENTS/);
    assert.match(access, /CHECKIN_DATE_LOCKED/);
    assert.match(access, /CHECKOUT_EXTENSION_ONLY/);
  });
});
