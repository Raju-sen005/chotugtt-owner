/**
 * Room Folio checkout wizard helpers (pure — no React).
 *
 * Flow: Preview → Payment → Confirm Checkout → Complete
 * Settlement happens inside POST /rooms/:id/checkout (no separate settle API).
 */

export const CHECKOUT_STEPS = Object.freeze({
  PREVIEW: "preview",
  PAYMENT: "payment",
  CONFIRM: "confirm",
  COMPLETE: "complete",
});

export const CHECKOUT_STEP_ORDER = Object.freeze([
  CHECKOUT_STEPS.PREVIEW,
  CHECKOUT_STEPS.PAYMENT,
  CHECKOUT_STEPS.CONFIRM,
  CHECKOUT_STEPS.COMPLETE,
]);

export const CHECKOUT_STEP_LABELS = Object.freeze({
  [CHECKOUT_STEPS.PREVIEW]: "Final Bill Preview",
  [CHECKOUT_STEPS.PAYMENT]: "Collect Payment",
  [CHECKOUT_STEPS.CONFIRM]: "Confirm Checkout",
  [CHECKOUT_STEPS.COMPLETE]: "Checkout Complete",
});

const DUE_EPS = 0.009;

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function isOutstandingCleared(dueAmount) {
  return roundMoney(dueAmount) <= DUE_EPS;
}

/**
 * Whether the Confirm Checkout action may call the checkout API.
 * Backend still re-validates settlement, due, and pending kitchen.
 */
export function canConfirmCheckout({
  dueAmount,
  pendingKitchenCount = 0,
  bookingStatus,
  folioStatus,
  syncFailed = false,
} = {}) {
  if (syncFailed) return false;
  const booking = String(bookingStatus || "").toUpperCase();
  const folio = String(folioStatus || "").toUpperCase();
  if (booking !== "CHECKED_IN") return false;
  if (folio !== "OPEN" && folio !== "SETTLED") return false;
  if (!isOutstandingCleared(dueAmount)) return false;
  if (Number(pendingKitchenCount) > 0) return false;
  return true;
}

export function shouldCollectPayment(dueAmount) {
  return !isOutstandingCleared(dueAmount);
}

/**
 * After a successful payment (authoritative folio from API), pick next step.
 */
export function nextStepAfterPayment(folio) {
  const due = folio?.dueAmount;
  if (shouldCollectPayment(due)) {
    return CHECKOUT_STEPS.PAYMENT;
  }
  return CHECKOUT_STEPS.CONFIRM;
}

/**
 * Map checkout API errors to wizard recovery actions.
 */
export function resolveCheckoutWizardError(error) {
  const code = error?.response?.data?.code || error?.code || "";
  if (code === "FOLIO_BALANCE_DUE" || code === "OVERPAYMENT") {
    return {
      action: "return-to-payment",
      code,
      message:
        error?.response?.data?.message ||
        "Outstanding balance remains. Collect the remaining payment before checkout.",
    };
  }
  if (code === "PENDING_KITCHEN_ORDERS") {
    return {
      action: "block",
      code,
      message:
        error?.response?.data?.message ||
        "Kitchen orders are still pending or accepted. Finish them before checkout.",
    };
  }
  return {
    action: "block",
    code: code || "CHECKOUT_FAILED",
    message:
      error?.response?.data?.message ||
      error?.message ||
      "Checkout failed. Booking remains checked in.",
  };
}

/**
 * Validate payment form against authoritative outstanding (frontend gate only).
 */
export function validateCheckoutPaymentForm({
  method,
  amount,
  cashAmount,
  upiAmount,
  dueAmount,
} = {}) {
  const payMethod = String(method || "").toUpperCase();
  const amt = Number(amount);
  const due = roundMoney(dueAmount);

  if (!["CASH", "UPI", "MIXED"].includes(payMethod)) {
    return { ok: false, message: "method must be CASH, UPI, or MIXED" };
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero" };
  }
  if (amt > due + 0.001) {
    return {
      ok: false,
      message: "Payment cannot exceed outstanding balance",
    };
  }
  if (payMethod === "MIXED") {
    const cash = Number(cashAmount);
    const upi = Number(upiAmount);
    if (
      !Number.isFinite(cash) ||
      !Number.isFinite(upi) ||
      cash < 0 ||
      upi < 0
    ) {
      return {
        ok: false,
        message: "MIXED requires valid cashAmount and upiAmount",
      };
    }
    if (Number((cash + upi).toFixed(2)) !== Number(amt.toFixed(2))) {
      return {
        ok: false,
        message: "MIXED cashAmount + upiAmount must equal amount",
      };
    }
    return {
      ok: true,
      payload: {
        method: payMethod,
        amount: amt,
        cashAmount: cash,
        upiAmount: upi,
      },
    };
  }
  return {
    ok: true,
    payload: { method: payMethod, amount: amt },
  };
}

export function checkoutStepIndex(step) {
  const idx = CHECKOUT_STEP_ORDER.indexOf(step);
  return idx >= 0 ? idx : 0;
}
