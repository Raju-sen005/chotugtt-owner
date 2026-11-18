/**
 * Label: Unit
 * New Room Booking identity document / guest sync helpers (no network).
 *
 * Run: node --test src/features/bookings/bookingIdentityDocs.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGuestCreatePayload,
  buildGuestIdentityPatch,
  createPendingDocument,
  isGuestEncryptionConfigError,
} from "./bookingIdentityDocs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("[Unit] buildGuestCreatePayload", () => {
  it("includes identity when requested", () => {
    const payload = buildGuestCreatePayload({
      fullName: "Ada",
      phone: "9876543210",
      identityType: "Aadhaar",
      identityNumber: "123456789012",
      includeIdentity: true,
    });
    assert.deepEqual(payload, {
      fullName: "Ada",
      phone: "9876543210",
      identityType: "Aadhaar",
      identityNumber: "123456789012",
    });
  });

  it("omits identity when includeIdentity is false", () => {
    const payload = buildGuestCreatePayload({
      fullName: "Ada",
      phone: "9876543210",
      identityType: "Aadhaar",
      identityNumber: "123456789012",
      includeIdentity: false,
    });
    assert.deepEqual(payload, {
      fullName: "Ada",
      phone: "9876543210",
    });
  });
});

describe("[Unit] buildGuestIdentityPatch", () => {
  it("does not overwrite existing guest identity with booking fields", () => {
    assert.equal(
      buildGuestIdentityPatch({
        guest: { identityType: "PAN", maskedIdentityNumber: "****234F" },
        identityType: "Aadhaar",
        identityNumber: "123456789012",
      }),
      null,
    );
  });

  it("fills empty guest identity from booking proof", () => {
    assert.deepEqual(
      buildGuestIdentityPatch({
        guest: { identityType: "", maskedIdentityNumber: "" },
        identityType: "Aadhaar",
        identityNumber: "123456789012",
      }),
      {
        identityType: "Aadhaar",
        identityNumber: "123456789012",
      },
    );
  });

  it("does not patch with empty booking fields", () => {
    assert.equal(
      buildGuestIdentityPatch({
        guest: {},
        identityType: "Aadhaar",
        identityNumber: "",
      }),
      null,
    );
  });
});

describe("[Unit] createPendingDocument + encryption error detect", () => {
  it("creates a pending document entry", () => {
    const created = createPendingDocument({
      file: { name: "aadhaar.pdf", type: "application/pdf", size: 2048 },
      documentType: "AADHAAR",
      documentNumber: "1234",
    });
    assert.equal(created.ok, true);
    assert.equal(created.value.fileName, "aadhaar.pdf");
    assert.equal(created.value.documentType, "AADHAAR");
    assert.equal(created.value.status, "pending");
  });

  it("detects guest storage configuration errors", () => {
    assert.equal(
      isGuestEncryptionConfigError({
        response: { data: { code: "GUEST_STORAGE_NOT_CONFIGURED" } },
      }),
      true,
    );
    assert.equal(
      isGuestEncryptionConfigError({
        response: { data: { code: "OTHER" } },
      }),
      false,
    );
  });
});

describe("[Source] BookingManagement identity documents section", () => {
  it("wires encrypted guest document upload into new booking form", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "BookingManagement.jsx"),
      "utf8",
    );
    assert.match(source, /Identity documents/);
    assert.match(source, /uploadGuestDocument/);
    assert.match(source, /\/guests\/\$\{guestId\}\/documents/);
    assert.match(source, /buildGuestCreatePayload/);
    assert.match(source, /buildGuestIdentityPatch/);
    assert.match(source, /mapProofTypeToDocumentType/);
    assert.doesNotMatch(source, />\s*Document type\s*</);
    assert.doesNotMatch(source, /Document number \(optional\)/);
    assert.doesNotMatch(source, /setDocType|setDocNumber|\bdocType\b|\bdocNumber\b/);
    assert.doesNotMatch(source, /cloudinary/i);
    assert.doesNotMatch(source, /localStorage/);
  });
});
