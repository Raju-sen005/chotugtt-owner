import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isRoomFolioReleaseBlockedByReadiness,
  isTableBillBlockedByReadiness,
} from "./orderBillingGates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const preparingOrder = {
  status: "ACCEPTED",
  items: [
    { status: "ACTIVE", itemReadyStatus: "PREPARING" },
    { status: "REJECTED", itemReadyStatus: "PREPARING" },
  ],
};

const mixedOrder = {
  status: "ACCEPTED",
  items: [
    { status: "ACTIVE", itemReadyStatus: "PREPARING" },
    { status: "ACTIVE", itemReadyStatus: "READY" },
    { status: "ACTIVE", itemReadyStatus: "SERVED" },
  ],
};

describe("[Unit] table Generate Bill gates", () => {
  it("Automatic Mode ON + PREPARING → bill allowed", () => {
    assert.equal(
      isTableBillBlockedByReadiness(preparingOrder, { automaticMode: true }),
      false,
    );
  });

  it("Automatic Mode ON + mixed PREPARING/READY/SERVED → bill allowed", () => {
    assert.equal(
      isTableBillBlockedByReadiness(mixedOrder, { automaticMode: true }),
      false,
    );
  });

  it("Automatic Mode OFF + PREPARING → bill blocked", () => {
    assert.equal(
      isTableBillBlockedByReadiness(preparingOrder, { automaticMode: false }),
      true,
    );
  });

  it("rejected items do not block table bill when Automatic Mode ON", () => {
    assert.equal(
      isTableBillBlockedByReadiness(preparingOrder, { automaticMode: true }),
      false,
    );
  });
});

describe("[Unit] Room Folio release gates", () => {
  it("Automatic Mode ON + PREPARING → release allowed", () => {
    assert.equal(
      isRoomFolioReleaseBlockedByReadiness(preparingOrder, {
        automaticMode: true,
      }),
      false,
    );
  });

  it("Automatic Mode ON + not SERVED → no readiness block", () => {
    assert.equal(
      isRoomFolioReleaseBlockedByReadiness(mixedOrder, {
        automaticMode: true,
      }),
      false,
    );
  });

  it("Automatic Mode OFF + PREPARING → release blocked", () => {
    assert.equal(
      isRoomFolioReleaseBlockedByReadiness(preparingOrder, {
        automaticMode: false,
      }),
      true,
    );
    assert.equal(
      isRoomFolioReleaseBlockedByReadiness(mixedOrder, {
        automaticMode: false,
      }),
      true,
    );
  });

  it("Automatic Mode OFF allows only when every active item is SERVED", () => {
    assert.equal(
      isRoomFolioReleaseBlockedByReadiness(
        {
          items: [
            { status: "ACTIVE", itemReadyStatus: "SERVED" },
            { status: "REJECTED", itemReadyStatus: "PREPARING" },
          ],
        },
        { automaticMode: false },
      ),
      false,
    );
  });
});

describe("[Source] LiveOrderMonitor wires billing gates", () => {
  it("passes automaticMode into table and Room Folio readiness gates", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "LiveOrderMonitor.jsx"),
      "utf8",
    );
    assert.match(source, /isTableBillBlockedByReadiness/);
    assert.match(source, /isRoomFolioReleaseBlockedByReadiness/);
    assert.match(
      source,
      /isRoomFolioReleaseBlockedByReadiness\(order,\s*\{\s*automaticMode/,
    );
    assert.match(source, /handleCompleteForFolio/);
    assert.match(
      source,
      /Serve all active items before releasing to the Room Folio/,
    );
  });
});
