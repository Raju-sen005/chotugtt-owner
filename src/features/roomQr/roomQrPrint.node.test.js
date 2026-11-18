/**
 * Label: Unit
 * Room QR print HTML + handler contracts (no browser, no network).
 *
 * Run: node --test src/features/roomQr/roomQrPrint.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRoomQrPrintHtml,
  escapeHtml,
  printRoomQrFromCanvas,
} from "./roomQrPrint.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("[Unit] escapeHtml", () => {
  it("escapes markup characters", () => {
    assert.equal(
      escapeHtml(`Room <101> & "VIP"`),
      "Room &lt;101&gt; &amp; &quot;VIP&quot;",
    );
  });
});

describe("[Unit] buildRoomQrPrintHtml", () => {
  it("includes ChotuGTT branding, room number, QR image, A4 CSS, and guest hint", () => {
    const html = buildRoomQrPrintHtml({
      restaurantName: `Joe's <Inn>`,
      roomNumber: "12",
      dataUrl: "data:image/png;base64,abc",
    });
    assert.match(html, /ChotuGTT/);
    assert.match(html, /Joe&#039;s &lt;Inn&gt;/);
    assert.match(html, /Room 12/);
    assert.match(html, /data:image\/png;base64,abc/);
    assert.match(html, /@page \{ size: A4/);
    assert.match(html, /Scan this QR/);
    assert.match(html, /id="qr-img"/);
    assert.doesNotMatch(html, /booking/i);
    assert.doesNotMatch(html, /token/i);
  });
});

describe("[Unit] printRoomQrFromCanvas", () => {
  it("rejects missing public URL without opening a window", () => {
    let opened = false;
    const result = printRoomQrFromCanvas({
      canvas: { toDataURL: () => "data:image/png;base64,x" },
      publicUrl: "",
      roomNumber: "1",
      restaurantName: "Test",
      openWindow: () => {
        opened = true;
        return null;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "MISSING_PUBLIC_URL");
    assert.equal(opened, false);
  });

  it("rejects when canvas is not ready", () => {
    const result = printRoomQrFromCanvas({
      canvas: null,
      publicUrl: "https://app.example.com/room-menu/tok",
      roomNumber: "1",
      restaurantName: "Test",
      openWindow: () => ({ document: { open() {}, write() {}, close() {} } }),
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "QR_NOT_READY");
  });

  it("reports popup blocked", () => {
    const result = printRoomQrFromCanvas({
      canvas: { toDataURL: () => "data:image/png;base64,x" },
      publicUrl: "https://app.example.com/room-menu/tok",
      roomNumber: "9",
      restaurantName: "Test",
      openWindow: () => null,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, "POPUP_BLOCKED");
  });

  it("writes printable HTML without noopener features that null the window", () => {
    const writes = [];
    let featuresArg = null;
    const result = printRoomQrFromCanvas({
      canvas: { toDataURL: () => "data:image/png;base64,PRINTME" },
      publicUrl: "https://app.example.com/room-menu/stable-token",
      roomNumber: "7",
      restaurantName: "Chotu Inn",
      openWindow: (_url, _target, features) => {
        featuresArg = features;
        return {
          document: {
            open() {},
            write(html) {
              writes.push(html);
            },
            close() {},
          },
        };
      },
    });
    assert.equal(result.ok, true);
    assert.ok(featuresArg);
    assert.doesNotMatch(String(featuresArg), /noopener/);
    assert.equal(writes.length, 1);
    assert.match(writes[0], /data:image\/png;base64,PRINTME/);
    assert.match(writes[0], /Room 7/);
    assert.match(writes[0], /Chotu Inn/);
  });
});

describe("[Source] RoomQrManagement print wiring", () => {
  it("uses printRoomQrFromCanvas and does not open with noopener", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "RoomQrManagement.jsx"),
      "utf8",
    );
    assert.match(source, /printRoomQrFromCanvas/);
    assert.doesNotMatch(
      source,
      /window\.open\([^)]*noopener/,
    );
  });
});
