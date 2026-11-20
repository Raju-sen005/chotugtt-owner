/**
 * Never render FieldCrypto envelopes (or other objects) as React children.
 * Backend DTOs must still decrypt authorized fields — this is defense in depth.
 */

const isFieldCryptoEnvelope = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  typeof value.ct === "string" &&
  typeof value.alg === "string";

export const asDisplayText = (value, fallback = "") => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (isFieldCryptoEnvelope(value)) {
    return fallback;
  }
  return fallback;
};

export const displayCustomerPhone = (phone) => asDisplayText(phone, "");
export const displayPhone = (phone, fallback = "—") =>
  asDisplayText(phone, fallback);
export const displayEmail = (email, fallback = "—") =>
  asDisplayText(email, fallback);
export const displayUpi = (upi, fallback = "") => asDisplayText(upi, fallback);
export const displayMobileNumber = (mobile, fallback = "—") =>
  asDisplayText(mobile, fallback);
