import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("[Source] Automatic Mode KOT wiring", () => {
  it("LiveOrderMonitor auto-prints with dedupe and failure retry", () => {
    const source = readFileSync(join(__dirname, "LiveOrderMonitor.jsx"), "utf8");
    assert.match(source, /queueAutomaticKotPrint/);
    assert.match(source, /dedupe:\s*true/);
    assert.match(source, /kotPrintFailures/);
    assert.match(source, /Retry KOT/);
    assert.doesNotMatch(source, /itemReadyStatus:\s*"READY"/);
    assert.doesNotMatch(source, /kotAutoPrint/);
  });

  it("GlobalOrderAlert routes automatic orders to print without Accept", () => {
    const source = readFileSync(
      join(__dirname, "../../components/GlobalOrderAlert.jsx"),
      "utf8",
    );
    assert.match(source, /shouldAutoPrintNewOrder/);
    assert.match(source, /autoPrintKOT/);
    assert.match(source, /shouldAutoPrintRunningOrder/);
  });

  it("RestaurantProfile exposes automaticMode toggle", () => {
    const source = readFileSync(
      join(__dirname, "../profile/RestaurantProfile.jsx"),
      "utf8",
    );
    assert.match(source, /automaticMode/);
    assert.match(source, /handleAutomaticModeToggle/);
    assert.doesNotMatch(source, /kotAutoPrint/);
  });

  it("LiveOrderMonitor relaxes table bill and Room Folio release when automaticMode is on", () => {
    const source = readFileSync(join(__dirname, "LiveOrderMonitor.jsx"), "utf8");
    assert.match(source, /isTableBillBlockedByReadiness\(order,\s*\{\s*automaticMode/);
    assert.match(
      source,
      /isRoomFolioReleaseBlockedByReadiness\(order,\s*\{\s*automaticMode/,
    );
    // Kitchen readiness shortcuts remain available (status not faked)
    assert.match(source, /Mark ready/);
    assert.match(source, /Mark served/);
  });
});
