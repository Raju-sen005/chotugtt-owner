/**
 * Pure UX helpers for Table QR PublicMenu.
 * No network / storage side effects.
 */

export const GUEST_NAME_RE = /^[A-Za-z ]{3,50}$/;
export const GUEST_PHONE_RE = /^[6-9]\d{9}$/;

export function validateGuestName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { ok: false, message: "Please enter your name." };
  }
  if (!GUEST_NAME_RE.test(trimmed)) {
    return {
      ok: false,
      message: "Enter a valid name (3–50 letters).",
    };
  }
  return { ok: true, value: trimmed, message: "" };
}

export function validateGuestPhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { ok: true, value: "", message: "" };
  }
  if (!GUEST_PHONE_RE.test(trimmed)) {
    return {
      ok: false,
      message: "Valid 10-digit number starting with 6–9.",
    };
  }
  return { ok: true, value: trimmed, message: "" };
}

export function isItemAvailable(item) {
  return item?.isAvailable !== false;
}

export function matchesMenuSearch(item, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const name = String(item?.name || "").toLowerCase();
  const description = String(item?.description || "").toLowerCase();
  return name.includes(q) || description.includes(q);
}

export function cartTotals(cart) {
  const entries = Object.entries(cart || {});
  let totalItems = 0;
  let subtotal = 0;
  for (const [, details] of entries) {
    const qty = Number(details?.quantity || 0);
    totalItems += qty;
    subtotal += qty * Number(details?.price || 0);
  }
  return { entries, totalItems, subtotal };
}

export function offerBadgeLabel(offer) {
  if (!offer) return "";
  if (offer.discountType === "FLAT") {
    return `₹${Number(offer.discountValue || 0)} OFF`;
  }
  return `${Number(offer.discountValue || 0)}% OFF`;
}

/**
 * Welcome copy for Table QR — table number only when known.
 * Never includes tokens or internal IDs.
 */
export function tableWelcomeMessage({ tableNumber, restaurantName }) {
  const place = restaurantName || "our restaurant";
  if (tableNumber) {
    return `Welcome to ${place}. Ordering for Table ${tableNumber}.`;
  }
  return `Welcome to ${place}. Browse the menu and place your order.`;
}

/** Masked mobile for "Ordering as" display — never persist identity in web storage. */
export function formatOrderingAsLabel(customerName, customerPhoneMasked) {
  const name = String(customerName || "").trim();
  if (!name) return "";
  const phone = String(customerPhoneMasked || "").trim();
  return phone ? `Ordering as ${name} · ${phone}` : `Ordering as ${name}`;
}

export function identityFromSessionPayload(data) {
  const identity = data?.identity;
  if (!identity?.hasProfile || !identity?.customerName) {
    return null;
  }
  return {
    customerName: String(identity.customerName).trim(),
    customerPhoneMasked: String(identity.customerPhoneMasked || "").trim(),
  };
}
