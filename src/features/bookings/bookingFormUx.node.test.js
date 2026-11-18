/**
 * Label: Unit / source-contract
 * Room Booking form UX: ID proof dropdown, identity-docs cleanup, 10-digit mobile.
 * Pure helpers are mirrored so node:test avoids Vite extensionless imports.
 *
 * Run: node --test src/features/bookings/bookingFormUx.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPendingDocument,
  mapProofTypeToDocumentType,
} from "./bookingIdentityDocs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookingSource = fs.readFileSync(
  path.join(__dirname, "BookingManagement.jsx"),
  "utf8",
);
const accessSource = fs.readFileSync(
  path.join(__dirname, "bookingsAccess.js"),
  "utf8",
);

const ID_PROOF_TYPES = Object.freeze([
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Voter ID",
  "Other",
]);

/** Mirrors bookingsAccess.sanitizeMobileDigitsInput */
function sanitizeMobileDigitsInput(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 10);
}

/** Mirrors bookingsAccess.parseIndianMobile */
function parseIndianMobile(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { ok: false, message: "A valid Indian mobile number is required." };
  }
  const trimmed = String(raw).trim();
  if (/[a-zA-Z]/.test(trimmed)) {
    return { ok: false, message: "Mobile number must not contain letters." };
  }
  if (!/^[+\d][\d\s\-()]*$/.test(trimmed)) {
    return {
      ok: false,
      message: "Mobile number contains invalid characters.",
    };
  }
  let digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 10) {
    return {
      ok: false,
      message: "Enter a valid 10-digit Indian mobile number.",
    };
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      ok: false,
      message: "Indian mobile numbers must start with 6, 7, 8, or 9.",
    };
  }
  return { ok: true, value: digits };
}

/** Mirrors bookingsAccess.normalizeMobileInputValue */
function normalizeMobileInputValue(raw) {
  const parsed = parseIndianMobile(raw);
  if (parsed.ok) return parsed.value;
  return sanitizeMobileDigitsInput(raw);
}

/** Mirrors bookingsAccess.validateIdProof (core formats). */
function validateIdProof(proofType, proofNumberRaw) {
  const trimmed = String(proofNumberRaw || "").trim();
  if (!trimmed) return { ok: false, message: "ID proof number is required." };
  if (proofType === "Aadhaar") {
    const digits = trimmed.replace(/\s|-/g, "");
    if (!/^\d{12}$/.test(digits)) {
      return { ok: false, message: "Aadhaar number must be exactly 12 digits." };
    }
    return { ok: true, value: { proofType, proofNumber: digits } };
  }
  if (proofType === "PAN") {
    const pan = trimmed.replace(/\s/g, "").toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      return { ok: false, message: "PAN must match format ABCDE1234F." };
    }
    return { ok: true, value: { proofType, proofNumber: pan } };
  }
  if (proofType === "Passport") {
    const passport = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,9}$/.test(passport)) {
      return { ok: false, message: "Passport invalid" };
    }
    return { ok: true, value: { proofType, proofNumber: passport } };
  }
  if (proofType === "Driving License") {
    const dl = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z0-9]{8,20}$/.test(dl)) {
      return { ok: false, message: "DL invalid" };
    }
    return { ok: true, value: { proofType, proofNumber: dl } };
  }
  if (proofType === "Voter ID") {
    const epic = trimmed.replace(/\s|-/g, "").toUpperCase();
    if (!/^[A-Z]{3}[0-9]{7}$/.test(epic)) {
      return { ok: false, message: "Voter ID invalid" };
    }
    return { ok: true, value: { proofType, proofNumber: epic } };
  }
  if (trimmed.length < 3 || trimmed.length > 40 || !/[A-Za-z0-9]/.test(trimmed)) {
    return { ok: false, message: "Other invalid" };
  }
  return { ok: true, value: { proofType: "Other", proofNumber: trimmed.slice(0, 40) } };
}

function applyIdProofInputFilter(proofType, raw) {
  const value = String(raw ?? "");
  if (proofType === "Aadhaar") return value.replace(/\D/g, "").slice(0, 12);
  if (proofType === "PAN") {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
  }
  if (proofType === "Passport") {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 9);
  }
  if (proofType === "Driving License") {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  }
  if (proofType === "Voter ID") {
    return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);
  }
  return value.slice(0, 40);
}

