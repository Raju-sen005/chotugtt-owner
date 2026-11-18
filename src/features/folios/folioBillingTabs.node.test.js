import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_FOLIO_BILLING_TAB,
  FOLIO_BILLING_TAB_ORDER,
  FOLIO_BILLING_TABS,
  normalizeFolioBillingTab,
  shouldCloseRoomBillingAfterCheckout,
  tabForCheckoutIntent,
  tabSelectionTriggersCheckout,
} from "./folioBillingTabs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("[Unit] folioBillingTabs", () => {
  it("defaults to Overview and rejects unknown tabs", () => {
    assert.equal(DEFAULT_FOLIO_BILLING_TAB, FOLIO_BILLING_TABS.OVERVIEW);
    assert.deepEqual(FOLIO_BILLING_TAB_ORDER, [
      FOLIO_BILLING_TABS.OVERVIEW,
      FOLIO_BILLING_TABS.FOOD_ORDERS,
      FOLIO_BILLING_TABS.PAYMENTS,
      FOLIO_BILLING_TABS.CHECKOUT,
    ]);
    assert.equal(normalizeFolioBillingTab("payments"), FOLIO_BILLING_TABS.PAYMENTS);
    assert.equal(normalizeFolioBillingTab("nope"), DEFAULT_FOLIO_BILLING_TAB);
  });

  it("never treats tab selection as checkout", () => {
    assert.equal(tabSelectionTriggersCheckout(), false);
    assert.equal(tabForCheckoutIntent("checkout"), FOLIO_BILLING_TABS.CHECKOUT);
    assert.equal(tabForCheckoutIntent("other"), DEFAULT_FOLIO_BILLING_TAB);
  });

  it("closes Room Billing only after success + refresh, not while in flight", () => {
    assert.equal(
      shouldCloseRoomBillingAfterCheckout({
        checkoutSucceeded: true,
        dataRefreshed: true,
        checkoutInFlight: false,
      }),
      true,
    );
    assert.equal(
      shouldCloseRoomBillingAfterCheckout({
        checkoutSucceeded: true,
        dataRefreshed: true,
        checkoutInFlight: true,
      }),
      false,
    );
    assert.equal(
      shouldCloseRoomBillingAfterCheckout({
        checkoutSucceeded: false,
        dataRefreshed: true,
        checkoutInFlight: false,
      }),
      false,
    );
    assert.equal(
      shouldCloseRoomBillingAfterCheckout({
        checkoutSucceeded: true,
        dataRefreshed: false,
        checkoutInFlight: false,
      }),
      false,
    );
  });
});

describe("[Source] FolioManagement Room Billing tabs", () => {
  it("hosts Overview / Food / Payments / Checkout tabs inside the folio modal", () => {
    const source = readFileSync(
      join(__dirname, "FolioManagement.jsx"),
      "utf8",
    );
    assert.match(source, /FOLIO_BILLING_TABS/);
    assert.match(source, /role="tablist"/);
    assert.match(source, /FOLIO_BILLING_TABS\.OVERVIEW/);
    assert.match(source, /FOLIO_BILLING_TABS\.FOOD_ORDERS/);
    assert.match(source, /FOLIO_BILLING_TABS\.PAYMENTS/);
    assert.match(source, /FOLIO_BILLING_TABS\.CHECKOUT/);
    assert.match(source, /DEFAULT_FOLIO_BILLING_TAB/);
    assert.match(source, /selectBillingTab\(FOLIO_BILLING_TABS\.CHECKOUT\)/);
    assert.match(source, /tabForCheckoutIntent/);
    assert.match(source, /embedded/);
    assert.match(source, /onCheckoutSuccess/);
    assert.match(source, /closeRoomBillingModal/);
    assert.match(source, /shouldCloseRoomBillingAfterCheckout/);
    // Nested checkout Modal removed — wizard lives in the Checkout tab.
    assert.doesNotMatch(source, /setCheckoutOpen\(true\)/);
    assert.doesNotMatch(
      source,
      /evaluateRoomFolioFocusBooking[\s\S]{0,400}checkoutMutation/,
    );
    // Existing folio actions remain available from the sticky header.
    assert.match(source, /Sync orders/);
    assert.match(source, /Add service/);
    assert.match(source, /Adjustment/);
    assert.match(source, /Record payment/);
    assert.match(source, /Print interim bill/);
  });

  it("keeps checkout wizard mounted across tab switches and blocks modal close while checkout pending", () => {
    const source = readFileSync(
      join(__dirname, "FolioManagement.jsx"),
      "utf8",
    );
    assert.match(
      source,
      /isActive=\{billingTab === FOLIO_BILLING_TABS\.CHECKOUT\}/,
    );
    assert.match(
      source,
      /billingTab === FOLIO_BILLING_TABS\.CHECKOUT \? "block" : "hidden"/,
    );
    assert.match(
      source,
      /if \(busy \|\| checkoutMutation\.isPending\) return;/,
    );
    assert.match(source, /checkoutMutation\.isPending/);
  });
});

describe("[Source] FolioCheckoutFlow embedded host", () => {
  it("supports embedded mode without auto-checkout on open", () => {
    const flowSource = readFileSync(
      join(__dirname, "FolioCheckoutFlow.jsx"),
      "utf8",
    );
    assert.match(flowSource, /embedded = false/);
    assert.match(flowSource, /isActive = true/);
    assert.match(flowSource, /onCheckoutSuccess/);
    assert.match(flowSource, /Opening Checkout does not check out/);
    assert.match(flowSource, /if \(embedded\)/);
    assert.match(flowSource, /canConfirmCheckout/);
    assert.match(flowSource, /confirmBusy/);
    assert.match(
      flowSource,
      /Payment settled\. Are you sure you want to checkout/,
    );
    assert.match(flowSource, /Print Final Invoice/);
    // Bootstrap waits for isActive — tab select alone is not checkout.
    assert.match(flowSource, /if \(!isOpen \|\| !isActive \|\| !bookingId\) return/);
    assert.match(flowSource, /Keep host Room Billing modal open/);
  });
});
