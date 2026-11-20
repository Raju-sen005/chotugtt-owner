/**
 * Label: Unit + Source-contract
 * Phase 2.2 — AuthContext registration features + feature-neutral UX copy.
 * Does not hit HTTP, MongoDB, or browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FEATURE_KEYS,
  getAvailableFeatures,
  hasAvailableFeature,
  getFeatureUnavailableMessage,
  isFeatureNotAvailableError,
} from "./featureAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "../..");

describe("[Unit] Phase 2.2 AuthContext receives registration features", () => {
  it("maps registration payload features the same way as login helpers", () => {
    const registrationUser = {
      role: "OWNER",
      availableFeatures: [FEATURE_KEYS.POS, FEATURE_KEYS.CAPTAIN, FEATURE_KEYS.MENU],
    };
    assert.deepEqual(getAvailableFeatures(registrationUser), [
      FEATURE_KEYS.POS,
      FEATURE_KEYS.CAPTAIN,
      FEATURE_KEYS.MENU,
    ]);
    assert.equal(hasAvailableFeature(registrationUser, FEATURE_KEYS.POS), true);
  });

  it("fail-closes when registration response omits availableFeatures", () => {
    const registrationUser = { role: "OWNER" };
    assert.deepEqual(getAvailableFeatures(registrationUser), []);
    assert.equal(hasAvailableFeature(registrationUser, FEATURE_KEYS.POS), false);
  });

  it("neutral copy helper does not alter entitlement gating", () => {
    const denied = { response: { data: { code: "FEATURE_NOT_AVAILABLE" } } };
    assert.equal(isFeatureNotAvailableError(denied), true);
    assert.equal(
      getFeatureUnavailableMessage(
        denied,
        "This feature is not included in your current plan.",
      ),
      "This feature is not included in your current plan.",
    );
    assert.equal(hasAvailableFeature({ availableFeatures: [] }, FEATURE_KEYS.POS), false);
    assert.equal(
      hasAvailableFeature(
        { availableFeatures: [FEATURE_KEYS.POS] },
        FEATURE_KEYS.POS,
      ),
      true,
    );
  });
});

describe("[Source-contract] Phase 2.2 AuthContext registration wiring", () => {
  it("registerTenant maps availableFeatures onto registrationUser", () => {
    const source = fs.readFileSync(
      path.join(srcRoot, "context/AuthContext.jsx"),
      "utf8",
    );
    assert.match(source, /registrationFeatures/);
    assert.match(source, /availableFeatures:\s*registrationFeatures/);
    assert.match(source, /registeredUser\?\.availableFeatures/);
    assert.match(source, /res\.data\.data\?\.availableFeatures/);
  });
});

describe("[Source-contract] Phase 2.2 feature-neutral UX copy", () => {
  const uxFiles = [
    "features/rooms/RoomsManagement.jsx",
    "features/guests/GuestManagement.jsx",
    "features/bookings/BookingManagement.jsx",
    "features/roomQr/RoomQrManagement.jsx",
    "features/rooms/roomsAccess.js",
    "features/guests/guestsAccess.js",
    "features/bookings/bookingsAccess.js",
    "features/roomQr/roomQrAccess.js",
    "features/folios/folioAccess.js",
    "features/guests/guestProfileDisplay.js",
  ];

  for (const relative of uxFiles) {
    it(`${relative} has no PLUS-required user copy`, () => {
      const source = fs.readFileSync(path.join(srcRoot, relative), "utf8");
      assert.doesNotMatch(source, /PLUS feature required/i);
      assert.doesNotMatch(source, /PLUS subscription required/i);
      assert.doesNotMatch(source, /active PLUS subscription/i);
      assert.doesNotMatch(source, /active PLUS plan/i);
      assert.doesNotMatch(source, /Guest Management \(PLUS\)/);
    });
  }

  it("RoomsManagement blocked state uses neutral plan wording", () => {
    const source = fs.readFileSync(
      path.join(srcRoot, "features/rooms/RoomsManagement.jsx"),
      "utf8",
    );
    assert.match(
      source,
      /This feature is not included in your current plan\./,
    );
    assert.match(
      source,
      /Contact your administrator to enable this feature\./,
    );
  });
});
