import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareRoomNumberStrings,
  compareRoomsByNumber,
  formatRoomLabel,
  getRoomNumberValue,
  normalizeRoomNumberForSort,
  sortRoomRowsByNumber,
  sortRoomsByNumber,
  tokenizeRoomNumber,
} from "./roomsAccess.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function numbersOf(rooms) {
  return rooms.map((r) => getRoomNumberValue(r));
}

function identitiesOf(rooms) {
  return rooms.map((r) => normalizeRoomNumberForSort(getRoomNumberValue(r)));
}

/**
 * Mirrors sanitizeRoom + GET /rooms shape (createdAt desc = unsorted by number).
 * Actual local data stored roomNumber as "Room 101" etc. → UI showed "Room Room 101".
 */
function apiRoom({
  id,
  roomNumber,
  status = "AVAILABLE",
  roomType = "Standard",
  createdAt,
}) {
  return {
    _id: id,
    id: String(id),
    restaurantId: "rest_demo",
    roomNumber,
    roomType,
    pricePerNight: 1500,
    capacity: 2,
    status,
    description: "",
    createdAt,
    updatedAt: createdAt,
  };
}

/** Exact wrong UI order reported from /rooms and /room-qr screenshots. */
const SCREENSHOT_API_ORDER = [
  apiRoom({
    id: "id102",
    roomNumber: "Room 102",
    createdAt: "2026-11-18T10:00:00.000Z",
  }),
  apiRoom({
    id: "id103",
    roomNumber: "Room 103",
    createdAt: "2026-11-18T09:00:00.000Z",
  }),
  apiRoom({
    id: "id104",
    roomNumber: "Room 104",
    createdAt: "2026-11-18T08:00:00.000Z",
  }),
  apiRoom({
    id: "id101",
    roomNumber: "Room 101",
    createdAt: "2026-11-18T07:00:00.000Z",
  }),
  apiRoom({
    id: "id105",
    roomNumber: "Room 105",
    createdAt: "2026-11-18T06:00:00.000Z",
  }),
];

