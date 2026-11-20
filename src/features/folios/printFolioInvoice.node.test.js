/**
 * Room Folio A4 invoice HTML contracts (no browser, no network).
 * Run: node --test src/features/folios/printFolioInvoice.node.test.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildFolioInvoiceHtml,
  escapeHtml,
} from "./printFolioInvoice.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sampleReceipt = ({ invoiceKind = "FINAL", status = "SETTLED", dueAmount = 0 } = {}) => ({
  receiptType: "ROOM_FOLIO",
  invoiceKind,
  invoiceKindLabel:
    invoiceKind === "FINAL" ? "FINAL INVOICE" : "DRAFT / INTERIM BILL",
  invoiceNumber: "F-TEST-001",
  folioNumber: "F-TEST-001",
  invoiceDate: "2026-11-17T10:00:00.000Z",
  currency: "INR",
  status,
  restaurant: {
    name: "Chotu <Stay>",
    phone: "9000000000",
    gstNumber: "27AAAAA0000A1Z5",
    fssaiNumber: "10987654321098",
    address: { street: "1 MG Road", city: "Pune", state: "MH", zip: "411001" },
  },
  guest: { fullName: "Ada & Co", phone: "9876543210" },
  room: { roomNumber: "101", roomType: "Deluxe" },
  booking: {
    id: "booking123",
    checkInDate: "2026-11-15",
    checkOutDate: "2026-11-17",
  },
  folio: { folioNumber: "F-TEST-001", status },
  totals: {
    subtotal: 2500,
    discountTotal: 50,
    taxTotal: 100,
    grandTotal: 2550,
    paidAmount: 2550 - dueAmount,
    dueAmount,
  },
  chargeGroups: {
    roomRent: [
      {
        description: "Room rent (2 nights)",
        quantity: 2,
        unitPrice: 1000,
        chargeableAmount: 2000,
      },
    ],
    foodOrders: [
      {
        description: "Room order #1",
        quantity: 1,
        unitPrice: 450,
        chargeableAmount: 450,
        sourceId: "ord1",
      },
    ],
    hotelServices: [
      {
        description: "Laundry",
        quantity: 1,
        unitPrice: 100,
        chargeableAmount: 100,
      },
    ],
    adjustments: [
      {
        description: "Goodwill discount",
        quantity: 1,
        unitPrice: -50,
        chargeableAmount: -50,
      },
    ],
  },
  payments: [
    { method: "UPI", amount: 1500, createdAt: "2026-11-16T12:00:00.000Z" },
    { method: "CASH", amount: 1050 - dueAmount, createdAt: "2026-11-17T09:00:00.000Z" },
  ],
});

describe("[Unit] escapeHtml", () => {
  it("escapes markup", () => {
    assert.equal(escapeHtml(`A <B> & "C"`), "A &lt;B&gt; &amp; &quot;C&quot;");
  });
});

describe("[Unit] buildFolioInvoiceHtml A4", () => {
  it("renders FINAL invoice with A4 CSS, folio number, charges once, payments", () => {
    const html = buildFolioInvoiceHtml(sampleReceipt({ invoiceKind: "FINAL" }));
    assert.match(html, /@page \{ size: A4/);
    assert.match(html, /FINAL INVOICE/);
    assert.match(html, /F-TEST-001/);
    assert.match(html, /Chotu &lt;Stay&gt;/);
    assert.match(html, /GSTIN:\s*27AAAAA0000A1Z5/);
    assert.match(html, /FSSAI:\s*10987654321098/);
    assert.match(html, /Ada &amp; Co/);
    assert.match(html, /9876543210/);
    assert.match(html, /Room:\s*101/);
    assert.match(html, /booking123/);
    assert.match(html, /Room rent \(2 nights\)/);
    assert.match(html, /Room order #1/);
    assert.match(html, /Laundry/);
    assert.match(html, /Goodwill discount/);
    assert.match(html, /Outstanding balance/);
    assert.match(html, /UPI/);
    assert.match(html, /CASH/);
    assert.doesNotMatch(html, /DRAFT \/ INTERIM BILL/);
    assert.doesNotMatch(html, /wrappedDek|proofNumber|identityNumber/i);
    // Food description appears once in body tables
    assert.equal((html.match(/Room order #1/g) || []).length, 1);
  });

  it("renders OPEN interim bill with DRAFT watermark and outstanding", () => {
    const html = buildFolioInvoiceHtml(
      sampleReceipt({ invoiceKind: "DRAFT", status: "OPEN", dueAmount: 600 }),
    );
    assert.match(html, /DRAFT \/ INTERIM BILL/);
    assert.match(html, /class="watermark"/);
    assert.match(html, /interim bill/i);
    assert.match(html, /Outstanding balance/);
  });
});

describe("[Source] FolioManagement wires Print Invoice + access gates", () => {
  it("calls receipt endpoint and printFolioInvoice for view roles", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "FolioManagement.jsx"),
      "utf8",
    );
    const access = fs.readFileSync(
      path.join(__dirname, "folioAccess.js"),
      "utf8",
    );
    assert.match(source, /printFolioInvoice/);
    assert.match(source, /folio\/receipt/);
    assert.match(source, /Print invoice/);
    assert.match(source, /Print interim bill/);
    assert.match(source, /canView/);
    assert.match(access, /hasRoomFolioAccess/);
    assert.match(access, /FEATURE_KEYS\.ROOM_FOLIO|ROOM_FOLIO/);
    assert.match(access, /hasAvailableFeature/);
    assert.match(access, /canViewFolio/);
    assert.match(access, /\["OWNER", "MANAGER", "STAFF"\]/);
    assert.match(access, /FOLIO_SETTLING/);
    assert.match(access, /FOLIO_VOID/);
  });
});
