/**
 * SuperAdmin plan lists — commercial assignment vs legacy display/filter.
 * Amounts remain backend-authoritative; these codes are for UI allowlists only.
 */

export const LEGACY_PLAN_CODES = Object.freeze([
  "STARTER",
  "BASIC",
  "PREMIUM",
  "PRO",
  "PLUS",
]);

/** New assignment choices: TRIAL + 11 commercial plans only. */
export const ASSIGNABLE_PLANS = Object.freeze([
  "TRIAL",
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
]);

/** List filters may include legacy codes still present on existing tenants. */
export const FILTERABLE_PLANS = Object.freeze([
  ...ASSIGNABLE_PLANS,
  ...LEGACY_PLAN_CODES,
]);

export const BUSINESS_CATEGORIES = Object.freeze([
  "RESTAURANT",
  "HOTEL",
  "RESORT",
]);

export function isLegacyPlanCode(plan) {
  return LEGACY_PLAN_CODES.includes(String(plan || "").trim().toUpperCase());
}

export function formatPlanLabel(plan) {
  const value = String(plan || "").trim();
  if (!value) return "No plan";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
