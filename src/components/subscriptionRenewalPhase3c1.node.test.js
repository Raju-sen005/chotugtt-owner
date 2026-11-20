/**
 * Label: Unit + Source-contract
 * Phase 3C.1 — OWNER renewal UX vs acquisition signup redirect.
 * Does not hit HTTP, MongoDB, Razorpay, or browser.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const checkoutSource = fs.readFileSync(
  path.join(__dirname, "SubscriptionCheckout.jsx"),
  "utf8",
);

describe("[Source-contract] Phase 3C.1 SubscriptionCheckout renewal UX", () => {
  it("OWNER renewal mode loads /payments/renewal-plans", () => {
    assert.match(checkoutSource, /isOwnerRenewal/);
    assert.match(checkoutSource, /\/payments\/renewal-plans/);
    assert.match(checkoutSource, /\/payments\/plans/);
  });

  it("OWNER paid renewal calls create-order and verify, not signup redirect", () => {
    assert.match(checkoutSource, /\/payments\/create-order/);
    assert.match(checkoutSource, /\/payments\/verify/);
    assert.match(checkoutSource, /Idempotency-Key/);
    assert.match(checkoutSource, /new window\.Razorpay/);
    assert.match(checkoutSource, /refreshSession/);

    // Acquisition still redirects to signup with plan + category
    assert.match(checkoutSource, /auth=signup&plan=/);
    assert.match(checkoutSource, /&category=/);
    assert.match(checkoutSource, /encodeURIComponent\(planCode\)/);
    assert.match(checkoutSource, /encodeURIComponent\(category\)/);

    // Renewal path must not treat signup as payment
    assert.match(checkoutSource, /openRazorpayCheckout/);
    assert.match(checkoutSource, /paymentInFlightRef/);
  });

  it("OWNER trial renewal uses start-trial", () => {
    assert.match(checkoutSource, /\/payments\/start-trial/);
    assert.match(checkoutSource, /handleStartTrialRenewal/);
  });

  it("handles cancel / failure messaging without activation claim", () => {
    assert.match(
      checkoutSource,
      /Payment was cancelled\. No subscription was activated\./,
    );
    assert.match(
      checkoutSource,
      /Payment failed\. No subscription was activated\./,
    );
  });

  it("registration acquisition copy path remains for non-OWNER", () => {
    assert.match(
      checkoutSource,
      /Choose your plan and continue to registration\./,
    );
  });

  it("OWNER renewal uses server audienceMode and does not mix catalogs", () => {
    assert.match(checkoutSource, /audienceMode/);
    assert.match(checkoutSource, /renewalAudienceMode/);
    assert.match(checkoutSource, /renewalAudienceMode === "LEGACY"/);
    assert.match(checkoutSource, /renewalAudienceMode === "COMMERCIAL"/);
    assert.match(checkoutSource, /lockCategory/);
  });
});
