/**
 * Hotel Starter / Hotel Growth sidebar plan detection.
 * Navigation icons stay in Sidebar.jsx — this module is plan/path contract only.
 */

export const HOTEL_ONLY_PLAN_CODES = Object.freeze([
  "HOTEL_STARTER",
  "HOTEL_GROWTH",
]);

/** Exact hotel operational routes (order matters for Sidebar). */
export const HOTEL_ONLY_NAV_PATHS = Object.freeze([
  "/rooms",
  "/bookings",
  "/room-qr",
  "/room-folios",
  "/guests",
]);

/**
 * Restaurant-only routes blocked for hotel-only plans (direct URL + sidebar).
 * Profile, staff, and subscription remain reachable.
 */
export const HOTEL_BLOCKED_RESTAURANT_PATHS = Object.freeze([
  "/counter",
  "/orders",
  "/menu",
  "/analysis",
  "/payment",
  "/offer",
  "/table-monitor",
  "/events",
  "/supply",
  "/marketing",
  "/settings",
]);

/** Default landing for Hotel Starter / Hotel Growth — hotel overview at `/`. */
export const HOTEL_ONLY_HOME_PATH = "/";

export function resolveSubscriptionPlanCode(user) {
  const raw =
    user?.subscriptionPlan || user?.restaurant?.subscriptionPlan || "";
  return String(raw).trim().toUpperCase();
}

export function isHotelOnlyPlan(user) {
  return HOTEL_ONLY_PLAN_CODES.includes(resolveSubscriptionPlanCode(user));
}

/**
 * Merchant post-login / default home path.
 * Call only when AuthContext has finished loading (user known or null).
 */
export function resolveMerchantHomePath(user) {
  if (!user) return "/";
  if (user.role === "SUPERADMIN") return "/super-admin";
  if (isHotelOnlyPlan(user)) return HOTEL_ONLY_HOME_PATH;
  return "/";
}

export function isHotelBlockedRestaurantPath(pathname) {
  const path = String(pathname || "").split("?")[0];
  return HOTEL_BLOCKED_RESTAURANT_PATHS.some(
    (blocked) => path === blocked || path.startsWith(`${blocked}/`),
  );
}
