/**
 * Label: Unit + Source-contract
 * Manual approval registration UX — welcome page, pending guards, no Razorpay.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasPendingRegistrationMarker,
  isMerchantAppPath,
  isWelcomePayload,
} from "./pendingRegistration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("[Unit] pendingRegistration helpers", () => {
  it("treats merchant deep links as guarded paths", () => {
    assert.equal(isMerchantAppPath("/dashboard"), true);
    assert.equal(isMerchantAppPath("/pos"), true);
    assert.equal(isMerchantAppPath("/orders"), true);
    assert.equal(isMerchantAppPath("/menu"), true);
    assert.equal(isMerchantAppPath("/subscription"), true);
    assert.equal(isMerchantAppPath("/subscription-checkout"), true);
    assert.equal(isMerchantAppPath("/registration-success"), false);
    assert.equal(isMerchantAppPath("/catalog/abc"), false);
    assert.equal(isMerchantAppPath("/room-menu/tok"), false);
  });

  it("recognizes welcome payload shapes", () => {
    assert.equal(isWelcomePayload({ approvalStatus: "PENDING_APPROVAL" }), true);
    assert.equal(isWelcomePayload({ idx: 0 }), false);
    assert.equal(hasPendingRegistrationMarker(), false);
  });
});

describe("[Source-contract] Manual approval frontend wiring", () => {
  it("AuthContext routes pending approval to registration-success, not checkout", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../context/AuthContext.jsx"),
      "utf8",
    );
    assert.match(source, /requiresApproval/);
    assert.match(source, /\/registration-success/);
    assert.match(source, /writeWelcomePayload/);
    assert.match(source, /PENDING_APPROVAL/);
    assert.doesNotMatch(
      source.slice(source.indexOf("registerTenant"), source.indexOf("Periodic Session")),
      /redirectToSubscription\(\)/,
    );
  });

  it("Login pending 403 opens welcome page", () => {
    const source = fs.readFileSync(path.join(__dirname, "Login.jsx"), "utf8");
    assert.match(source, /goToWelcome/);
    assert.match(source, /\/registration-success/);
    assert.match(source, /PENDING_APPROVAL/);
    assert.doesNotMatch(
      source.slice(source.indexOf("requiresApproval"), source.indexOf("requiresSubscription")),
      /subscription-checkout/,
    );
  });

  it("RegisterTenant does not treat checkout handoff as success path", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "RegisterTenant.jsx"),
      "utf8",
    );
    assert.match(source, /requiresApproval/);
    assert.doesNotMatch(source, /pendingCheckoutPlan/);
  });

  it("App exposes welcome route and pending guard", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../App.jsx"),
      "utf8",
    );
    assert.match(source, /path="\/registration-success"/);
    assert.match(source, /RegistrationSuccess/);
    assert.match(source, /PendingRouteGuard/);
  });

  it("RegistrationSuccess resolves status from backend and has no payment CTA", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "RegistrationSuccess.jsx"),
      "utf8",
    );
    assert.match(source, /Welcome to Transserve!/);
    assert.match(source, /Registration Successful/);
    assert.match(source, /Awaiting Approval/);
    assert.match(source, /\/auth\/registration-status/);
    assert.doesNotMatch(source, /Razorpay/);
    assert.doesNotMatch(source, /Pay now|Create order|subscription-checkout/i);
  });

  it("SubscriptionCheckout acquisition UI avoids Razorpay handoff", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../components/SubscriptionCheckout.jsx"),
      "utf8",
    );
    assert.match(source, /Online Razorpay registration handoff is disabled/);
    assert.match(source, /Choose the Right Plan for Your Business/);
    assert.match(source, /Get Started/);
    assert.match(source, /removeItem\("chotugtt_pending_checkout_plan"\)/);
  });

  it("CommercialCatalogPreview keeps Channel Manager Coming Soon", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../subscription/CommercialCatalogPreview.jsx"),
      "utf8",
    );
    assert.match(source, /Coming Soon/);
    assert.match(source, /Not\s+Available Yet/);
    assert.match(source, /role="tablist"/);
    assert.match(source, /Get Started/);
  });
});
