/**
 * PLUS + GUEST_MANAGEMENT access helpers (Milestone 6B.1).
 * Backend gates GUEST_MANAGEMENT as PLUS-only (not via PRO allFeatures).
 */

import {
  isSubscriptionActive,
  normalizePlan,
  isFeatureNotAvailable,
} from "../rooms/roomsAccess";

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
 * Active PLUS subscription entitles GUEST_MANAGEMENT.
 * PRO / other plans → false.
 */
export function hasGuestManagementAccess(user) {
  if (!user || user.role === "SUPERADMIN") return false;
  return isSubscriptionActive(user) && normalizePlan(user) === "PLUS";
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
      "Guest Management requires an active PLUS subscription."
    );
  }
  // Blob error responses may need parsing by caller
  return data?.message || error?.message || fallback;
}

export { isFeatureNotAvailable, isSubscriptionActive, normalizePlan };
