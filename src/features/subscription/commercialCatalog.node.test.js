/**
 * Label: Unit + Source-contract
 * Master commercial catalog — approved prices, categories, Channel Manager Coming Soon.
 * Does not hit HTTP, MongoDB, Razorpay, or browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_ANNUAL_PRICES,
  CHANNEL_MANAGER_COMING_SOON,
  COMMERCIAL_CATEGORIES,
  FOUNDATION_COMMERCIAL_PLANS,
  FOUNDATION_COMMERCIAL_PLAN_CODES,
  getChannelManagerComingSoonPlans,
  getFoundationCommercialPlan,
  getFoundationPlansByCategory,
  HOTEL_GROWTH_FEATURE_KEYS,
  HOTEL_STARTER_FEATURE_KEYS,
  mergeServerPlanWithCopy,
  RESTAURANT_GROWTH_FEATURE_KEYS,
  RESTAURANT_PRO_FEATURE_KEYS,
  RESTAURANT_STARTER_FEATURE_KEYS,
  resolveRegistrationPlanCode,
  TIER_FEATURE_KEYS,
} from "./commercialCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXPECTED_ELEVEN = [
  "RESTAURANT_STARTER",
  "RESTAURANT_GROWTH",
  "RESTAURANT_PRO",
  "HOTEL_STARTER",
  "HOTEL_GROWTH",
  "RESORT_RESTAURANT_STARTER_HOTEL_STARTER",
  "RESORT_RESTAURANT_GROWTH_HOTEL_STARTER",
  "RESORT_RESTAURANT_PRO_HOTEL_STARTER",
  "RESORT_RESTAURANT_STARTER_HOTEL_GROWTH",
  "RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH",
  "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
];

const sorted = (list) => [...list].sort();

describe("[Unit] Master commercial catalog metadata", () => {
  it("defines presentation metadata for all 11 paid plans", () => {
    assert.equal(FOUNDATION_COMMERCIAL_PLANS.length, 11);
    assert.deepEqual(
      sorted(FOUNDATION_COMMERCIAL_PLAN_CODES),
      sorted(EXPECTED_ELEVEN),
    );
    for (const plan of FOUNDATION_COMMERCIAL_PLANS) {
      assert.ok(plan.code);
      assert.ok(plan.name);
      assert.ok(plan.description);
      assert.ok(Array.isArray(plan.featureKeys));
      assert.ok(Array.isArray(plan.featureLabels));
      assert.equal(plan.purchasable, true);
      assert.equal(typeof plan.channelManagerComingSoon, "boolean");
      assert.equal(APPROVED_ANNUAL_PRICES[plan.code] > 0, true, plan.code);
    }
  });

  it("groups plans into Restaurant, Hotel, and Resort categories", () => {
    assert.deepEqual(
      COMMERCIAL_CATEGORIES.map((c) => c.id),
      ["RESTAURANT", "HOTEL", "RESORT"],
    );
    assert.equal(getFoundationPlansByCategory("RESTAURANT").length, 3);
    assert.equal(getFoundationPlansByCategory("HOTEL").length, 2);
    assert.equal(getFoundationPlansByCategory("RESORT").length, 6);
  });

  it("Restaurant tiers nest correctly (Starter ⊂ Growth ⊂ Pro)", () => {
    const starter = new Set(RESTAURANT_STARTER_FEATURE_KEYS);
    const growth = new Set(RESTAURANT_GROWTH_FEATURE_KEYS);
    const pro = new Set(RESTAURANT_PRO_FEATURE_KEYS);
    for (const key of starter) assert.equal(growth.has(key), true, key);
    for (const key of growth) assert.equal(pro.has(key), true, key);
    assert.equal(starter.has("CAPTAIN"), false);
    assert.equal(growth.has("CAPTAIN"), true);
    assert.equal(growth.has("EVENT_MANAGEMENT"), false);
    assert.equal(pro.has("EVENT_MANAGEMENT"), true);
  });

  it("Hotel Growth software keys match Hotel Starter (Channel Manager not a key)", () => {
    assert.deepEqual(
      sorted(HOTEL_GROWTH_FEATURE_KEYS),
      sorted(HOTEL_STARTER_FEATURE_KEYS),
    );
    assert.equal(HOTEL_GROWTH_FEATURE_KEYS.includes("CHANNEL_MANAGER"), false);
  });

  it("Resort combinations are exact restaurant ∪ hotel tier unions", () => {
    for (const plan of getFoundationPlansByCategory("RESORT")) {
      const expected = sorted([
        ...new Set([
          ...TIER_FEATURE_KEYS[plan.restaurantTier],
          ...TIER_FEATURE_KEYS[plan.hotelTier],
        ]),
      ]);
      assert.deepEqual(sorted(plan.featureKeys), expected, plan.code);
    }
  });
});

describe("[Unit] Channel Manager presentation", () => {
  it("Coming Soon only on Hotel Growth and Resort *HOTEL_GROWTH plans", () => {
    const codes = getChannelManagerComingSoonPlans().map((p) => p.code).sort();
    assert.deepEqual(codes, [
      "HOTEL_GROWTH",
      "RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH",
      "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
      "RESORT_RESTAURANT_STARTER_HOTEL_GROWTH",
    ]);
    assert.equal(
      getFoundationCommercialPlan("HOTEL_STARTER").channelManagerComingSoon,
      false,
    );
    assert.equal(
      getFoundationCommercialPlan("RESORT_RESTAURANT_PRO_HOTEL_STARTER")
        .channelManagerComingSoon,
      false,
    );
  });

  it("never lists CHANNEL_MANAGER inside featureKeys", () => {
    for (const plan of FOUNDATION_COMMERCIAL_PLANS) {
      assert.equal(
        plan.featureKeys.includes("CHANNEL_MANAGER"),
        false,
        plan.code,
      );
    }
    assert.equal(CHANNEL_MANAGER_COMING_SOON.status, "Coming Soon");
  });
});

describe("[Unit] Approved prices and registration", () => {
  it("approved annual prices match product owner table", () => {
    assert.deepEqual(APPROVED_ANNUAL_PRICES, {
      RESTAURANT_STARTER: 3000,
      RESTAURANT_GROWTH: 4000,
      RESTAURANT_PRO: 5000,
      HOTEL_STARTER: 4000,
      HOTEL_GROWTH: 10000,
      RESORT_RESTAURANT_STARTER_HOTEL_STARTER: 7000,
      RESORT_RESTAURANT_GROWTH_HOTEL_STARTER: 10000,
      RESORT_RESTAURANT_PRO_HOTEL_STARTER: 16000,
      RESORT_RESTAURANT_STARTER_HOTEL_GROWTH: 10000,
      RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH: 13000,
      RESORT_RESTAURANT_PRO_HOTEL_GROWTH: 19000,
    });
  });

  it("mergeServerPlanWithCopy uses server amount (never zero placeholder)", () => {
    const merged = mergeServerPlanWithCopy({
      code: "RESTAURANT_STARTER",
      amount: 3000,
      name: "Restaurant Starter",
      planFamily: "RESTAURANT",
    });
    assert.equal(merged.amount, 3000);
    assert.equal(merged.purchasable, true);
    assert.doesNotMatch(String(merged.amount), /^0$/);
  });

  it("registration allows TRIAL and commercial codes; legacy paid falls back to TRIAL", () => {
    assert.equal(resolveRegistrationPlanCode(null), "TRIAL");
    assert.equal(resolveRegistrationPlanCode(""), "TRIAL");
    assert.equal(resolveRegistrationPlanCode("PLUS"), "TRIAL");
    assert.equal(resolveRegistrationPlanCode("PRO"), "TRIAL");
    assert.equal(resolveRegistrationPlanCode("RESTAURANT_STARTER"), "RESTAURANT_STARTER");
    assert.equal(
      resolveRegistrationPlanCode("RESORT_RESTAURANT_PRO_HOTEL_GROWTH"),
      "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
    );
  });
});

describe("[Source-contract] Master UI wiring", () => {
  it("SubscriptionCheckout mounts CommercialCatalogPreview and keeps renewal APIs", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../components/SubscriptionCheckout.jsx"),
      "utf8",
    );
    assert.match(source, /CommercialCatalogPreview/);
    assert.match(source, /\/payments\/renewal-plans/);
    assert.match(source, /\/payments\/create-order/);
    assert.match(source, /isOwnerRenewal/);
    assert.match(source, /chotugtt_pending_checkout_plan/);
  });

  it("CommercialCatalogPreview renders prices and purchase CTA from server amounts", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "CommercialCatalogPreview.jsx"),
      "utf8",
    );
    assert.match(source, /formatPrice/);
    assert.match(source, /onSelectPlan/);
    assert.match(source, /Coming Soon/);
    assert.match(source, /Choose the Right Plan for Your Business/);
    assert.match(source, /Billed annually/);
    assert.doesNotMatch(source, /Pricing to be announced/);
    assert.doesNotMatch(source, /Not available for purchase yet/);
  });

  it("RegisterTenant sends plan + businessCategory", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../auth/RegisterTenant.jsx"),
      "utf8",
    );
    assert.match(source, /resolveRegistrationPlanCode/);
    assert.match(source, /businessCategory/);
    assert.match(source, /resolveBusinessCategoryForPlan/);
  });
});
