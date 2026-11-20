/**
 * Label: Unit
 * Plan → navigation entitlement matrix (sidebar contract).
 *
 * Run: node --test src/components/planNavigationMatrix.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isHotelOnlyPlan } from "./sidebarHotelNav.js";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../features/subscription/featureAccess.js";

const HOTEL_FEATURES = Object.freeze([
  FEATURE_KEYS.ROOM_MANAGEMENT,
  FEATURE_KEYS.ROOM_BOOKING,
  FEATURE_KEYS.GUEST_MANAGEMENT,
  FEATURE_KEYS.ROOM_QR_ORDERING,
  FEATURE_KEYS.ROOM_FOLIO,
]);

const RESTAURANT_STARTER_FEATURES = Object.freeze([
  FEATURE_KEYS.POS,
  FEATURE_KEYS.QR_TABLE,
  FEATURE_KEYS.KOT,
  FEATURE_KEYS.BILLING,
  FEATURE_KEYS.PAYMENTS,
  FEATURE_KEYS.MENU,
  FEATURE_KEYS.OFFERS,
]);

const RESTAURANT_GROWTH_FEATURES = Object.freeze([
  ...RESTAURANT_STARTER_FEATURES,
  FEATURE_KEYS.CAPTAIN,
  FEATURE_KEYS.AI_MENU,
  FEATURE_KEYS.ANALYSIS,
  FEATURE_KEYS.REPORTS,
]);

const RESTAURANT_PRO_FEATURES = Object.freeze([
  ...RESTAURANT_GROWTH_FEATURES,
  FEATURE_KEYS.EVENT_MANAGEMENT,
]);

function userWith(plan, features) {
  return {
    role: "OWNER",
    subscriptionPlan: plan,
    availableFeatures: [...features],
  };
}

function expectNav(user, { visible, hidden }) {
  for (const feature of visible) {
    assert.equal(
      hasAvailableFeature(user, feature),
      true,
      `${user.subscriptionPlan} should have ${feature}`,
    );
  }
  for (const feature of hidden) {
    assert.equal(
      hasAvailableFeature(user, feature),
      false,
      `${user.subscriptionPlan} must not have ${feature}`,
    );
  }
}

describe("[Unit] HOTEL_STARTER / HOTEL_GROWTH navigation entitlements", () => {
  for (const plan of ["HOTEL_STARTER", "HOTEL_GROWTH"]) {
    it(`${plan}: hotel visible, restaurant hidden`, () => {
      const user = userWith(plan, HOTEL_FEATURES);
      assert.equal(isHotelOnlyPlan(user), true);
      expectNav(user, {
        visible: HOTEL_FEATURES,
        hidden: [
          FEATURE_KEYS.POS,
          FEATURE_KEYS.MENU,
          FEATURE_KEYS.ANALYSIS,
          FEATURE_KEYS.OFFERS,
          FEATURE_KEYS.QR_TABLE,
          FEATURE_KEYS.EVENT_MANAGEMENT,
        ],
      });
    });
  }
});

describe("[Unit] Restaurant plan navigation entitlements", () => {
  it("RESTAURANT_STARTER hides Analysis/Events/hotel", () => {
    const user = userWith("RESTAURANT_STARTER", RESTAURANT_STARTER_FEATURES);
    assert.equal(isHotelOnlyPlan(user), false);
    expectNav(user, {
      visible: [
        FEATURE_KEYS.POS,
        FEATURE_KEYS.MENU,
        FEATURE_KEYS.OFFERS,
        FEATURE_KEYS.QR_TABLE,
      ],
      hidden: [
        FEATURE_KEYS.ANALYSIS,
        FEATURE_KEYS.EVENT_MANAGEMENT,
        FEATURE_KEYS.ROOM_MANAGEMENT,
      ],
    });
  });

  it("RESTAURANT_GROWTH adds Analysis; still no hotel/events", () => {
    const user = userWith("RESTAURANT_GROWTH", RESTAURANT_GROWTH_FEATURES);
    expectNav(user, {
      visible: [FEATURE_KEYS.ANALYSIS, FEATURE_KEYS.CAPTAIN, FEATURE_KEYS.POS],
      hidden: [FEATURE_KEYS.EVENT_MANAGEMENT, FEATURE_KEYS.ROOM_MANAGEMENT],
    });
  });

  it("RESTAURANT_PRO adds Events; still no hotel", () => {
    const user = userWith("RESTAURANT_PRO", RESTAURANT_PRO_FEATURES);
    expectNav(user, {
      visible: [FEATURE_KEYS.EVENT_MANAGEMENT, FEATURE_KEYS.ANALYSIS],
      hidden: [FEATURE_KEYS.ROOM_MANAGEMENT, FEATURE_KEYS.GUEST_MANAGEMENT],
    });
  });
});

describe("[Unit] Plan switch replaces entitlements (no merge)", () => {
  it("RESTAURANT_PRO → HOTEL_STARTER drops restaurant features", () => {
    const after = userWith("HOTEL_STARTER", HOTEL_FEATURES);
    assert.equal(isHotelOnlyPlan(after), true);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.POS), false);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.EVENT_MANAGEMENT), false);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.ROOM_MANAGEMENT), true);
  });

  it("HOTEL_STARTER → RESTAURANT_PRO drops hotel features", () => {
    const after = userWith("RESTAURANT_PRO", RESTAURANT_PRO_FEATURES);
    assert.equal(isHotelOnlyPlan(after), false);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.ROOM_MANAGEMENT), false);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.POS), true);
    assert.equal(hasAvailableFeature(after, FEATURE_KEYS.EVENT_MANAGEMENT), true);
  });
});

describe("[Unit] Resort is union, not hotel-only", () => {
  const resortPlans = [
    "RESORT_RESTAURANT_STARTER_HOTEL_STARTER",
    "RESORT_RESTAURANT_GROWTH_HOTEL_STARTER",
    "RESORT_RESTAURANT_PRO_HOTEL_STARTER",
    "RESORT_RESTAURANT_STARTER_HOTEL_GROWTH",
    "RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH",
    "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
  ];

  for (const plan of resortPlans) {
    it(`${plan} is not hotel-only`, () => {
      assert.equal(isHotelOnlyPlan({ subscriptionPlan: plan }), false);
    });
  }

  it("sample resort union includes POS + ROOM_MANAGEMENT", () => {
    const user = userWith("RESORT_RESTAURANT_PRO_HOTEL_GROWTH", [
      ...RESTAURANT_PRO_FEATURES,
      ...HOTEL_FEATURES,
    ]);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.POS), true);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.ROOM_MANAGEMENT), true);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.EVENT_MANAGEMENT), true);
  });
});

describe("[Unit] Legacy PLUS / PRO compatibility shape", () => {
  it("Legacy PLUS is not hotel-only and can carry restaurant+hotel features", () => {
    const user = userWith("PLUS", [
      ...RESTAURANT_GROWTH_FEATURES,
      ...HOTEL_FEATURES,
    ]);
    assert.equal(isHotelOnlyPlan(user), false);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.POS), true);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.ROOM_MANAGEMENT), true);
  });

  it("Legacy PRO is not hotel-only and can carry events without hotel", () => {
    const user = userWith("PRO", [
      ...RESTAURANT_PRO_FEATURES,
      FEATURE_KEYS.WHATSAPP_BILL,
    ]);
    assert.equal(isHotelOnlyPlan(user), false);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.EVENT_MANAGEMENT), true);
    assert.equal(hasAvailableFeature(user, FEATURE_KEYS.ROOM_MANAGEMENT), false);
  });
});
