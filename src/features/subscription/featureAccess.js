/**
 * Centralized subscription feature access helpers.
 * availableFeatures from /auth/me (or login) is authoritative.
 * Never infer entitlements from subscriptionPlan strings.
 */

export const FEATURE_KEYS = Object.freeze({
  POS: "POS",
  QR_TABLE: "QR_TABLE",
  CAPTAIN: "CAPTAIN",
  KOT: "KOT",
  BILLING: "BILLING",
  PAYMENTS: "PAYMENTS",
  REPORTS: "REPORTS",
  ANALYSIS: "ANALYSIS",
  MENU: "MENU",
  OFFERS: "OFFERS",
  AI_MENU: "AI_MENU",
  EVENT_MANAGEMENT: "EVENT_MANAGEMENT",
  ROOM_MANAGEMENT: "ROOM_MANAGEMENT",
  ROOM_BOOKING: "ROOM_BOOKING",
  GUEST_MANAGEMENT: "GUEST_MANAGEMENT",
  ROOM_QR_ORDERING: "ROOM_QR_ORDERING",
  ROOM_FOLIO: "ROOM_FOLIO",
});

/**
 * Normalize availableFeatures from user / restaurant payload.
 * Missing or non-array → empty (fail closed).
 */
export function getAvailableFeatures(user) {
  if (!user) return [];

  const candidates = [
    user.availableFeatures,
    user.restaurant?.availableFeatures,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
  }

  return [];
}

export function hasAvailableFeature(user, featureKey) {
  if (!featureKey) return false;
  const features = getAvailableFeatures(user);
  if (features.length === 0) return false;
  return features.includes(String(featureKey).trim());
}

export function hasAnyAvailableFeature(user, featureKeys) {
  if (!Array.isArray(featureKeys) || featureKeys.length === 0) return false;
  return featureKeys.some((key) => hasAvailableFeature(user, key));
}

export function hasAllAvailableFeatures(user, featureKeys) {
  if (!Array.isArray(featureKeys) || featureKeys.length === 0) return false;
  return featureKeys.every((key) => hasAvailableFeature(user, key));
}

export function isFeatureNotAvailableError(error) {
  const code = error?.response?.data?.code || error?.code;
  return (
    code === "FEATURE_NOT_AVAILABLE" ||
    code === "CAPTAIN_NOT_AVAILABLE_ON_STARTER" ||
    code === "AI_MENU_NOT_INCLUDED" ||
    code === "ANALYSIS_PLAN_RESTRICTED"
  );
}

export function getFeatureUnavailableMessage(error, fallback) {
  const data = error?.response?.data;
  if (isFeatureNotAvailableError(error)) {
    return data?.message || fallback || "This feature is not available on your current subscription plan.";
  }
  return data?.message || error?.message || fallback || "Request failed";
}
