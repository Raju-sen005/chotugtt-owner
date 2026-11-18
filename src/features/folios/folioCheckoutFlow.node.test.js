import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHECKOUT_STEPS,
  canConfirmCheckout,
  isOutstandingCleared,
  nextStepAfterPayment,
  resolveCheckoutWizardError,
  shouldCollectPayment,
  validateCheckoutPaymentForm,
} from "./folioCheckoutFlow.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("[Unit] folioCheckoutFlow eligibility", () => {
  it("clears outstanding at zero and tiny float remainder", () => {
    assert.equal(isOutstandingCleared(0), true);
    assert.equal(isOutstandingCleared(0.004), true);
    assert.equal(isOutstandingCleared(0.02), false);
    assert.equal(isOutstandingCleared(1), false);
    assert.equal(shouldCollectPayment(25), true);
    assert.equal(shouldCollectPayment(0), false);
  });

  it("disables confirm until settled balance and kitchen clear", () => {
    assert.equal(
      canConfirmCheckout({
        dueAmount: 0,
        pendingKitchenCount: 0,
        bookingStatus: "CHECKED_IN",
        folioStatus: "OPEN",
      }),
      true,
    );
    assert.equal(
      canConfirmCheckout({
        dueAmount: 100,
        pendingKitchenCount: 0,
        bookingStatus: "CHECKED_IN",
        folioStatus: "OPEN",
      }),
      false,
    );
    assert.equal(
      canConfirmCheckout({
        dueAmount: 0,
        pendingKitchenCount: 2,
        bookingStatus: "CHECKED_IN",
        folioStatus: "OPEN",
      }),
      false,
    );
    assert.equal(
      canConfirmCheckout({
        dueAmount: 0,
        pendingKitchenCount: 0,
        bookingStatus: "CHECKED_IN",
        folioStatus: "OPEN",
        syncFailed: true,
      }),
      false,
    );
    assert.equal(
      canConfirmCheckout({
        dueAmount: 0,
        pendingKitchenCount: 0,
        bookingStatus: "CONFIRMED",
        folioStatus: "OPEN",
      }),
      false,
    );
  });

  it("keeps payment step when outstanding remains after pay", () => {
    assert.equal(
      nextStepAfterPayment({ dueAmount: 40 }),
      CHECKOUT_STEPS.PAYMENT,
    );
    assert.equal(
      nextStepAfterPayment({ dueAmount: 0 }),
      CHECKOUT_STEPS.CONFIRM,
    );
  });

  it("returns to payment on FOLIO_BALANCE_DUE", () => {
    const resolved = resolveCheckoutWizardError({
      response: { data: { code: "FOLIO_BALANCE_DUE", message: "Balance due" } },
    });
    assert.equal(resolved.action, "return-to-payment");
    assert.match(resolved.message, /Balance due|Outstanding/i);
  });

  it("blocks on pending kitchen without checking out", () => {
    const resolved = resolveCheckoutWizardError({
      response: {
        data: { code: "PENDING_KITCHEN_ORDERS", message: "Kitchen busy" },
      },
    });
    assert.equal(resolved.action, "block");
  });
});

describe("[Unit] validateCheckoutPaymentForm", () => {
  it("rejects overpayment and accepts partial CASH", () => {
    assert.equal(
      validateCheckoutPaymentForm({
        method: "CASH",
        amount: 200,
        dueAmount: 100,
      }).ok,
      false,
    );
    const ok = validateCheckoutPaymentForm({
      method: "CASH",
      amount: 50,
      dueAmount: 100,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.payload.amount, 50);
  });

  it("requires MIXED components to sum to amount", () => {
    const bad = validateCheckoutPaymentForm({
      method: "MIXED",
      amount: 100,
      cashAmount: 40,
      upiAmount: 50,
      dueAmount: 100,
    });
    assert.equal(bad.ok, false);
    const good = validateCheckoutPaymentForm({
      method: "MIXED",
      amount: 100,
      cashAmount: 40,
      upiAmount: 60,
      dueAmount: 100,
    });
    assert.equal(good.ok, true);
  });
});

describe("[Source] FolioManagement checkout wizard", () => {
  it("embeds FolioCheckoutFlow in Checkout tab and keeps checkout API on folio page only", () => {
    const source = readFileSync(
      join(__dirname, "FolioManagement.jsx"),
      "utf8",
    );
    assert.match(source, /from ["']\.\/FolioCheckoutFlow\.jsx["']/);
    assert.match(source, /FolioCheckoutFlow/);
    assert.match(source, /intent !== "checkout"/);
    assert.match(source, /checkoutMutation/);
    assert.match(source, /\/rooms\/\$\{roomId\}\/checkout/);
    assert.match(source, /folio\/receipt/);
    assert.match(source, /sync-orders/);
    assert.match(source, /embedded/);
    assert.match(source, /FOLIO_BILLING_TABS\.CHECKOUT/);
    assert.match(source, /onCheckoutSuccess/);
    assert.doesNotMatch(source, /Confirm checkout\?/);
    assert.doesNotMatch(source, /setCheckoutOpen/);
    assert.doesNotMatch(
      source,
      /evaluateRoomFolioFocusBooking[\s\S]{0,400}checkoutMutation/,
    );
  });

  it("wizard syncs before preview and gates confirm on settlement", () => {
    const flowSource = readFileSync(
      join(__dirname, "FolioCheckoutFlow.jsx"),
      "utf8",
    );
    assert.match(flowSource, /onSyncOrders/);
    assert.match(flowSource, /onFetchReceipt/);
    assert.match(flowSource, /canConfirmCheckout/);
    assert.match(flowSource, /Payment settled\. Are you sure you want to checkout/);
    assert.match(flowSource, /Print Final Invoice/);
    assert.match(flowSource, /Room is CLEANING/);
    assert.match(flowSource, /buildFolioInvoiceHtml/);
    assert.match(flowSource, /embedded/);
    assert.match(flowSource, /isActive/);
    assert.match(flowSource, /onCheckoutSuccess/);
  });
});

describe("[Source] Bookings page still never calls checkout API", () => {
  it("navigates with bookingId intent only", () => {
    const source = readFileSync(
      join(__dirname, "../bookings/BookingManagement.jsx"),
      "utf8",
    );
    assert.match(source, /buildRoomFoliosCheckoutHref/);
    assert.match(source, /intent:\s*"checkout"/);
    assert.doesNotMatch(source, /checkoutMutation/);
    assert.doesNotMatch(
      source,
      /api\.post\(`\/rooms\/\$\{roomId\}\/checkout`/,
    );
  });
});
