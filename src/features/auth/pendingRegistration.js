/**
 * Pending-registration identity helpers.
 * Used to keep unapproved owners on /registration-success across refresh
 * and to redirect merchant deep-links without relying only on React state.
 */

export const WELCOME_STORAGE_KEY = "chotugtt_registration_welcome";
export const PENDING_EMAIL_STORAGE_KEY = "chotugtt_pending_registration_email";

export function isWelcomePayload(value) {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.businessName ||
      value.planName ||
      value.planCode ||
      value.businessCategory ||
      value.approvalStatus ||
      value.ownerEmail ||
      value.email,
  );
}

export function readStorageJson(key, storage) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeWelcomePayload(payload) {
  if (!payload || typeof payload !== "object") return;
  const normalized = {
    businessName: payload.businessName || null,
    businessCategory: payload.businessCategory || null,
    planCode: payload.planCode || null,
    planName: payload.planName || null,
    planAmount:
      typeof payload.planAmount === "number" ? payload.planAmount : null,
    approvalStatus: payload.approvalStatus || "PENDING_APPROVAL",
    ownerEmail: payload.ownerEmail || payload.email || null,
  };

  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(normalized));
      sessionStorage.removeItem("chotugtt_pending_checkout_plan");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(WELCOME_STORAGE_KEY, JSON.stringify(normalized));
      if (normalized.ownerEmail) {
        localStorage.setItem(PENDING_EMAIL_STORAGE_KEY, normalized.ownerEmail);
      }
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPendingRegistration() {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(WELCOME_STORAGE_KEY);
      sessionStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
      sessionStorage.removeItem("chotugtt_pending_checkout_plan");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(WELCOME_STORAGE_KEY);
      localStorage.removeItem(PENDING_EMAIL_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function readPendingEmail() {
  try {
    const fromLocal =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(PENDING_EMAIL_STORAGE_KEY)
        : null;
    if (fromLocal) return String(fromLocal).trim().toLowerCase();

    const welcome =
      readStorageJson(WELCOME_STORAGE_KEY, localStorage) ||
      readStorageJson(WELCOME_STORAGE_KEY, sessionStorage);
    const email = welcome?.ownerEmail || welcome?.email || null;
    return email ? String(email).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function readCachedWelcomePayload(locationState) {
  if (isWelcomePayload(locationState)) {
    return locationState;
  }
  const local =
    typeof localStorage !== "undefined"
      ? readStorageJson(WELCOME_STORAGE_KEY, localStorage)
      : null;
  if (isWelcomePayload(local)) return local;
  const session =
    typeof sessionStorage !== "undefined"
      ? readStorageJson(WELCOME_STORAGE_KEY, sessionStorage)
      : null;
  if (isWelcomePayload(session)) return session;
  return null;
}

export function hasPendingRegistrationMarker() {
  return Boolean(readPendingEmail() || readCachedWelcomePayload(null));
}

/** Merchant routes that pending owners must not enter. */
export function isMerchantAppPath(pathname) {
  const path = String(pathname || "/");
  if (
    path === "/registration-success" ||
    path.startsWith("/registration-success/") ||
    path.startsWith("/catalog/") ||
    path.startsWith("/room-menu/") ||
    path === "/forgot-password" ||
    path.startsWith("/forgot-password/")
  ) {
    return false;
  }
  return true;
}

export function buildWelcomePayloadFromPendingResponse(data, fallbackEmail) {
  if (!data || typeof data !== "object") return null;
  return {
    businessName: data.businessName || null,
    businessCategory: data.businessCategory || null,
    planCode: data.planCode || data.subscriptionPlan || null,
    planName: data.planName || data.subscriptionPlan || null,
    planAmount: typeof data.planAmount === "number" ? data.planAmount : null,
    approvalStatus: data.approvalStatus || "PENDING_APPROVAL",
    ownerEmail: data.ownerEmail || fallbackEmail || null,
  };
}
