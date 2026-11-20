/**
 * Label: Unit
 * Staff email display must never render FieldCrypto envelopes.
 *
 * Run: node --test src/features/profile/staffDisplay.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  displayStaffEmail,
  staffEmailForForm,
  staffEmailSearchText,
} from "./staffDisplay.js";

describe("[Unit] staffDisplay email safety", () => {
  it("renders plaintext email strings", () => {
    assert.equal(displayStaffEmail("captain@example.test"), "captain@example.test");
    assert.equal(displayStaffEmail("  captain@example.test  "), "captain@example.test");
  });

  it("shows dash for missing or blank email", () => {
    assert.equal(displayStaffEmail(""), "—");
    assert.equal(displayStaffEmail("   "), "—");
    assert.equal(displayStaffEmail(null), "—");
    assert.equal(displayStaffEmail(undefined), "—");
  });

  it("never renders envelope objects (no crash / no JSON)", () => {
    const envelope = {
      v: 1,
      alg: "AES-256-GCM",
      kid: "field-kek-v1",
      iv: "x",
      tag: "y",
      ct: "z",
      wrappedDek: "w",
      aad: "a",
    };
    assert.equal(displayStaffEmail(envelope), "—");
    assert.equal(staffEmailForForm(envelope), "");
    assert.equal(staffEmailSearchText(envelope), "");
    assert.doesNotMatch(displayStaffEmail(envelope), /wrappedDek|AES-256-GCM|\{/);
  });
});
