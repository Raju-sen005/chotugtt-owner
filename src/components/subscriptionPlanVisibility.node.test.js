/**
 * Label: Source-contract / pure unit
 * Subscription plan visibility — Pro + Plus must appear in public checkout
 * copy and admin sellable lists. Amounts remain backend-authoritative.
 * Not browser UI. Not HTTP.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXPECTED_SIX = [
  "TRIAL",
  "STARTER",
  "BASIC",
  "PREMIUM",
  "PRO",
  "PLUS",
];

describe("[Source-contract] public SubscriptionCheckout PLAN_COPY", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "SubscriptionCheckout.jsx"),
    "utf8",
  );

  it("PLAN_COPY includes PRO and PLUS (not commented out)", () => {
    assert.match(source, /^\s*PRO:\s*\{/m);
    assert.match(source, /^\s*PLUS:\s*\{/m);
    assert.doesNotMatch(source, /\/\/\s*PRO:\s*\{/);
  });

  it("filters server plans through PLAN_COPY keys for all six codes", () => {
    assert.match(source, /\.filter\(\(plan\)\s*=>\s*PLAN_COPY\[plan\.code\]\)/);
    for (const code of EXPECTED_SIX) {
      assert.match(
        source,
        new RegExp(`${code}:\\s*\\{`),
        `missing PLAN_COPY.${code}`,
      );
    }
  });

  it("keeps amounts from API (does not hardcode Pro/Plus prices in PLAN_COPY)", () => {
    const planCopy = source.slice(
      source.indexOf("const PLAN_COPY"),
      source.indexOf("export { PLAN_COPY }"),
    );
    assert.doesNotMatch(planCopy, /amount\s*:/);
    assert.doesNotMatch(planCopy, /12000|10000/);
  });
});

describe("[Source-contract] admin SuperAdminPanel sellable plans", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../features/admin/SuperAdminPanel.jsx"),
    "utf8",
  );

  it("SELLABLE_PLANS includes PLUS and PRO", () => {
    assert.match(source, /const SELLABLE_PLANS\s*=\s*\[[\s\S]*?"PLUS"[\s\S]*?\]/);
    assert.match(source, /"PRO"/);
    assert.match(source, /option value="PLUS"/);
    assert.match(source, /label:\s*"Plus"/);
  });
});
