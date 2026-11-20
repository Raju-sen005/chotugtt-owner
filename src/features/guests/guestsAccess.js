/**
 * GUEST_MANAGEMENT access helpers.
 * Entitlement from backend availableFeatures (not plan-string PLUS checks).
 */

import {
  isSubscriptionActive,
  normalizePlan,
  isFeatureNotAvailable,
} from "../rooms/roomsAccess";
import {
  FEATURE_KEYS,
  hasAvailableFeature,
} from "../subscription/featureAccess";

export {
  ALLOWED_DOCUMENT_ACCEPT,
  DOCUMENT_TYPES,
  IDENTITY_TYPE_SUGGESTIONS,
  MAX_GUEST_DOCUMENT_BYTES,
  NOT_PROVIDED,
  displayGuestField,
  evaluateGuestDocumentUpload,
  formatGuestDate,
  formatGuestIdentity,
  formatGuestLocation,
  guestIdOf,
  mapGuestDetailResponse,
  mapProofTypeToDocumentType,
  resolveGuestDocumentType,
  toDateInputValue,
  validateOptionalDocumentNumber,
  validatePendingDocumentFile,
} from "./guestProfileDisplay";

/**
 * Active subscription + GUEST_MANAGEMENT entitlement.
 */
export function hasGuestManagementAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return (
    isSubscriptionActive(user) &&
    hasAvailableFeature(user, FEATURE_KEYS.GUEST_MANAGEMENT)
  );
}

export function canWriteGuests(user) {
  return ["OWNER", "MANAGER"].includes(user?.role);
}

/** Document list / upload / access / delete — OWNER|MANAGER only */
export function canManageGuestDocuments(user) {
  return ["OWNER", "MANAGER"].includes(user?.role);
}

export function getGuestApiErrorMessage(error, fallback = "Request failed") {
  const data = error?.response?.data;
  if (data?.code === "FEATURE_NOT_AVAILABLE") {
    return (
      data.message ||
      "This feature is not included in your current plan."
    );
  }
  // Blob error responses may need parsing by caller
  return data?.message || error?.message || fallback;
}

export { isFeatureNotAvailable, isSubscriptionActive, normalizePlan };
