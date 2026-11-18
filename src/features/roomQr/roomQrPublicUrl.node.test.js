/**
 * Label: Unit (pure)
 * Phase C — Room QR public URL + ordering UI helpers.
 * Run: node --test src/features/roomQr/roomQrPublicUrl.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveBackendRoomQrPublicUrl,
  isRoomOrderingUiEnabled,
  guestBannerFromRoomOrdering,
} from "./roomQrPublicUrl.js";

describe("[Unit] resolveBackendRoomQrPublicUrl", () => {
  it("1. accepts backend absolute publicUrl", () => {
    const result = resolveBackendRoomQrPublicUrl({
      publicUrl: "https://guest.example.com/room-menu/abc.token",
      path: "/room-menu/abc.token",
    });
    assert.equal(result.ok, true);
    assert.equal(
      result.url,
      "https://guest.example.com/room-menu/abc.token",
    );
  });

  it("2. fails safely when publicUrl missing — no API-origin reconstruction", () => {
    const result = resolveBackendRoomQrPublicUrl({
      path: "/room-menu/abc.token",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROOM_QR_PUBLIC_URL_MISSING");
  });

  it("rejects empty string publicUrl", () => {
    const result = resolveBackendRoomQrPublicUrl({ publicUrl: "   " });
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROOM_QR_PUBLIC_URL_MISSING");
  });

  it("rejects relative path masquerading as publicUrl", () => {
    const result = resolveBackendRoomQrPublicUrl({
      publicUrl: "/room-menu/token",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROOM_QR_PUBLIC_URL_INVALID");
  });

  it("rejects API JSON room-menu path", () => {
    const result = resolveBackendRoomQrPublicUrl({
      publicUrl: "https://api.example.com/public/room-menu/token",
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "ROOM_QR_PUBLIC_URL_INVALID");
  });
});

describe("[Unit] ordering UI flags from roomOrdering", () => {
  it("3. pre-check-in: ordering disabled", () => {
    assert.equal(
      isRoomOrderingUiEnabled({
        orderingEnabled: false,
        guestMessage: "Welcome! You can browse...",
      }),
      false,
    );
  });

  it("4. checked-in occupied: ordering enabled", () => {
    assert.equal(
      isRoomOrderingUiEnabled({
        orderingEnabled: true,
        roomNumber: "101",
      }),
      true,
    );
  });

  it("5. checkout/cleaning message path keeps ordering disabled", () => {
    assert.equal(
      isRoomOrderingUiEnabled({
        orderingEnabled: false,
        roomStatus: "CLEANING",
        guestMessage:
          "Your room ordering access has expired. Please contact reception if you need assistance.",
      }),
      false,
    );
    const banner = guestBannerFromRoomOrdering({
      orderingEnabled: false,
      guestMessage:
        "Your room ordering access has expired. Please contact reception if you need assistance.",
    });
    assert.match(banner, /expired/i);
  });

  it("guest banner prefers backend guestMessage", () => {
    const msg = guestBannerFromRoomOrdering({
      orderingEnabled: true,
      roomNumber: "205",
      guestMessage: "Welcome to Room 205! You can browse the menu and order food during your stay.",
    });
    assert.match(msg, /Room 205/);
  });
});