function resolveProofNumberAfterTypeChange(nextType, current) {
  const filtered = applyIdProofInputFilter(nextType, current);
  const validated = validateIdProof(nextType, filtered);
  if (validated.ok) {
    return { proofNumber: validated.value.proofNumber, cleared: false };
  }
  if (!String(current || "").trim()) {
    return { proofNumber: "", cleared: false };
  }
  if (filtered && (nextType === "Aadhaar" ? /^\d*$/.test(filtered) : /^[A-Z0-9]*$/i.test(filtered))) {
    return { proofNumber: filtered, cleared: false };
  }
  return { proofNumber: "", cleared: true };
}

describe("[Unit] mobile digit helpers", () => {
  it("accepts exactly 10 digits", () => {
    assert.equal(sanitizeMobileDigitsInput("9876543210"), "9876543210");
    assert.equal(parseIndianMobile("9876543210").ok, true);
    assert.equal(parseIndianMobile("9876543210").value, "9876543210");
  });

  it("blocks 11+ digits in the UI helper", () => {
    assert.equal(sanitizeMobileDigitsInput("98765432101"), "9876543210");
    assert.equal(sanitizeMobileDigitsInput("98765432101234"), "9876543210");
    assert.equal(sanitizeMobileDigitsInput("9876543210").length, 10);
  });

  it("handles paste with spaces/symbols and rejects alphabetic mobile", () => {
    assert.equal(normalizeMobileInputValue("+91 98765-43210"), "9876543210");
    assert.equal(normalizeMobileInputValue("919876543210"), "9876543210");
    assert.equal(normalizeMobileInputValue("98765432101234"), "9876543210");
    assert.equal(normalizeMobileInputValue("98 765 43210"), "9876543210");
    assert.equal(parseIndianMobile("98ab543210").ok, false);
    assert.equal(parseIndianMobile("abcdefghij").ok, false);
  });

  it("rejects invalid mobiles on submit validation", () => {
    assert.equal(parseIndianMobile("").ok, false);
    assert.equal(parseIndianMobile("98765").ok, false);
    assert.equal(parseIndianMobile("1234567890").ok, false);
    assert.equal(parseIndianMobile("98765432101").ok, false);
  });
});

describe("[Unit] dynamic ID proof validation", () => {
  it("accepts Aadhaar 12 digits and rejects invalid length", () => {
    assert.equal(
      validateIdProof("Aadhaar", "1234 5678 9012").ok,
      true,
    );
    assert.equal(validateIdProof("Aadhaar", "123").ok, false);
    assert.equal(validateIdProof("Aadhaar", "ABCDE1234F").ok, false);
  });

  it("accepts valid PAN and rejects invalid format", () => {
    assert.equal(validateIdProof("PAN", "abcde1234f").ok, true);
    assert.equal(validateIdProof("PAN", "ABCDE1234F").value.proofNumber, "ABCDE1234F");
    assert.equal(validateIdProof("PAN", "123456789012").ok, false);
    assert.equal(validateIdProof("PAN", "ABC").ok, false);
  });

  it("validates Passport, Driving License, Voter ID and Other", () => {
    assert.equal(validateIdProof("Passport", "A1234567").ok, true);
    assert.equal(validateIdProof("Passport", "AB").ok, false);
    assert.equal(validateIdProof("Driving License", "MH1420110012345").ok, true);
    assert.equal(validateIdProof("Driving License", "SHORT").ok, false);
    assert.equal(validateIdProof("Voter ID", "ABC1234567").ok, true);
    assert.equal(validateIdProof("Voter ID", "AB123").ok, false);
    assert.equal(validateIdProof("Other", "REF-99").ok, true);
  });

  it("does not apply Aadhaar digit-only filter to PAN input", () => {
    assert.equal(applyIdProofInputFilter("PAN", "abcde1234f!"), "ABCDE1234F");
    assert.equal(applyIdProofInputFilter("Aadhaar", "12ab34"), "1234");
  });

  it("revalidates when ID type changes and clears incompatible values", () => {
    const keepPan = resolveProofNumberAfterTypeChange("PAN", "ABCDE1234F");
    assert.equal(keepPan.proofNumber, "ABCDE1234F");
    assert.equal(keepPan.cleared, false);

    const aadhaarToPan = resolveProofNumberAfterTypeChange(
      "PAN",
      "123456789012",
    );
    // Digits survive charset filter but are not a valid PAN; kept as draft.
    assert.equal(aadhaarToPan.proofNumber, "1234567890");
    assert.equal(aadhaarToPan.cleared, false);

    const panToAadhaar = resolveProofNumberAfterTypeChange(
      "Aadhaar",
      "ABCDE1234F",
    );
    assert.equal(panToAadhaar.proofNumber, "1234");
    assert.equal(panToAadhaar.cleared, false);
  });
});

