import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cartTotals,
  isItemAvailable,
  matchesMenuSearch,
  offerBadgeLabel,
  tableWelcomeMessage,
  validateGuestName,
  validateGuestPhone,
} from "./publicMenuUx.js";

describe("[Unit] PublicMenu guest form validation", () => {
  it("requires a valid name every time", () => {
    assert.equal(validateGuestName("").ok, false);
    assert.equal(validateGuestName("Al").ok, false);
    assert.equal(validateGuestName("Anita Rao").ok, true);
    assert.equal(validateGuestName("Anita123").ok, false);
  });

  it("treats phone as optional but validates when provided", () => {
    assert.equal(validateGuestPhone("").ok, true);
    assert.equal(validateGuestPhone("9876543210").ok, true);
    assert.equal(validateGuestPhone("123").ok, false);
  });
});

describe("[Unit] PublicMenu catalog helpers", () => {
  it("matches search against name and description", () => {
    assert.equal(
      matchesMenuSearch({ name: "Paneer Tikka", description: "Smoky" }, "tikka"),
      true,
    );
    assert.equal(
      matchesMenuSearch({ name: "Soup", description: "Tomato" }, "pasta"),
      false,
    );
  });

  it("respects availability and offer labels", () => {
    assert.equal(isItemAvailable({ isAvailable: false }), false);
    assert.equal(isItemAvailable({}), true);
    assert.equal(
      offerBadgeLabel({ discountType: "PERCENT", discountValue: 10 }),
      "10% OFF",
    );
    assert.equal(
      offerBadgeLabel({ discountType: "FLAT", discountValue: 50 }),
      "₹50 OFF",
    );
  });

  it("computes cart totals", () => {
    const { totalItems, subtotal } = cartTotals({
      a: { quantity: 2, price: 120 },
      b: { quantity: 1, price: 80 },
    });
    assert.equal(totalItems, 3);
    assert.equal(subtotal, 320);
  });
});

describe("[Unit] PublicMenu welcome copy", () => {
  it("shows table number without exposing tokens", () => {
    const msg = tableWelcomeMessage({
      tableNumber: "12",
      restaurantName: "Cafe Ember",
    });
    assert.match(msg, /Table 12/);
    assert.match(msg, /Cafe Ember/);
    assert.doesNotMatch(msg, /token|ObjectId|eyJ/i);
  });
});
