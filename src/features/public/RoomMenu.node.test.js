import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { roomOrderingStatusMeta } from "./roomMenuUx.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "RoomMenu.jsx"), "utf8");

describe("[Source] RoomMenu premium guest UX contracts", () => {
  it("keeps existing Room QR API contracts", () => {
    assert.match(source, /\/public\/room-menu\//);
    assert.match(source, /customer\/room-session/);
    assert.match(source, /\/orders\/place/);
    assert.match(source, /Idempotency-Key/);
    assert.match(source, /withCredentials:\s*true/);
    assert.match(source, /isRoomOrderingUiEnabled/);
    assert.match(source, /guestBannerFromRoomOrdering/);
  });

  it("asks for guest details on first stay and reuses Ordering as on repeat", () => {
    assert.match(source, /setCustomerName\(""\)/);
    assert.match(source, /setCustomerPhone\(""\)/);
    assert.match(source, /\[roomQrToken\]/);
    assert.match(source, /placeholder="Your name"/);
    assert.match(source, /Guest details/);
    assert.match(source, /formatOrderingAsLabel/);
    assert.match(source, /Change Details/);
    assert.match(source, /identityKnown/);
    assert.doesNotMatch(source, /localStorage\.|sessionStorage\./);
  });

  it("covers loading, empty, unavailable and auth states", () => {
    assert.match(source, /LoadingSkeleton/);
    assert.match(source, /EmptyState/);
    assert.match(source, /Unavailable|Not available/);
    assert.match(source, /Browse only/);
    assert.match(source, /DeniedScreen/);
    assert.match(source, /ROOM_QR_REVOKED/);
    assert.match(source, /statusMeta\.label/);
    assert.equal(
      roomOrderingStatusMeta({ orderingEnabled: true, guestMessage: "Hi" })
        .label,
      "Ordering available",
    );
  });

  it("includes search, category rail, sticky cart and submit guard", () => {
    assert.match(source, /Search the menu/);
    assert.match(source, /role="tablist"/);
    assert.match(source, /View cart/);
    assert.match(source, /submittingRef/);
    assert.match(source, /Placing order/);
    assert.match(source, /Order sent/);
  });

  it("does not invent delivery timings or weaken token handling", () => {
    assert.doesNotMatch(source, /\bminutes\b|\barrives in\b|\bETA\b/);
    assert.match(source, /decodeURIComponent\(rawToken\)/);
    assert.doesNotMatch(source, /console\.log\([^)]*roomQrToken/);
  });
});
