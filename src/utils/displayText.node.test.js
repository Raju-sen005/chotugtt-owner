/**
 * Label: Unit
 * displayText must never pass FieldCrypto envelopes to React children.
 *
 * Run: node --test src/utils/displayText.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  asDisplayText,
  displayCustomerPhone,
  displayEmail,
  displayPhone,
} from "./displayText.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ENVELOPE = {
  v: 1,
  alg: "AES-256-GCM",
  kid: "field-kek-v1",
  iv: "aa",
  tag: "bb",
  ct: "cc",
  wrappedDek: "dd",
  aad: "ee",
};

describe("[Unit] displayText FieldCrypto guards", () => {
  it("returns plaintext strings unchanged", () => {
    assert.equal(displayCustomerPhone("9876543210"), "9876543210");
    assert.equal(displayEmail("a@b.co"), "a@b.co");
    assert.equal(asDisplayText("  hello  "), "hello");
  });

  it("never returns FieldCrypto envelopes", () => {
    assert.equal(displayCustomerPhone(ENVELOPE), "");
    assert.equal(displayEmail(ENVELOPE), "—");
    assert.equal(displayPhone(ENVELOPE), "—");
    assert.equal(asDisplayText(ENVELOPE, "—"), "—");
    assert.equal(typeof displayCustomerPhone(ENVELOPE), "string");
  });

  it("Payment and staff consumers import display helpers", () => {
    const payment = fs.readFileSync(
      path.join(__dirname, "../features/payment/Payment.jsx"),
      "utf8",
    );
    assert.match(payment, /displayCustomerPhone/);
    const staff = fs.readFileSync(
      path.join(__dirname, "../features/profile/StaffManagement.jsx"),
      "utf8",
    );
    assert.match(staff, /displayStaffEmail/);
  });
});
