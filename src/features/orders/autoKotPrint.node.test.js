import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildKotPrintJobKey,
  claimKotPrintJob,
  releaseKotPrintJob,
  resolveAutoKotItems,
  shouldAutoPrintNewOrder,
  shouldAutoPrintRunningOrder,
  stripAutoKotMeta,
} from "./autoKotPrint.js";

describe("[Unit] autoKotPrint dedupe + meta", () => {
  it("dedupes identical print jobs and allows retry after release", () => {
    const key = buildKotPrintJobKey({
      orderId: "ord1",
      items: [{ _id: "a" }, { _id: "b" }],
      kotType: "NEW",
    });
    assert.equal(claimKotPrintJob(key), true);
    assert.equal(claimKotPrintJob(key), false);
    releaseKotPrintJob(key);
    assert.equal(claimKotPrintJob(key), true);
    releaseKotPrintJob(key);
  });

  it("strips socket meta before caching order documents", () => {
    const { order, meta } = stripAutoKotMeta({
      _id: "o1",
      status: "ACCEPTED",
      items: [{ _id: "i1" }],
      automaticAccepted: true,
      automaticMode: true,
      kotItems: [{ _id: "i1" }],
      kotType: "NEW",
    });
    assert.equal(order.status, "ACCEPTED");
    assert.equal(order.automaticAccepted, undefined);
    assert.equal(meta.automaticAccepted, true);
    assert.equal(meta.kotType, "NEW");
  });

  it("auto-prints new ACCEPTED automatic orders only", () => {
    assert.equal(
      shouldAutoPrintNewOrder(
        { automaticMode: true, kotItems: [{ _id: "1" }] },
        { status: "ACCEPTED", items: [{ _id: "1", status: "ACTIVE" }] },
      ),
      true,
    );
    assert.equal(
      shouldAutoPrintNewOrder(
        { automaticMode: true, kotItems: [{ _id: "1" }] },
        { status: "PENDING", items: [{ _id: "1" }] },
      ),
      false,
    );
    assert.equal(
      shouldAutoPrintNewOrder(
        { automaticMode: false },
        { status: "ACCEPTED", items: [{ _id: "1", kotPrintedAt: null }] },
      ),
      false,
    );
  });

  it("auto-prints running appends only when flagged", () => {
    assert.equal(
      shouldAutoPrintRunningOrder(
        { automaticMode: true },
        [{ _id: "x", status: "ACTIVE" }],
      ),
      true,
    );
    assert.equal(
      shouldAutoPrintRunningOrder({ automaticMode: false }, [{ _id: "x" }]),
      false,
    );
  });

  it("prefers explicit kotItems over full order lines", () => {
    const items = resolveAutoKotItems(
      {
        items: [
          { _id: "old", kotPrintedAt: new Date() },
          { _id: "new", kotPrintedAt: null },
        ],
      },
      { kotItems: [{ _id: "new", status: "ACTIVE" }] },
    );
    assert.deepEqual(
      items.map((i) => i._id),
      ["new"],
    );
  });
});
