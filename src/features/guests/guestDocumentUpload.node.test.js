/**
 * Label: Unit / source-contract
 * Guest Details identity-document upload enablement.
 *
 * Run: node --test src/features/guests/guestDocumentUpload.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateGuestDocumentUpload,
  resolveGuestDocumentType,
  validateOptionalDocumentNumber,
  validatePendingDocumentFile,
  MAX_GUEST_DOCUMENT_BYTES,
} from "./guestProfileDisplay.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guestSource = fs.readFileSync(
  path.join(__dirname, "GuestManagement.jsx"),
  "utf8",
);

const validPdf = {
  name: "aadhaar.pdf",
  type: "application/pdf",
  size: 2048,
};

describe("[Unit] evaluateGuestDocumentUpload", () => {
  it("enables upload when a valid file is selected even if document number is empty", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: validPdf,
      isUploading: false,
      documentNumber: "",
      documentType: "AADHAAR",
    });
    assert.equal(result.enabled, true);
    assert.equal(result.reason, "");
  });

  it("enables upload when optional document number is whitespace-only", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: validPdf,
      isUploading: false,
      documentNumber: "   ",
      documentType: "AADHAAR",
    });
    assert.equal(result.enabled, true);
  });

  it("disables upload without PLUS entitlement", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: false,
      canManageDocs: true,
      file: validPdf,
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /PLUS/i);
  });

  it("disables upload without OWNER/MANAGER permission", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: false,
      file: validPdf,
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /owners and managers/i);
  });

  it("disables upload while an upload is in progress", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: validPdf,
      isUploading: true,
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /progress/i);
  });

  it("disables upload when no file is selected", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: null,
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /Select a valid document file/i);
  });

  it("disables upload for invalid file type", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: { name: "secret.exe", type: "application/octet-stream", size: 10 },
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /JPEG, PNG, WEBP, PDF/i);
  });

  it("disables upload for oversized files", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: {
        name: "big.pdf",
        type: "application/pdf",
        size: MAX_GUEST_DOCUMENT_BYTES + 1,
      },
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /8 MB/i);
  });

  it("disables upload when an entered document number fails type validation", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: validPdf,
      documentType: "AADHAAR",
      documentNumber: "123",
    });
    assert.equal(result.enabled, false);
    assert.match(result.reason, /Aadhaar/i);
  });

  it("keeps upload enabled when a valid optional document number is provided", () => {
    const result = evaluateGuestDocumentUpload({
      entitled: true,
      canManageDocs: true,
      file: validPdf,
      documentType: "AADHAAR",
      documentNumber: "123456789012",
    });
    assert.equal(result.enabled, true);
  });
});

describe("[Unit] validatePendingDocumentFile + optional number", () => {
  it("accepts JPEG/PNG/WEBP/PDF under 8 MB", () => {
    assert.equal(
      validatePendingDocumentFile({
        name: "id.jpg",
        type: "image/jpeg",
        size: 100,
      }).ok,
      true,
    );
    assert.equal(
      validatePendingDocumentFile({
        name: "id.png",
        type: "image/png",
        size: 100,
      }).ok,
      true,
    );
    assert.equal(
      validatePendingDocumentFile({
        name: "id.webp",
        type: "image/webp",
        size: 100,
      }).ok,
      true,
    );
    assert.equal(validatePendingDocumentFile(validPdf).ok, true);
  });

  it("rejects invalid and oversized files", () => {
    assert.equal(
      validatePendingDocumentFile({
        name: "x.txt",
        type: "text/plain",
        size: 10,
      }).ok,
      false,
    );
    assert.equal(
      validatePendingDocumentFile({
        name: "x.pdf",
        type: "application/pdf",
        size: MAX_GUEST_DOCUMENT_BYTES + 5,
      }).ok,
      false,
    );
  });

  it("treats empty document number as valid", () => {
    assert.equal(validateOptionalDocumentNumber("AADHAAR", "").ok, true);
    assert.equal(validateOptionalDocumentNumber("PAN", null).ok, true);
  });

  it("maps guest identity type to document type enum", () => {
    assert.equal(resolveGuestDocumentType("Aadhaar"), "AADHAAR");
    assert.equal(resolveGuestDocumentType(""), "OTHER");
  });
});

describe("[Source] GuestManagement identity documents upload UX", () => {
  it("removes Document Type / Document Number inputs from Identity Documents", () => {
    assert.match(guestSource, /Identity documents/);
    assert.doesNotMatch(guestSource, />\s*Document type\s*</);
    assert.doesNotMatch(
      guestSource,
      /Document number \(optional, stored masked\)/,
    );
    assert.doesNotMatch(
      guestSource,
      /uploadType|uploadNumber|setUploadType|setUploadNumber/,
    );
  });

  it("wires evaluateGuestDocumentUpload and encrypted guest document API", () => {
    assert.match(guestSource, /evaluateGuestDocumentUpload/);
    assert.match(guestSource, /validatePendingDocumentFile/);
    assert.match(guestSource, /Upload document/);
    assert.match(guestSource, /disabled=\{!uploadGate\.enabled\}/);
    assert.match(guestSource, /\/guests\/\$\{detailGuestId\}\/documents/);
    assert.match(guestSource, /invalidateDetail/);
    assert.doesNotMatch(guestSource, /cloudinary/i);
  });

  it("surfaces disabled-state explanation from uploadGate.reason", () => {
    assert.match(guestSource, /uploadGate\.reason/);
  });
});
