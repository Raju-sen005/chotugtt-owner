import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  SPECIAL_INSTRUCTIONS_MAX,
  buildCartLineKey,
  createCartLineId,
  findCartLineId,
  normalizeSpecialInstructions,
  resolveItemSpecialInstructions,
} from "./itemSpecialInstructions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("[Unit] itemSpecialInstructions helpers", () => {
  it("normalizes empty / unsafe text", () => {
    assert.equal(normalizeSpecialInstructions("  "), "");
    assert.equal(
      normalizeSpecialInstructions("<script>x</script>less oil"),
      "x less oil",
    );
    assert.equal(
      normalizeSpecialInstructions("a".repeat(250)).length,
      SPECIAL_INSTRUCTIONS_MAX,
    );
  });

  it("keeps same SKU with different instructions as separate content keys", () => {
    assert.notEqual(
      buildCartLineKey("m1", "less spicy"),
      buildCartLineKey("m1", "no onion"),
    );
    assert.equal(buildCartLineKey("m1", "less spicy"), buildCartLineKey("m1", " less spicy "));
  });

  it("findCartLineId merges identical instructions only", () => {
    const a = createCartLineId();
    const b = createCartLineId();
    const cart = {
      [a]: { catalogId: "m1", specialInstructions: "less spicy", quantity: 1 },
      [b]: { catalogId: "m1", specialInstructions: "no onion", quantity: 1 },
    };
    assert.equal(findCartLineId(cart, "m1", "less spicy"), a);
    assert.equal(findCartLineId(cart, "m1", "no onion"), b);
    assert.equal(findCartLineId(cart, "m1", ""), null);
  });

  it("resolve prefers specialInstructions then notes", () => {
    assert.equal(
      resolveItemSpecialInstructions({
        specialInstructions: "a",
        notes: "b",
      }),
      "a",
    );
    assert.equal(resolveItemSpecialInstructions({ notes: "legacy" }), "legacy");
    assert.equal(resolveItemSpecialInstructions({}), "");
  });
});

describe("[Source] capture + kitchen display wiring", () => {
  it("PublicMenu / RoomMenu / CounterPOS send specialInstructions", () => {
    const publicMenu = readFileSync(
      join(__dirname, "../public/PublicMenu.jsx"),
      "utf8",
    );
    const roomMenu = readFileSync(
      join(__dirname, "../public/RoomMenu.jsx"),
      "utf8",
    );
    const pos = readFileSync(
      join(__dirname, "../../components/CounterPOS.jsx"),
      "utf8",
    );
    assert.match(publicMenu, /specialInstructions/);
    assert.match(publicMenu, /createCartLineId/);
    assert.match(roomMenu, /specialInstructions/);
    assert.doesNotMatch(roomMenu, /notes:\s*""/);
    assert.match(pos, /specialInstructions/);
    assert.match(pos, /cartLineId/);
  });

  it("LiveOrderMonitor / OrderDetailsModal / GlobalOrderAlert show instructions", () => {
    const live = readFileSync(join(__dirname, "LiveOrderMonitor.jsx"), "utf8");
    const modal = readFileSync(
      join(__dirname, "../../components/OrderDetailsModal.jsx"),
      "utf8",
    );
    const alert = readFileSync(
      join(__dirname, "../../components/GlobalOrderAlert.jsx"),
      "utf8",
    );
    assert.match(live, /resolveItemSpecialInstructions/);
    assert.match(modal, /resolveItemSpecialInstructions/);
    assert.match(alert, /resolveItemSpecialInstructions/);
    assert.doesNotMatch(live, /order\.notes\s*\?/);
  });
});