describe("[Unit] room number natural sort", () => {
  it("reads the actual roomNumber field (string or number)", () => {
    assert.equal(getRoomNumberValue({ roomNumber: "101" }), "101");
    assert.equal(getRoomNumberValue({ roomNumber: 101 }), "101");
    assert.equal(getRoomNumberValue({ number: "101" }), "");
    assert.equal(getRoomNumberValue(null), "");
    assert.equal(getRoomNumberValue({ roomNumber: "  12A " }), "12A");
  });

  it("strips Room prefix for sort only; formatRoomLabel avoids Room Room", () => {
    assert.equal(normalizeRoomNumberForSort("Room 101"), "101");
    assert.equal(normalizeRoomNumberForSort("Room Room 105"), "105");
    assert.equal(normalizeRoomNumberForSort(101), "101");
    assert.equal(formatRoomLabel({ roomNumber: "Room 101" }), "Room 101");
    assert.equal(formatRoomLabel({ roomNumber: "101" }), "Room 101");
    assert.equal(formatRoomLabel({ roomNumber: "Room Room 105" }), "Room 105");
    assert.equal(formatRoomLabel(null), "Room —");
  });

  it("regression: API order 102,103,104,101,105 → 101…105 (Room-prefixed)", () => {
    assert.deepEqual(identitiesOf(SCREENSHOT_API_ORDER), [
      "102",
      "103",
      "104",
      "101",
      "105",
    ]);
    const sorted = sortRoomsByNumber(SCREENSHOT_API_ORDER);
    assert.deepEqual(identitiesOf(sorted), [
      "101",
      "102",
      "103",
      "104",
      "105",
    ]);
    assert.deepEqual(
      sorted.map((r) => formatRoomLabel(r)),
      ["Room 101", "Room 102", "Room 103", "Room 104", "Room 105"],
    );
    // Stored values unchanged.
    assert.equal(sorted[0].roomNumber, "Room 101");
  });

  it("orders classic hotel blocks and 1,2,10,11 numerically", () => {
    assert.deepEqual(
      identitiesOf(
        sortRoomsByNumber([
          { _id: "c", roomNumber: "301" },
          { _id: "a", roomNumber: "102" },
          { _id: "b", roomNumber: "101" },
          { _id: "f", roomNumber: "201" },
        ]),
      ),
      ["101", "102", "201", "301"],
    );
    assert.deepEqual(
      identitiesOf(
        sortRoomsByNumber([
          { _id: "d", roomNumber: "11" },
          { _id: "a", roomNumber: "1" },
          { _id: "c", roomNumber: "10" },
          { _id: "b", roomNumber: "2" },
        ]),
      ),
      ["1", "2", "10", "11"],
    );
  });

  it("supports alphanumeric and mixed numeric/string roomNumber types", () => {
    assert.ok(tokenizeRoomNumber("A-10B2").length >= 3);
    const sorted = sortRoomsByNumber([
      { _id: "3", roomNumber: "B2" },
      { _id: "1", roomNumber: "A10" },
      { _id: "2", roomNumber: "A2" },
      { _id: "4", roomNumber: 10 },
      { _id: "5", roomNumber: 2 },
      { _id: "6", roomNumber: "Room 3" },
    ]);
    assert.deepEqual(identitiesOf(sorted), ["2", "3", "10", "A2", "A10", "B2"]);
  });

  it("falls back stably for missing / duplicate room numbers", () => {
    assert.equal(compareRoomNumberStrings("", "101"), 1);
    const sorted = sortRoomsByNumber([
      { _id: "z", roomNumber: "" },
      { _id: "a", roomNumber: "Room 101" },
      { _id: "m", roomNumber: null },
      { _id: "b", roomNumber: "101" },
      { _id: "c", roomNumber: "102" },
    ]);
    assert.deepEqual(identitiesOf(sorted), ["101", "101", "102", "", ""]);
    assert.equal(sorted[0]._id, "a");
    assert.equal(sorted[1]._id, "b");
    assert.equal(compareRoomsByNumber(sorted[0], sorted[1]) < 0, true);
  });

  it("preserves natural order after search/filter and after cache refresh", () => {
    const all = sortRoomsByNumber(SCREENSHOT_API_ORDER);
    const bySearch = sortRoomsByNumber(
      all.filter((room) =>
        normalizeRoomNumberForSort(room.roomNumber).startsWith("10"),
      ),
    );
    assert.deepEqual(identitiesOf(bySearch), ["101", "102", "103", "104", "105"]);

    const deluxeOnly = sortRoomsByNumber(
      [
        ...SCREENSHOT_API_ORDER,
        apiRoom({
          id: "id201",
          roomNumber: "Room 201",
          roomType: "Deluxe",
          createdAt: "2026-11-18T05:00:00.000Z",
        }),
      ].filter((r) => r.roomType === "Deluxe"),
    );
    assert.deepEqual(identitiesOf(deluxeOnly), ["201"]);

    // Simulate React Query refresh returning a new array in API order.
    const refreshed = SCREENSHOT_API_ORDER.map((r) => ({ ...r }));
    assert.deepEqual(
      identitiesOf(sortRoomsByNumber(refreshed)),
      ["101", "102", "103", "104", "105"],
    );
  });

  it("Room Management and Room QR produce identical final visible ordering", () => {
    const managementOrder = sortRoomsByNumber(SCREENSHOT_API_ORDER).map(
      (r) => r.id,
    );
    const qrOrder = sortRoomRowsByNumber(
      SCREENSHOT_API_ORDER.map((room) => ({
        room,
        booking: null,
        qrStatus: "NONE",
        eligible: true,
      })),
    ).map((row) => row.room.id);
    assert.deepEqual(managementOrder, qrOrder);
    assert.deepEqual(managementOrder, [
      "id101",
      "id102",
      "id103",
      "id104",
      "id105",
    ]);
  });
});

describe("[Source] Room Management + Room QR share the same sort + label helpers", () => {
  it("both pages sort final visible lists and use formatRoomLabel", () => {
    const roomsPage = readFileSync(
      join(__dirname, "RoomsManagement.jsx"),
      "utf8",
    );
    const qrPage = readFileSync(
      join(__dirname, "../roomQr/RoomQrManagement.jsx"),
      "utf8",
    );
    const access = readFileSync(join(__dirname, "roomsAccess.js"), "utf8");

    assert.match(access, /export function sortRoomsByNumber/);
    assert.match(access, /export function sortRoomRowsByNumber/);
    assert.match(access, /export function formatRoomLabel/);
    assert.match(access, /normalizeRoomNumberForSort/);

    assert.match(roomsPage, /sortRoomsByNumber/);
    assert.match(roomsPage, /formatRoomLabel/);
    assert.doesNotMatch(roomsPage, /Room \{room\.roomNumber\}/);
    assert.doesNotMatch(
      roomsPage,
      /localeCompare\([\s\S]{0,80}numeric:\s*true/,
    );

    assert.match(qrPage, /sortRoomsByNumber/);
    assert.match(qrPage, /sortRoomRowsByNumber/);
    assert.match(qrPage, /formatRoomLabel/);
    assert.doesNotMatch(qrPage, /Room \{room\.roomNumber\}/);
    assert.doesNotMatch(
      qrPage,
      /localeCompare\([\s\S]{0,80}numeric:\s*true/,
    );
  });
});
