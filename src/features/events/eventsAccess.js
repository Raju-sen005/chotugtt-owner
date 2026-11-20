/**
 * EVENT_MANAGEMENT access helpers.
 * Entitlement from backend availableFeatures (not plan-string PRO checks).
 */

import { isSubscriptionActive } from "../rooms/roomsAccess";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../subscription/featureAccess";

export function hasEventManagementAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return (
    isSubscriptionActive(user) &&
    hasAvailableFeature(user, FEATURE_KEYS.EVENT_MANAGEMENT)
  );
}
