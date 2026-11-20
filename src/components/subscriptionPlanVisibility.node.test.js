/**
 * Label: Source-contract / pure unit
 * Legacy plans remain for OWNER renewal copy only.
 * New acquisition uses commercial catalog; SuperAdmin assigns TRIAL + 11.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ASSIGNABLE_PLANS,
  FILTERABLE_PLANS,
  isLegacyPlanCode,
} from "../features/admin/adminPlanCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LEGACY_SIX = ["TRIAL", "STARTER", "BASIC", "PREMIUM", "PRO", "PLUS"];

describe("[Unit] adminPlanCatalog assignment vs legacy", () => {
  it("assignable plans are TRIAL + 11 commercial only", () => {
    assert.equal(ASSIGNABLE_PLANS.length, 12);
    assert.equal(ASSIGNABLE_PLANS.includes("TRIAL"), true);
    assert.equal(ASSIGNABLE_PLANS.includes("RESTAURANT_STARTER"), true);
    assert.equal(ASSIGNABLE_PLANS.includes("PLUS"), false);
    assert.equal(ASSIGNABLE_PLANS.includes("PRO"), false);
  });

  it("filterable plans still include legacy for existing tenants", () => {
    assert.equal(isLegacyPlanCode("PLUS"), true);
    assert.equal(isLegacyPlanCode("RESTAURANT_PRO"), false);
    assert.equal(FILTERABLE_PLANS.includes("PLUS"), true);
    assert.equal(FILTERABLE_PLANS.includes("HOTEL_GROWTH"), true);
  });
});

describe("[Source-contract] public SubscriptionCheckout PLAN_COPY", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "SubscriptionCheckout.jsx"),
    "utf8",
  );

  it("keeps legacy PLAN_COPY for renewal but marks renewal-only", () => {
    assert.match(source, /renewal only/i);
    assert.match(source, /^\s*PRO:\s*\{/m);
    assert.match(source, /^\s*PLUS:\s*\{/m);
    for (const code of LEGACY_SIX) {
      assert.match(source, new RegExp(`${code}:\\s*\\{`));
    }
  });

  it("acquisition path uses CommercialCatalogPreview, not legacy marketing", () => {
    assert.match(source, /CommercialCatalogPreview/);
    assert.match(source, /Choose the Right Plan for Your Business/);
    assert.doesNotMatch(
      source,
      /Choose Starter, Basic, Premium, Pro, or Plus to continue/,
    );
  });
});

describe("[Source-contract] admin SuperAdminPanel assignable plans", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../features/admin/SuperAdminPanel.jsx"),
    "utf8",
  );

  it("assignment UI uses ASSIGNABLE_PLANS and labels legacy separately", () => {
    assert.match(source, /ASSIGNABLE_PLANS/);
    assert.match(source, /isLegacyPlanCode/);
    assert.match(source, /Pending Approvals/);
    assert.doesNotMatch(source, /const SELLABLE_PLANS\s*=/);
  });
});
