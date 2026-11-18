/**
 * Label: Unit / source-contract
 * Phase C — merchant QR uses backend publicUrl; room-level revoke;
 * guest route wiring. Does not import Vite extensionless modules.
 *
 * Run: node --test src/features/roomQr/roomQrAccess.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveBackendRoomQrPublicUrl,
} from "./roomQrPublicUrl.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Mirrors mapRoomQrApiData URL gate without importing Vite modules. */
function mapPublicUrlOnly(data) {
  const resolved = resolveBackendRoomQrPublicUrl(data);
  if (!resolved.ok) {
    const error = new Error(resolved.message);
    error.code = resolved.code;
    throw error;
  }
  return resolved.url;
}

describe("[Unit] mapRoomQrApiData URL gate (pure mirror)", () => {
  it("uses backend publicUrl exactly", () => {
    assert.equal(
      mapPublicUrlOnly({
        publicUrl: "https://app.example.com/room-menu/tok.en",
        path: "/room-menu/tok.en",
      }),
      "https://app.example.com/room-menu/tok.en",
    );
  });

  it("throws when publicUrl missing (no silent API fallback)", () => {
    assert.throws(
      () => mapPublicUrlOnly({ path: "/room-menu/x" }),
      (err) => err.code === "ROOM_QR_PUBLIC_URL_MISSING",
    );
  });
});

describe("[Unit/Source] RoomQrManagement + App contracts", () => {
  it("merchant revoke calls POST /rooms/:roomId/qr/revoke only", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "RoomQrManagement.jsx"),
      "utf8",
    );
    assert.match(source, /\/rooms\/\$\{roomId\}\/qr\/revoke/);
    assert.equal(/bookings\/\$\{[^}]+\}\/qr\/revoke/.test(source), false);
    assert.match(source, /mapRoomQrApiData/);
    assert.equal(source.includes("buildPublicRoomMenuUrl(data.path)"), false);
    assert.match(source, /deriveRoomQrStatus/);
  });

  it("roomQrAccess mapRoomQrApiData uses resolveBackendRoomQrPublicUrl", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "roomQrAccess.js"),
      "utf8",
    );
    assert.match(source, /resolveBackendRoomQrPublicUrl/);
    assert.match(source, /export function mapRoomQrApiData/);
    assert.match(source, /deriveRoomQrStatus/);
    // Deprecated helper must not read import.meta.env for reconstruction.
    const deprecated = source.slice(
      source.indexOf("export function buildPublicRoomMenuUrl"),
      source.indexOf("export function mapRoomQrApiData"),
    );
    assert.equal(deprecated.includes("import.meta.env"), false);
  });

  it("7. App.jsx mounts public /room-menu/:token outside AuthGate", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../App.jsx"),
      "utf8",
    );
    assert.match(source, /path="\/room-menu\/:token"/);
    assert.match(source, /RoomMenu/);
    const roomIdx = source.indexOf("/room-menu/:token");
    const catchIdx = source.indexOf('path="/*"');
    assert.ok(roomIdx > 0 && catchIdx > roomIdx);
  });

  it("8. RoomMenu sends roomQrToken and Idempotency-Key", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../public/RoomMenu.jsx"),
      "utf8",
    );
    assert.match(source, /roomQrToken/);
    assert.match(source, /Idempotency-Key/);
    assert.match(source, /\/orders\/place/);
    assert.match(source, /\/public\/room-menu\//);
    assert.match(source, /\/customer\/room-session/);
    assert.equal(/localStorage\.setItem/.test(source), false);
    assert.equal(/sessionStorage\.(set|get)Item/.test(source), false);
    assert.match(source, /orderingEnabled/);
  });
});
