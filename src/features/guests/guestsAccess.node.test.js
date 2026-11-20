/**
 * Label: Unit
 * Guest detail display + document type mapping (no network).
 *
 * Run: node --test src/features/guests/guestsAccess.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  NOT_PROVIDED,
  displayGuestField,
  formatGuestDate,
  formatGuestIdentity,
  formatGuestLocation,
  mapGuestDetailResponse,
  mapProofTypeToDocumentType,
  validatePendingDocumentFile,
} from "./guestProfileDisplay.js";

describe("[Unit] guest display helpers", () => {
  it("shows Not provided for blank optional fields", () => {
    assert.equal(displayGuestField(""), NOT_PROVIDED);
    assert.equal(displayGuestField(null), NOT_PROVIDED);
    assert.equal(
      displayGuestField({
        v: 1,
        alg: "AES-256-GCM",
        kid: "k",
        iv: "i",
        tag: "t",
        ct: "c",
        wrappedDek: "w",
        aad: "a",
      }),
      NOT_PROVIDED,
    );
    assert.equal(displayGuestField("  Ada  "), "Ada");
    assert.equal(formatGuestDate(null), NOT_PROVIDED);
    assert.equal(formatGuestIdentity({}), NOT_PROVIDED);
    assert.equal(
      formatGuestIdentity({
        identityType: "Aadhaar",
        maskedIdentityNumber: "****3333",
      }),
      "Aadhaar · ****3333",
    );
    assert.equal(formatGuestLocation({}), NOT_PROVIDED);
    assert.equal(
      formatGuestLocation({ city: "Pune", state: "MH" }),
      "Pune, MH",
    );
  });

  it("maps guest detail API payload without inventing booking fields", () => {
    const mapped = mapGuestDetailResponse({
      _id: "507f1f77bcf86cd799439011",
      fullName: " Ada Guest ",
      phone: "9876543210",
      identityType: "Passport",
      maskedIdentityNumber: "****9X",
      nationality: null,
      address: "  ",
    });
    assert.equal(mapped.id, "507f1f77bcf86cd799439011");
    assert.equal(mapped.fullName, "Ada Guest");
    assert.equal(mapped.phone, "9876543210");
    assert.equal(mapped.identityType, "Passport");
    assert.equal(mapped.maskedIdentityNumber, "****9X");
    assert.equal(mapped.nationality, "");
    assert.equal(mapped.address, "");
    assert.equal(mapGuestDetailResponse(null), null);
  });
});

describe("[Unit] document helpers", () => {
  it("maps booking proof labels to document types", () => {
    assert.equal(mapProofTypeToDocumentType("Aadhaar"), "AADHAAR");
    assert.equal(mapProofTypeToDocumentType("Driving Licence"), "DRIVING_LICENSE");
    assert.equal(mapProofTypeToDocumentType("Voter ID"), "VOTER_ID");
    assert.equal(mapProofTypeToDocumentType("Passport"), "PASSPORT");
    assert.equal(mapProofTypeToDocumentType("Something Else"), "OTHER");
  });

  it("validates pending file type and size", () => {
    assert.equal(
      validatePendingDocumentFile({
        name: "id.pdf",
        type: "application/pdf",
        size: 1024,
      }).ok,
      true,
    );
    assert.equal(
      validatePendingDocumentFile({
        name: "id.exe",
        type: "application/octet-stream",
        size: 10,
      }).ok,
      false,
    );
    assert.equal(
      validatePendingDocumentFile({
        name: "big.pdf",
        type: "application/pdf",
        size: 9 * 1024 * 1024,
      }).ok,
      false,
    );
  });
});
