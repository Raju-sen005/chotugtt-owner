/**
 * Label: Unit / source-contract
 * Hotel Starter & Hotel Growth sidebar visibility.
 *
 * Run: node --test src/components/sidebarHotelNav.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HOTEL_BLOCKED_RESTAURANT_PATHS,
  HOTEL_ONLY_HOME_PATH,
  HOTEL_ONLY_NAV_PATHS,
  isHotelBlockedRestaurantPath,
  isHotelOnlyPlan,
  resolveMerchantHomePath,
  resolveSubscriptionPlanCode,
} from "./sidebarHotelNav.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sidebarSrc = fs.readFileSync(path.join(__dirname, "Sidebar.jsx"), "utf8");

const RESTAURANT_ONLY_PATHS = [
  "/counter",
  "/orders",
  "/menu",
  "/analysis",
  "/payment",
  "/offer",
  "/table-monitor",
  "/events",
  "/supply",
];

describe("[Unit] Hotel-only plan detection", () => {
  it("HOTEL_STARTER and HOTEL_GROWTH are hotel-only (case-normalized)", () => {
    assert.equal(
      resolveSubscriptionPlanCode({ subscriptionPlan: "hotel_starter" }),
      "HOTEL_STARTER",
    );
    assert.equal(isHotelOnlyPlan({ subscriptionPlan: "HOTEL_STARTER" }), true);
    assert.equal(isHotelOnlyPlan({ subscriptionPlan: "hotel_growth" }), true);
  });

  it("falls back to user.restaurant.subscriptionPlan", () => {
    assert.equal(
      isHotelOnlyPlan({
        restaurant: { subscriptionPlan: "HOTEL_GROWTH" },
      }),
      true,
    );
  });

  it("keeps Restaurant, Resort, PRO, PLUS non-hotel-only", () => {
    for (const plan of [
      "RESTAURANT_STARTER",
      "RESTAURANT_GROWTH",
      "RESTAURANT_PRO",
      "RESORT_RESTAURANT_STARTER_HOTEL_STARTER",
      "RESORT_RESTAURANT_GROWTH_HOTEL_GROWTH",
      "RESORT_RESTAURANT_PRO_HOTEL_STARTER",
      "RESORT_RESTAURANT_STARTER_HOTEL_GROWTH",
      "RESORT_RESTAURANT_GROWTH_HOTEL_STARTER",
      "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
      "PRO",
      "PLUS",
      "TRIAL",
    ]) {
      assert.equal(isHotelOnlyPlan({ subscriptionPlan: plan }), false, plan);
    }
  });

  it("defines exactly five hotel operational paths in order", () => {
    assert.deepEqual([...HOTEL_ONLY_NAV_PATHS], [
      "/rooms",
      "/bookings",
      "/room-qr",
      "/room-folios",
      "/guests",
    ]);
  });

  it("blocks restaurant-only paths for hotel accounts", () => {
    for (const pathName of RESTAURANT_ONLY_PATHS) {
      assert.equal(
        isHotelBlockedRestaurantPath(pathName),
        true,
        pathName,
      );
      assert.ok(HOTEL_BLOCKED_RESTAURANT_PATHS.includes(pathName), pathName);
    }
    assert.equal(isHotelBlockedRestaurantPath("/rooms"), false);
    assert.equal(isHotelBlockedRestaurantPath("/profile"), false);
    assert.equal(isHotelBlockedRestaurantPath("/staff"), false);
    assert.equal(isHotelBlockedRestaurantPath("/"), false);
  });

  it("resolves merchant home to Hotel Overview `/` for hotel-only plans", () => {
    assert.equal(HOTEL_ONLY_HOME_PATH, "/");
    assert.equal(
      resolveMerchantHomePath({ subscriptionPlan: "HOTEL_STARTER" }),
      "/",
    );
    assert.equal(
      resolveMerchantHomePath({
        restaurant: { subscriptionPlan: "hotel_growth" },
      }),
      "/",
    );
  });

  it("keeps Overview for Restaurant/Resort/PRO/PLUS and SuperAdmin home", () => {
    assert.equal(
      resolveMerchantHomePath({ subscriptionPlan: "RESTAURANT_GROWTH" }),
      "/",
    );
    assert.equal(
      resolveMerchantHomePath({
        subscriptionPlan: "RESORT_RESTAURANT_PRO_HOTEL_GROWTH",
      }),
      "/",
    );
    assert.equal(resolveMerchantHomePath({ subscriptionPlan: "PLUS" }), "/");
    assert.equal(resolveMerchantHomePath({ subscriptionPlan: "PRO" }), "/");
    assert.equal(
      resolveMerchantHomePath({ role: "SUPERADMIN", subscriptionPlan: "PRO" }),
      "/super-admin",
    );
    assert.equal(resolveMerchantHomePath(null), "/");
  });
});

describe("[Source] Sidebar hotel-only wiring", () => {
  it("selects HOTEL_ONLY_NAV_ITEMS when hotelOnlyPlan", () => {
    assert.match(sidebarSrc, /hotelOnlyPlan\s*\n\s*\? \[/);
    assert.match(sidebarSrc, /\.\.\.HOTEL_ONLY_NAV_ITEMS/);
  });

  it("disables live-orders query for hotel-only plans", () => {
    assert.match(
      sidebarSrc,
      /enabled:\s*Boolean\(restaurantId\)\s*&&\s*!isSuperAdmin\s*&&\s*!hotelOnlyPlan/,
    );
  });

  it("HOTEL_ONLY_NAV_ITEMS uses HOTEL_ONLY_NAV_PATHS indexes 0..4 in order", () => {
    const block = sidebarSrc.match(
      /const HOTEL_ONLY_NAV_ITEMS = Object\.freeze\(\[([\s\S]*?)\]\);/,
    );
    assert.ok(block, "HOTEL_ONLY_NAV_ITEMS missing");
    for (let i = 0; i < HOTEL_ONLY_NAV_PATHS.length; i += 1) {
      assert.match(block[1], new RegExp(`HOTEL_ONLY_NAV_PATHS\\[${i}\\]`));
    }
    assert.equal(block[1].includes("HOTEL_ONLY_NAV_PATHS[5]"), false);
    for (const hidden of RESTAURANT_ONLY_PATHS) {
      assert.equal(
        block[1].includes(`"${hidden}"`),
        false,
        `must not include ${hidden}`,
      );
    }
  });

  it("does not spread restaurant NAV_ITEMS for hotel-only plans", () => {
    assert.equal(sidebarSrc.includes("...NAV_ITEMS"), false);
  });
});

describe("[Source] Hotel default landing", () => {
  const layoutSrc = fs.readFileSync(
    path.join(__dirname, "../layouts/MerchantLayout.jsx"),
    "utf8",
  );
  const loginSrc = fs.readFileSync(
    path.join(__dirname, "../features/auth/Login.jsx"),
    "utf8",
  );

  it("MerchantLayout renders HotelOverview for hotel-only `/`", () => {
    assert.match(layoutSrc, /isHotelOnlyPlan/);
    assert.match(layoutSrc, /resolveMerchantHomePath/);
    assert.match(layoutSrc, /hotelOnlyPlan \? \(/);
    assert.match(layoutSrc, /<HotelOverview \/>/);
    assert.match(layoutSrc, /<DashboardOverview \/>/);
  });

  it("MerchantLayout redirects restaurant routes for hotel-only plans", () => {
    assert.match(layoutSrc, /path="\/counter"/);
    assert.match(layoutSrc, /Navigate to=\{merchantHomePath\}/);
    assert.match(layoutSrc, /FeatureRoute/);
  });

  it("Login navigates via resolveMerchantHomePath after success", () => {
    assert.match(loginSrc, /resolveMerchantHomePath/);
    assert.match(
      loginSrc,
      /navigate\(resolveMerchantHomePath\(authenticatedUser\),\s*\{\s*replace:\s*true\s*\}\)/,
    );
  });
});
