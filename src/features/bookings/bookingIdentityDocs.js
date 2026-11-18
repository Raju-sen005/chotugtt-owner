/**
 * Helpers for identity-document upload during New Room Booking.
 * Reuses Guest document APIs — no second storage path.
 */

import {
  DOCUMENT_TYPES,
  mapProofTypeToDocumentType,
  validatePendingDocumentFile,
} from "../guests/guestProfileDisplay.js";

export { DOCUMENT_TYPES, mapProofTypeToDocumentType, validatePendingDocumentFile };

export function createPendingDocument({
  file,
  documentType,
  documentNumber = "",
}) {
  const validated = validatePendingDocumentFile(file);
  if (!validated.ok) return validated;
  const type = DOCUMENT_TYPES.includes(documentType)
    ? documentType
    : mapProofTypeToDocumentType(documentType);
  return {
    ok: true,
    value: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      fileName: file.name,
      documentType: type,
      documentNumber: String(documentNumber || "").trim(),
      status: "pending",
    },
  };
}

/**
 * Build guest create payload. Includes identity when present.
 * Caller may retry without identity if encryption is not configured.
 */
export function buildGuestCreatePayload({
  fullName,
  phone,
  identityType,
  identityNumber,
  includeIdentity = true,
}) {
  const payload = {
    fullName: String(fullName || "").trim(),
    phone: String(phone || "").trim(),
  };
  if (
    includeIdentity &&
    String(identityType || "").trim() &&
    String(identityNumber || "").trim()
  ) {
    payload.identityType = String(identityType).trim();
    payload.identityNumber = String(identityNumber).trim();
  }
  return payload;
}

/**
 * Only fill empty guest identity — never overwrite with blank booking fields.
 */
export function buildGuestIdentityPatch({
  guest,
  identityType,
  identityNumber,
}) {
  if (!guest) return null;
  const hasIdentity =
    Boolean(String(guest.identityType || "").trim()) ||
    Boolean(String(guest.maskedIdentityNumber || "").trim());
  if (hasIdentity) return null;
  const type = String(identityType || "").trim();
  const number = String(identityNumber || "").trim();
  if (!type || !number) return null;
  return { identityType: type, identityNumber: number };
}

export function isGuestEncryptionConfigError(error) {
  const code = error?.response?.data?.code || error?.code;
  const message = String(
    error?.response?.data?.message || error?.message || "",
  ).toLowerCase();
  return (
    code === "GUEST_STORAGE_NOT_CONFIGURED" ||
    code === "GUEST_KEK_INVALID" ||
    code === "GUEST_ENCRYPTION_NOT_CONFIGURED" ||
    code === "ENCRYPTION_NOT_CONFIGURED" ||
    message.includes("guest_doc_kek") ||
    message.includes("encryption is not configured") ||
    message.includes("identity encryption")
  );
}
