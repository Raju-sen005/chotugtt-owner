import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCategoryTabs,
  cartTotals,
  filterCatalogSections,
  isItemAvailable,
  itemKey,
  roomOrderingStatusMeta,
  validateGuestName,
  validateGuestPhone,
} from "./roomMenuUx.js";

describe("[Unit] RoomMenu guest form validation", () => {
  it("requires a valid name every time", () => {
    assert.equal(validateGuestName("").ok, false);
    assert.equal(validateGuestName("Jo").ok, false);
    assert.equal(validateGuestName("John Doe").ok, true);
    assert.equal(validateGuestName("John123").ok, false);
  });

  it("treats phone as optional but validates when provided", () => {
    assert.equal(validateGuestPhone("").ok, true);
    assert.equal(validateGuestPhone("9876543210").ok, true);
    assert.equal(validateGuestPhone("12345").ok, false);
    assert.equal(validateGuestPhone("5876543210").ok, false);
  });
});

describe("[Unit] RoomMenu catalog filtering", () => {
  const categories = {
    Starters: [
      { id: "1", name: "Soup", description: "Tomato", isAvailable: true },
      { id: "2", name: "Salad", description: "Garden", isAvailable: false },
    ],
    Mains: [{ id: "3", name: "Pasta", description: "Creamy", isAvailable: true }],
  };
  const categoryOrder = ["Starters", "Mains"];
  const combos = [{ id: "c1", name: "Lunch Combo", description: "Soup + pasta" }];

  it("builds category tabs including combos", () => {
    const tabs = buildCategoryTabs({ categoryOrder, categories, combos });
    assert.deepEqual(
      tabs.map((t) => t.id),
      ["combos", "Starters", "Mains"],
    );
  });

  it("filters by selected category and search", () => {
    const starters = filterCatalogSections({
      categoryOrder,
      categories,
      combos,
      selectedCategory: "Starters",
      searchQuery: "",
    });
    assert.equal(starters.length, 1);
    assert.equal(starters[0].id, "Starters");

    const search = filterCatalogSections({
      categoryOrder,
      categories,
      combos,
      selectedCategory: "Starters",
      searchQuery: "pasta",
    });
    assert.equal(search.some((s) => s.id === "Mains"), true);
    assert.equal(search.some((s) => s.id === "combos"), true);
  });

  it("respects availability and item keys", () => {
    assert.equal(isItemAvailable({ isAvailable: false }), false);
    assert.equal(isItemAvailable({ isAvailable: true }), true);
    assert.equal(isItemAvailable({}), true);
    assert.equal(itemKey({ id: "abc" }), "abc");
    assert.equal(itemKey({ _id: "xyz" }), "xyz");
  });
});

describe("[Unit] RoomMenu cart + auth status helpers", () => {
  it("computes cart totals from quantities", () => {
    const { totalItems, subtotal, entries } = cartTotals({
      a: { quantity: 2, price: 100 },
      b: { quantity: 1, price: 50 },
    });
    assert.equal(totalItems, 3);
    assert.equal(subtotal, 250);
    assert.equal(entries.length, 2);
  });

  it("maps pre-check-in vs active-stay status labels", () => {
    const ready = roomOrderingStatusMeta({
      orderingEnabled: true,
      guestMessage: "Welcome to Room 101!",
    });
    assert.equal(ready.tone, "ready");
    assert.match(ready.label, /Ordering available/i);

    const browse = roomOrderingStatusMeta({
      orderingEnabled: false,
      guestMessage: "Ordering unlocks after check-in.",
    });
    assert.equal(browse.tone, "browse");
    assert.match(browse.label, /Browse only/i);
    assert.match(browse.detail, /check-in/i);
  });
});
