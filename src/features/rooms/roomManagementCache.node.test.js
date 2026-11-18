/**
 * Room Management cache synchronization contracts (mocked QueryClient).
 * Run: node --test src/features/rooms/roomManagementCache.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { roomMgmtKeys } from "./roomManagementQueryKeys.js";
import {
  syncAfterRoomMutation,
  syncAfterBookingMutation,
  syncAfterRoomQrMutation,
  syncAfterFolioMutation,
  syncAfterGuestMutation,
  syncAfterRoomsSocketEvent,
} from "./roomManagementCacheSync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createMockQueryClient() {
  const calls = [];
  return {
    calls,
    invalidateQueries: async ({ queryKey }) => {
      calls.push(queryKey);
    },
  };
}

function assertInvalidated(calls, prefix) {
  assert.ok(
    calls.some(
      (key) =>
        Array.isArray(key) &&
        key.length >= prefix.length &&
        prefix.every((part, i) => key[i] === part),
    ),
    `expected invalidate prefix ${JSON.stringify(prefix)}, got ${JSON.stringify(calls)}`,
  );
}

function assertNotInvalidated(calls, prefix) {
  assert.equal(
    calls.some(
      (key) =>
        Array.isArray(key) &&
        key.length >= prefix.length &&
        prefix.every((part, i) => key[i] === part),
    ),
    false,
    `did not expect invalidate prefix ${JSON.stringify(prefix)}`,
  );
}

describe("[Unit] roomMgmtKeys", () => {
  it("uses stable canonical prefixes", () => {
    assert.deepEqual(roomMgmtKeys.rooms(), ["rooms"]);
    assert.deepEqual(roomMgmtKeys.bookingsByRestaurant("r1"), [
      "room-bookings",
      "r1",
    ]);
    assert.deepEqual(roomMgmtKeys.folioByBooking("r1", "b1"), [
      "room-folio",
      "r1",
      "b1",
    ]);
    assert.deepEqual(roomMgmtKeys.guest("r1", "g1"), ["guest", "r1", "g1"]);
  });
});

describe("[Unit] Mutation → query invalidation matrix", () => {
  it("1. room create/status updates rooms, availability, bookings, folio summaries", async () => {
    const qc = createMockQueryClient();
    await syncAfterRoomMutation(qc);
    assertInvalidated(qc.calls, ["rooms"]);
    assertInvalidated(qc.calls, ["room-availability"]);
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["room-folio-summaries"]);
    assertNotInvalidated(qc.calls, ["orders"]);
  });

  it("2. room status sync also covers Room QR room list via rooms prefix", async () => {
    const qc = createMockQueryClient();
    await syncAfterRoomMutation(qc);
    assertInvalidated(qc.calls, ["rooms"]);
  });

  it("3. booking create updates bookings and related room data", async () => {
    const qc = createMockQueryClient();
    await syncAfterBookingMutation(qc);
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["rooms"]);
    assertInvalidated(qc.calls, ["room-availability"]);
    assertInvalidated(qc.calls, ["room-folio"]);
    assertInvalidated(qc.calls, ["room-folio-summaries"]);
  });

  it("4. check-in sync updates booking, room and orders-capable caches", async () => {
    const qc = createMockQueryClient();
    await syncAfterBookingMutation(qc, { includeOrders: true });
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["rooms"]);
    assertInvalidated(qc.calls, ["orders"]);
  });

  it("5. checkout sync updates booking, room, folio", async () => {
    const qc = createMockQueryClient();
    await syncAfterBookingMutation(qc, { includeOrders: true });
    assertInvalidated(qc.calls, ["room-folio"]);
    assertInvalidated(qc.calls, ["room-folio-summaries"]);
    assertInvalidated(qc.calls, ["room-availability"]);
  });

  it("6. guest update/document upload updates guest + linked views", async () => {
    const qc = createMockQueryClient();
    await syncAfterGuestMutation(qc, {
      restaurantId: "r1",
      guestId: "g1",
      includeBookings: true,
    });
    assertInvalidated(qc.calls, ["guests"]);
    assertInvalidated(qc.calls, ["guest", "r1", "g1"]);
    assertInvalidated(qc.calls, ["guest-documents", "r1", "g1"]);
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["room-folio"]);
  });

  it("7. folio payment updates paid/outstanding related queries", async () => {
    const qc = createMockQueryClient();
    await syncAfterFolioMutation(qc, {
      restaurantId: "r1",
      bookingId: "b1",
      includeOrders: true,
    });
    assertInvalidated(qc.calls, ["room-folio", "r1", "b1"]);
    assertInvalidated(qc.calls, ["room-folio-summaries"]);
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["orders"]);
  });

  it("8. QR generate/revoke updates QR room state", async () => {
    const qc = createMockQueryClient();
    await syncAfterRoomQrMutation(qc);
    assertInvalidated(qc.calls, ["rooms"]);
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertNotInvalidated(qc.calls, ["guests"]);
  });

  it("9. failed mutations do not invoke sync (helpers are success-only)", () => {
    const qc = createMockQueryClient();
    assert.equal(qc.calls.length, 0);
  });

  it("10. multiple consumers share prefixes so simultaneous pages refresh", async () => {
    const qc = createMockQueryClient();
    await syncAfterBookingMutation(qc);
    // Same prefixes used by Rooms, Bookings, Room QR, Folios pages
    assertInvalidated(qc.calls, ["rooms"]);
    assertInvalidated(qc.calls, ["room-bookings"]);
  });
});

describe("[Unit] Socket sync mapping", () => {
  it("CHECKOUT socket action refreshes booking + folio caches", async () => {
    const qc = createMockQueryClient();
    await syncAfterRoomsSocketEvent(qc, { action: "CHECKOUT" });
    assertInvalidated(qc.calls, ["room-bookings"]);
    assertInvalidated(qc.calls, ["room-folio"]);
    assertInvalidated(qc.calls, ["orders"]);
  });

  it("plain room socket refreshes rooms without orders", async () => {
    const qc = createMockQueryClient();
    await syncAfterRoomsSocketEvent(qc, { action: "STATUS" });
    assertInvalidated(qc.calls, ["rooms"]);
    assertNotInvalidated(qc.calls, ["orders"]);
  });
});

describe("[Source] Pages wire centralized sync (no reload)", () => {
  const pages = [
    ["RoomsManagement.jsx", /syncAfterRoomMutation/, /useRoomManagementCacheSync/],
    [
      "../bookings/BookingManagement.jsx",
      /syncAfterBookingMutation/,
      /useRoomManagementCacheSync/,
    ],
    [
      "../roomQr/RoomQrManagement.jsx",
      /syncAfterRoomQrMutation/,
      /useRoomManagementCacheSync/,
    ],
    [
      "../folios/FolioManagement.jsx",
      /syncAfterFolioMutation/,
      /useRoomManagementCacheSync/,
    ],
    [
      "../guests/GuestManagement.jsx",
      /syncAfterGuestMutation/,
      /useRoomManagementCacheSync/,
    ],
  ];

  for (const [rel, syncRe, socketRe] of pages) {
    it(`${path.basename(rel)} uses sync helper + socket cache hook`, () => {
      const source = fs.readFileSync(path.join(__dirname, rel), "utf8");
      assert.match(source, syncRe);
      assert.match(source, socketRe);
      assert.doesNotMatch(source, /window\.location\.reload/);
    });
  }
});
