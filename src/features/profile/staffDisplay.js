/**
 * Staff list display helpers — never render FieldCrypto envelopes.
 */

export const displayStaffEmail = (email) => {
  if (typeof email === "string") {
    const trimmed = email.trim();
    return trimmed || "—";
  }
  // Unexpected object/envelope or missing value — safe fallback, no decryption.
  return "—";
};

export const staffEmailForForm = (email) =>
  typeof email === "string" ? email : "";

export const staffEmailSearchText = (email) =>
  typeof email === "string" ? email.toLowerCase() : "";
