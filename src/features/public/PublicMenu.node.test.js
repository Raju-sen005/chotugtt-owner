import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "PublicMenu.jsx"), "utf8");

describe("[Source] PublicMenu premium Table QR UX contracts", () => {
  it("keeps existing Table QR API contracts", () => {
    assert.match(source, /\/menu\/public\/catalog\//);
    assert.match(source, /\/customer\/session/);
    assert.match(source, /\/orders\/place/);
    assert.match(source, /Idempotency-Key/);
    assert.match(source, /withCredentials:\s*true/);
    assert.match(source, /tableToken/);
  });

  it("asks for guest details on first visit and reuses Ordering as on repeat", () => {
    assert.match(source, /setCustomerName\(""\)/);
    assert.match(source, /setCustomerPhone\(""\)/);
    assert.match(source, /\[tableToken,\s*restaurantId\]/);
    assert.match(source, /tableToken \? \{ tableToken \}/);
    assert.match(source, /placeholder=\{t\("fullName"\)\}/);
    assert.match(source, /formatOrderingAsLabel/);
    assert.match(source, /Change Details/);
    assert.match(source, /identityKnown/);
    assert.match(source, /Enter your details once for this table visit/);
  });

  it("covers loading, empty, error, search and categories", () => {
    assert.match(source, /MenuSkeleton/);
    assert.match(source, /noDishes/);
    assert.match(source, /Menu Not Available/);
    assert.match(source, /Search menu/);
    assert.match(source, /role="tablist"/);
    assert.match(source, /View cart/);
  });

  it("guards duplicate submit and unavailable items", () => {
    assert.match(source, /submittingRef/);
    assert.match(source, /isItemAvailable/);
    assert.match(source, /Unavailable/);
  });

  it("does not invent prep timings on success", () => {
    assert.doesNotMatch(source, /~20-25\s*mins/);
    assert.match(source, /orderConfirmedTitle/);
    assert.match(source, /Your order has been sent to the kitchen/);
  });

  it("does not modify Room QR flow", () => {
    assert.doesNotMatch(source, /roomQrToken|room-session|RoomMenu/);
  });
});
