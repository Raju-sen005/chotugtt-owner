/**
 * Pure guest profile display + document validation helpers.
 * No Vite extensionless imports — safe for node:test.
 */

export const DOCUMENT_TYPES = Object.freeze([
  "AADHAAR",
  "PAN",
  "PASSPORT",
  "DRIVING_LICENSE",
  "VOTER_ID",
  "OTHER",
]);

/** Matches backend guestDocumentValidation */
export const MAX_GUEST_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_DOCUMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf";

export const IDENTITY_TYPE_SUGGESTIONS = Object.freeze([
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Voter ID",
  "Other",
]);

export const NOT_PROVIDED = "Not provided";

export function guestIdOf(guest) {
  return String(guest?.id || guest?._id || "");
}

/** Display helper for optional guest profile fields. */
export function displayGuestField(value) {
  if (value === null || value === undefined) return NOT_PROVIDED;
  const text = String(value).trim();
  return text ? text : NOT_PROVIDED;
}

export function formatGuestDate(value) {
  if (!value) return NOT_PROVIDED;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_PROVIDED;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function trimOrEmpty(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

/** Prefer guest CRM fields; never invent from booking blobs. */
export function mapGuestDetailResponse(data) {
  if (!data || typeof data !== "object") return null;
  return {
    ...data,
    id: String(data.id || data._id || ""),
    fullName: trimOrEmpty(data.fullName),
    phone: trimOrEmpty(data.phone),
    email: trimOrEmpty(data.email),
    identityType: trimOrEmpty(data.identityType),
    maskedIdentityNumber: trimOrEmpty(data.maskedIdentityNumber),
    nationality: trimOrEmpty(data.nationality),
    address: trimOrEmpty(data.address),
    city: trimOrEmpty(data.city),
    state: trimOrEmpty(data.state),
    country: trimOrEmpty(data.country),
    dateOfBirth: data.dateOfBirth || null,
    notes: trimOrEmpty(data.notes),
  };
}

export function formatGuestIdentity(guest) {
  const type = displayGuestField(guest?.identityType);
  if (type === NOT_PROVIDED) return NOT_PROVIDED;
  const masked = String(guest?.maskedIdentityNumber || "").trim();
  return masked ? `${type} · ${masked}` : type;
}

export function formatGuestLocation(guest) {
  const parts = [guest?.city, guest?.state, guest?.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : NOT_PROVIDED;
}

/**
 * Map booking ID-proof labels to GuestDocument documentType enums.
 */
export function mapProofTypeToDocumentType(proofType) {
  const raw = String(proofType || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    AADHAAR: "AADHAAR",
    AADHAR: "AADHAAR",
    PAN: "PAN",
    PASSPORT: "PASSPORT",
    DRIVING_LICENSE: "DRIVING_LICENSE",
    DRIVING_LICENCE: "DRIVING_LICENSE",
    DL: "DRIVING_LICENSE",
    VOTER_ID: "VOTER_ID",
    VOTER: "VOTER_ID",
    OTHER: "OTHER",
  };
  return aliases[raw] || "OTHER";
}

export function validatePendingDocumentFile(file) {
  if (!file) {
    return { ok: false, message: "Select a document file." };
  }
  if (file.size > MAX_GUEST_DOCUMENT_BYTES) {
    return { ok: false, message: "Document exceeds the 8 MB size limit." };
  }
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  const allowedMime = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
  const mimeOk = allowedMime.includes(type);
  const extOk = allowedExt.some((ext) => name.endsWith(ext));
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      message: "Allowed file types: JPEG, PNG, WEBP, PDF.",
    };
  }
  return { ok: true };
}

/** Map guest profile identity label → GuestDocument.documentType enum. */
export function resolveGuestDocumentType(identityType) {
  const mapped = mapProofTypeToDocumentType(identityType);
  return DOCUMENT_TYPES.includes(mapped) ? mapped : "OTHER";
}

const DOC_TYPE_TO_PROOF_LABEL = Object.freeze({
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  PASSPORT: "Passport",
  DRIVING_LICENSE: "Driving License",
  VOTER_ID: "Voter ID",
  OTHER: "Other",
});

/**
 * Optional document number — empty is always OK.
 * When present, apply the same format rules as booking ID proof.
 */
export function validateOptionalDocumentNumber(documentType, documentNumber) {
  const number = String(documentNumber || "").trim();
  if (!number) return { ok: true };

  const type = DOCUMENT_TYPES.includes(documentType)
    ? documentType
    : resolveGuestDocumentType(documentType);
  const label = DOC_TYPE_TO_PROOF_LABEL[type] || "Other";

  if (label === "Aadhaar") {
    const digits = number.replace(/\s|-/g, "");
    if (!/^\d{12}$/.test(digits)) {
      return { ok: false, message: "Aadhaar number must be 12 digits." };
    }
    return { ok: true, value: digits };
  }
  if (label === "PAN") {
    const pan = number.toUpperCase().replace(/\s/g, "");
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
      return { ok: false, message: "Enter a valid PAN (ABCDE1234F)." };
    }
    return { ok: true, value: pan };
  }
  if (label === "Passport") {
    const passport = number.toUpperCase().replace(/\s/g, "");
    if (!/^[A-Z0-9]{6,12}$/.test(passport)) {
      return { ok: false, message: "Enter a valid passport number." };
    }
    return { ok: true, value: passport };
  }
  if (label === "Driving License") {
    const dl = number.toUpperCase().replace(/\s|-/g, "");
    if (!/^[A-Z0-9]{8,20}$/.test(dl)) {
      return { ok: false, message: "Enter a valid driving licence number." };
    }
    return { ok: true, value: dl };
  }
  if (label === "Voter ID") {
    const epic = number.toUpperCase().replace(/\s/g, "");
    if (!/^[A-Z0-9]{8,12}$/.test(epic)) {
      return { ok: false, message: "Enter a valid Voter ID number." };
    }
    return { ok: true, value: epic };
  }
  return { ok: true, value: number.slice(0, 40) };
}

/**
 * Pure enablement rules for Guest Details → Identity Documents upload.
 * Document number is optional and must not block enablement when empty.
 */
export function evaluateGuestDocumentUpload({
  entitled = false,
  canManageDocs = false,
  file = null,
  isUploading = false,
  documentNumber = "",
  documentType = "OTHER",
} = {}) {
  if (!entitled) {
    return {
      enabled: false,
      reason:
        "Identity document upload requires an active PLUS subscription with Guest Management.",
    };
  }
  if (!canManageDocs) {
    return {
      enabled: false,
      reason: "Document upload is limited to owners and managers.",
    };
  }
  if (isUploading) {
    return {
      enabled: false,
      reason: "Upload in progress. Please wait.",
    };
  }
  if (!file) {
    return {
      enabled: false,
      reason: "Select a valid document file to enable upload.",
    };
  }
  const fileCheck = validatePendingDocumentFile(file);
  if (!fileCheck.ok) {
    return { enabled: false, reason: fileCheck.message };
  }
  const numberCheck = validateOptionalDocumentNumber(
    documentType,
    documentNumber,
  );
  if (!numberCheck.ok) {
    return { enabled: false, reason: numberCheck.message };
  }
  return { enabled: true, reason: "" };
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