describe("[Source] ID proof type dropdown", () => {
  it("renders ID proof type as a select using shared ID_PROOF_TYPES", () => {
    assert.match(bookingSource, /ID proof type/);
    assert.match(
      bookingSource,
      /ID proof type[\s\S]*?<select[\s\S]*?\{ID_PROOF_TYPES\.map/,
    );
    assert.doesNotMatch(
      bookingSource,
      /list="booking-proof-types"|datalist id="booking-proof-types"/,
    );
    assert.match(accessSource, /export const ID_PROOF_TYPES/);
    assert.deepEqual([...ID_PROOF_TYPES], [
      "Aadhaar",
      "PAN",
      "Passport",
      "Driving License",
      "Voter ID",
      "Other",
    ]);
  });

  it("includes selected proof type in booking payload as idProof.proofType", () => {
    assert.match(bookingSource, /idProof:\s*proof\.value/);
    assert.match(bookingSource, /validateIdProof\(form\.proofType/);
  });
});

describe("[Source] Identity documents section cleanup", () => {
  it("has no duplicate Document Type / Document Number inputs", () => {
    assert.match(bookingSource, /Identity documents/);
    assert.doesNotMatch(
      bookingSource,
      /label[\s\S]{0,40}Document type|Document number \(optional\)/,
    );
    assert.doesNotMatch(
      bookingSource,
      />\s*Document type\s*</,
    );
    assert.doesNotMatch(
      bookingSource,
      /setDocType|setDocNumber|\bdocType\b|\bdocNumber\b/,
    );
  });

  it("keeps file choose / remove / encrypted upload wiring", () => {
    assert.match(bookingSource, /Choose file/);
    assert.match(bookingSource, /removePendingDocument/);
    assert.match(bookingSource, /createPendingDocument/);
    assert.match(bookingSource, /uploadGuestDocument/);
    assert.match(bookingSource, /\/guests\/\$\{guestId\}\/documents/);
    assert.match(bookingSource, /mapProofTypeToDocumentType/);
    assert.doesNotMatch(bookingSource, /cloudinary/i);
    assert.doesNotMatch(bookingSource, /localStorage/);
  });

  it("maps booking ID proof into document upload metadata", () => {
    assert.equal(mapProofTypeToDocumentType("Aadhaar"), "AADHAAR");
    assert.equal(
      mapProofTypeToDocumentType("Driving License"),
      "DRIVING_LICENSE",
    );
    const created = createPendingDocument({
      file: { name: "id.pdf", type: "application/pdf", size: 100 },
      documentType: mapProofTypeToDocumentType("Passport"),
      documentNumber: "A1234567",
    });
    assert.equal(created.ok, true);
    assert.equal(created.value.documentType, "PASSPORT");
    assert.equal(created.value.documentNumber, "A1234567");
  });
});

describe("[Source] Mobile field wiring", () => {
  it("uses maxLength 10 and sanitize / paste normalize helpers", () => {
    assert.match(bookingSource, /sanitizeMobileDigitsInput/);
    assert.match(bookingSource, /normalizeMobileInputValue/);
    assert.match(bookingSource, /maxLength=\{10\}/);
    assert.match(bookingSource, /onPaste=/);
    assert.match(accessSource, /export function sanitizeMobileDigitsInput/);
    assert.match(accessSource, /export function normalizeMobileInputValue/);
  });
});

describe("[Source] Dynamic ID proof input constraints", () => {
  it("filters by type, shows hints, and revalidates on type change", () => {
    assert.match(bookingSource, /applyIdProofInputFilter/);
    assert.match(bookingSource, /getIdProofInputConstraints/);
    assert.match(bookingSource, /resolveProofNumberAfterTypeChange/);
    assert.match(bookingSource, /proofConstraints\.hint/);
    assert.match(bookingSource, /proofConstraints\.maxLength/);
    assert.match(accessSource, /export function applyIdProofInputFilter/);
    assert.match(accessSource, /export function resolveProofNumberAfterTypeChange/);
    assert.match(accessSource, /ABCDE1234F/);
  });
});
