/**
 * Room Billing modal internal tabs (pure helpers — no React).
 * Checkout tab selection must never imply checkout API success.
 */

export const FOLIO_BILLING_TABS = Object.freeze({
  OVERVIEW: "overview",
  FOOD_ORDERS: "food-orders",
  PAYMENTS: "payments",
  CHECKOUT: "checkout",
});

export const FOLIO_BILLING_TAB_ORDER = Object.freeze([
  FOLIO_BILLING_TABS.OVERVIEW,
  FOLIO_BILLING_TABS.FOOD_ORDERS,
  FOLIO_BILLING_TABS.PAYMENTS,
  FOLIO_BILLING_TABS.CHECKOUT,
]);

export const FOLIO_BILLING_TAB_LABELS = Object.freeze({
  [FOLIO_BILLING_TABS.OVERVIEW]: "Overview",
  [FOLIO_BILLING_TABS.FOOD_ORDERS]: "Food Orders",
  [FOLIO_BILLING_TABS.PAYMENTS]: "Payments",
  [FOLIO_BILLING_TABS.CHECKOUT]: "Checkout",
});

export const DEFAULT_FOLIO_BILLING_TAB = FOLIO_BILLING_TABS.OVERVIEW;

/**
 * Normalize a tab id; unknown values fall back to Overview.
 */
export function normalizeFolioBillingTab(tab) {
  const value = String(tab || "").trim().toLowerCase();
  if (FOLIO_BILLING_TAB_ORDER.includes(value)) return value;
  return DEFAULT_FOLIO_BILLING_TAB;
}

/**
 * Whether selecting this tab may run the checkout confirm API.
 * Always false — staff must explicitly confirm on the Checkout tab.
 */
export function tabSelectionTriggersCheckout() {
  return false;
}

/**
 * After Bookings deep-link intent=checkout, open folio on Checkout tab
 * without calling checkout.
 */
export function tabForCheckoutIntent(intent) {
  if (String(intent || "").trim().toLowerCase() === "checkout") {
    return FOLIO_BILLING_TABS.CHECKOUT;
  }
  return DEFAULT_FOLIO_BILLING_TAB;
}

/**
 * Room Billing modal may close after checkout only when the wizard
 * reached Complete and authoritative refresh finished.
 */
export function shouldCloseRoomBillingAfterCheckout({
  checkoutSucceeded = false,
  dataRefreshed = false,
  checkoutInFlight = false,
} = {}) {
  if (checkoutInFlight) return false;
  return Boolean(checkoutSucceeded && dataRefreshed);
}
