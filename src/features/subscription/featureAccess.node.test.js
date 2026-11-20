/**
 * Label: Unit + Source-contract
 * Phase 2 — frontend feature access helper and wiring.
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
  hasAnyAvailableFeature,
  hasAllAvailableFeatures,
  isFeatureNotAvailableError,
} from "./featureAccess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const activePlus = {
  role: "OWNER",
  subscriptionStatus: "ACTIVE",
  subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  availableFeatures: [
    FEATURE_KEYS.POS,
    FEATURE_KEYS.CAPTAIN,
    FEATURE_KEYS.ROOM_MANAGEMENT,
    FEATURE_KEYS.ROOM_BOOKING,
    FEATURE_KEYS.GUEST_MANAGEMENT,
    FEATURE_KEYS.ROOM_QR_ORDERING,
    FEATURE_KEYS.ROOM_FOLIO,
  ],
};

const activePro = {
  role: "OWNER",
  subscriptionStatus: "ACTIVE",
  subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  availableFeatures: [
    FEATURE_KEYS.POS,
    FEATURE_KEYS.EVENT_MANAGEMENT,
    FEATURE_KEYS.ANALYSIS,
  ],
};

const restaurantStarter = {
  role: "OWNER",
  subscriptionStatus: "ACTIVE",
  subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  availableFeatures: [
    FEATURE_KEYS.POS,
    FEATURE_KEYS.QR_TABLE,
    FEATURE_KEYS.MENU,
    FEATURE_KEYS.OFFERS,
    FEATURE_KEYS.KOT,
  ],
};

describe("[Unit] featureAccess helper", () => {
  it("fail-closes when availableFeatures missing", () => {
    assert.deepEqual(getAvailableFeatures(null), []);
    assert.deepEqual(getAvailableFeatures({}), []);
    assert.equal(hasAvailableFeature({}, FEATURE_KEYS.POS), false);
  });

  it("reads features from user and nested restaurant", () => {
    assert.equal(hasAvailableFeature(activePlus, FEATURE_KEYS.ROOM_MANAGEMENT), true);
    assert.equal(
      hasAvailableFeature(
        { restaurant: { availableFeatures: [FEATURE_KEYS.EVENT_MANAGEMENT] } },
        FEATURE_KEYS.EVENT_MANAGEMENT,
      ),
      true,
    );
  });

  it("hasAny / hasAll helpers", () => {
    assert.equal(
      hasAnyAvailableFeature(activePlus, [
        FEATURE_KEYS.EVENT_MANAGEMENT,
        FEATURE_KEYS.ROOM_FOLIO,
      ]),
      true,
    );
    assert.equal(
      hasAllAvailableFeatures(activePlus, [
        FEATURE_KEYS.ROOM_MANAGEMENT,
        FEATURE_KEYS.ROOM_FOLIO,
      ]),
      true,
    );
    assert.equal(
      hasAllAvailableFeatures(activePlus, [
        FEATURE_KEYS.ROOM_MANAGEMENT,
        FEATURE_KEYS.EVENT_MANAGEMENT,
      ]),
      false,
    );
  });

  it("matrix: PLUS rooms, PRO events, Starter no Captain/Event", () => {
    assert.equal(hasAvailableFeature(activePlus, FEATURE_KEYS.CAPTAIN), true);
    assert.equal(hasAvailableFeature(activePlus, FEATURE_KEYS.EVENT_MANAGEMENT), false);
    assert.equal(hasAvailableFeature(activePro, FEATURE_KEYS.EVENT_MANAGEMENT), true);
    assert.equal(hasAvailableFeature(activePro, FEATURE_KEYS.ROOM_MANAGEMENT), false);
    assert.equal(hasAvailableFeature(restaurantStarter, FEATURE_KEYS.CAPTAIN), false);
    assert.equal(hasAvailableFeature(restaurantStarter, FEATURE_KEYS.AI_MENU), false);
  });

  it("recognizes legacy and new feature-unavailable error codes", () => {
    assert.equal(
      isFeatureNotAvailableError({ response: { data: { code: "FEATURE_NOT_AVAILABLE" } } }),
      true,
    );
    assert.equal(
      isFeatureNotAvailableError({
        response: { data: { code: "AI_MENU_NOT_INCLUDED" } },
      }),
      true,
    );
    assert.equal(
      isFeatureNotAvailableError({
        response: { data: { code: "ANALYSIS_PLAN_RESTRICTED" } },
      }),
      true,
    );
  });
});

describe("[Source-contract] Phase 2 access helpers no longer use PLUS/PRO plan strings", () => {
  const files = [
    "../rooms/roomsAccess.js",
    "../guests/guestsAccess.js",
    "../bookings/bookingsAccess.js",
    "../roomQr/roomQrAccess.js",
    "../folios/folioAccess.js",
    "../events/eventsAccess.js",
    "../../components/Sidebar.jsx",
  ];

  for (const relative of files) {
    it(`${path.basename(relative)} uses hasAvailableFeature / feature keys`, () => {
      const source = fs.readFileSync(path.join(__dirname, relative), "utf8");
      if (relative.endsWith("Sidebar.jsx")) {
        assert.match(source, /hasEventManagementAccess/);
        assert.doesNotMatch(source, /=== ["']PRO["']/);
      } else if (relative.includes("eventsAccess")) {
        assert.match(source, /EVENT_MANAGEMENT/);
        assert.match(source, /hasAvailableFeature/);
      } else {
        assert.match(source, /hasAvailableFeature/);
        assert.doesNotMatch(source, /normalizePlan\(user\) === ["']PLUS["']/);
      }
    });
  }
});
