/**
 * Label: Unit / source-contract
 * Live Orders — room folio vs table Generate Bill helpers and UI wiring.
 *
 * Run: node --test src/features/orders/roomOrderLive.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isRoomFolioOrder,
  orderPlaceLabel,
  orderTypeLabel,
  roomNumberFromOrder,
} from "./roomOrderLive.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("[Unit] roomOrderLive helpers", () => {
  it("identifies ROOM_QR and roomBookingId orders", () => {
    assert.equal(isRoomFolioOrder({ orderSource: "ROOM_QR" }), true);
    assert.equal(
      isRoomFolioOrder({ roomBookingId: "507f1f77bcf86cd799439011" }),
      true,
    );
    assert.equal(
      isRoomFolioOrder({ orderSource: "TABLE_QR", tableNumber: "7" }),
      false,
    );
  });

  it("labels room place and type from ROOM-n tableNumber", () => {
    const order = {
      orderSource: "ROOM_QR",
      tableNumber: "ROOM-12",
      roomBookingId: "507f1f77bcf86cd799439011",
    };
    assert.equal(roomNumberFromOrder(order), "12");
    assert.equal(orderPlaceLabel(order), "ROOM 12");
    assert.equal(orderTypeLabel(order), "Room order");
  });

  it("preserves table / parcel labels for non-room orders", () => {
    assert.equal(orderPlaceLabel({ tableNumber: "4" }), "TABLE 4");
    assert.equal(orderPlaceLabel({ tableNumber: "PARCEL" }), "PARCEL");
    assert.equal(orderTypeLabel({ tableNumber: "PARCEL" }), "Counter Parcel");
    assert.equal(orderTypeLabel({ tableNumber: "2" }), "Dine In");
  });
});

describe("[Unit/Source] LiveOrderMonitor room billing UX", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "LiveOrderMonitor.jsx"),
    "utf8",
  );

  it("hides Generate Bill for room orders and offers Release to Room Folio", () => {
    assert.match(source, /isRoomFolioOrder/);
    assert.match(source, /complete-for-folio/);
    assert.match(source, /Release to Room Folio/);
    assert.match(source, /handleCompleteForFolio/);
    assert.match(source, /!roomOrder/);
    assert.match(source, /!isRoomFolioOrder\(detailOrder\)/);
  });

  it("guards handleBillAndWhatsApp against room orders", () => {
    assert.match(
      source,
      /Room orders settle on the Room Folio/,
    );
  });
});
