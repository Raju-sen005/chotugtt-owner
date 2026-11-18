/**
 * Room Folio A4 invoice HTML + browser print (Save as PDF via print dialog).
 * Uses folio receipt snapshot from GET …/folio/receipt — never invents totals.
 */

import { printDocumentHtml } from "../../utils/printDocumentHtml.js";

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoneyInr(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(address) {
  if (!address || typeof address !== "object") return "";
  return [address.street, address.city, address.state, address.zip]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(", ");
}

function lineAmount(line) {
  if (line?.chargeableAmount != null && Number.isFinite(Number(line.chargeableAmount))) {
    return Number(line.chargeableAmount);
  }
  if (line?.total != null && Number.isFinite(Number(line.total))) {
    return Number(line.total);
  }
  const n =
    Number(line?.subtotal || 0) -
    Number(line?.discountAmount || 0) +
    Number(line?.taxAmount || 0);
  return Number.isFinite(n) ? n : 0;
}

function renderLineRows(lines, currency) {
  if (!lines?.length) {
    return `<tr><td colspan="4" class="muted">None</td></tr>`;
  }
  return lines
    .map((line) => {
      const qty = Number(line.quantity ?? 1);
      const amount = lineAmount(line);
      return `<tr>
        <td>${escapeHtml(line.description || line.sourceType || "Charge")}</td>
        <td class="num">${escapeHtml(String(qty))}</td>
        <td class="num">${escapeHtml(formatMoneyInr(line.unitPrice, currency))}</td>
        <td class="num">${escapeHtml(formatMoneyInr(amount, currency))}</td>
      </tr>`;
    })
    .join("");
}

/**
 * Build complete A4 invoice HTML document from receipt snapshot.
 */
export function buildFolioInvoiceHtml(receipt) {
  if (!receipt || typeof receipt !== "object") {
    throw new Error("Missing folio invoice receipt.");
  }

  const currency = receipt.currency || "INR";
  const kind = String(receipt.invoiceKind || "").toUpperCase();
  const isDraft = kind !== "FINAL";
  const title = isDraft ? "DRAFT / INTERIM BILL" : "FINAL INVOICE";
  const invoiceNumber = receipt.invoiceNumber || receipt.folioNumber || "—";
  const restaurant = receipt.restaurant || {};
  const guest = receipt.guest || {};
  const room = receipt.room || {};
  const booking = receipt.booking || {};
  const totals = receipt.totals || {};
  const groups = receipt.chargeGroups || {};
  const payments = receipt.payments || [];

  const addressLine = formatAddress(restaurant.address);
  const watermark = isDraft
    ? `<div class="watermark" aria-hidden="true">DRAFT / INTERIM BILL</div>`
    : "";

  const paymentRows = payments.length
    ? payments
        .map((p) => {
          const method = p.method || p.paymentMethod || "—";
          const amount = Number(p.amount || 0);
          const when = formatDateTime(p.createdAt || p.paidAt);
          return `<tr>
            <td>${escapeHtml(when)}</td>
            <td>${escapeHtml(method)}</td>
            <td class="num">${escapeHtml(formatMoneyInr(amount, currency))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="3" class="muted">No payments recorded</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} ${escapeHtml(invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
    }
    .sheet {
      position: relative;
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 0;
    }
    .watermark {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-28deg);
      font-size: 42pt;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: rgba(180, 40, 40, 0.12);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }
    .content { position: relative; z-index: 1; }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .brand h1 {
      margin: 0 0 4px;
      font-size: 16pt;
      font-weight: 800;
    }
    .brand p, .meta p { margin: 0 0 2px; font-size: 9.5pt; color: #333; }
    .meta { text-align: right; }
    .meta .badge {
      display: inline-block;
      margin-bottom: 6px;
      padding: 3px 8px;
      border: 1.5px solid ${isDraft ? "#b45309" : "#065f46"};
      color: ${isDraft ? "#92400e" : "#065f46"};
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.04em;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 20px;
      margin-bottom: 14px;
    }
    .box h2 {
      margin: 0 0 6px;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
    }
    .box p { margin: 0 0 2px; font-size: 10pt; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 12px;
    }
    caption {
      text-align: left;
      font-weight: 700;
      font-size: 10pt;
      margin-bottom: 4px;
      caption-side: top;
    }
    th, td {
      border-bottom: 1px solid #ddd;
      padding: 5px 4px;
      vertical-align: top;
      font-size: 9.5pt;
    }
    th {
      text-align: left;
      border-bottom: 1.5px solid #111;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #444;
    }
    td.num, th.num { text-align: right; white-space: nowrap; }
    td.muted { color: #777; font-style: italic; }
    .totals {
      width: 62%;
      margin-left: auto;
      margin-top: 4px;
    }
    .totals td { border: none; padding: 3px 4px; }
    .totals tr.grand td {
      border-top: 2px solid #111;
      font-weight: 800;
      font-size: 11pt;
      padding-top: 8px;
    }
    .totals tr.due td { font-weight: 700; color: #9a3412; }
    .totals tr.paid td { color: #065f46; }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px dashed #bbb;
      font-size: 8.5pt;
      color: #666;
    }
    @media print {
      .watermark { color: rgba(180, 40, 40, 0.14); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  ${watermark}
  <div class="sheet content">
    <header class="header">
      <div class="brand">
        <h1>${escapeHtml(restaurant.name || "Restaurant")}</h1>
        ${addressLine ? `<p>${escapeHtml(addressLine)}</p>` : ""}
        ${restaurant.phone ? `<p>Phone: ${escapeHtml(restaurant.phone)}</p>` : ""}
        ${restaurant.gstNumber ? `<p>GSTIN: ${escapeHtml(restaurant.gstNumber)}</p>` : ""}
        ${restaurant.fssaiNumber ? `<p>FSSAI: ${escapeHtml(restaurant.fssaiNumber)}</p>` : ""}
      </div>
      <div class="meta">
        <div class="badge">${escapeHtml(title)}</div>
        <p><strong>Invoice No.</strong> ${escapeHtml(invoiceNumber)}</p>
        <p><strong>Invoice date</strong> ${escapeHtml(formatDate(receipt.invoiceDate))}</p>
        <p><strong>Folio status</strong> ${escapeHtml(receipt.status || "")}</p>
      </div>
    </header>

    <div class="grid-2">
      <div class="box">
        <h2>Guest</h2>
        <p><strong>${escapeHtml(guest.fullName || booking.customerName || "—")}</strong></p>
        <p>Mobile: ${escapeHtml(guest.phone || booking.mobileNumber || "—")}</p>
      </div>
      <div class="box">
        <h2>Stay</h2>
        <p>Room: ${escapeHtml(room.roomNumber || "—")}${room.roomType ? ` (${escapeHtml(room.roomType)})` : ""}</p>
        <p>Booking ID: ${escapeHtml(booking.id || "—")}</p>
        <p>Check-in: ${escapeHtml(formatDate(booking.checkedInAt || booking.checkInDate || receipt.folio?.checkInAt))}</p>
        <p>Check-out: ${escapeHtml(formatDate(booking.checkedOutAt || booking.checkOutDate || receipt.folio?.actualCheckOutAt || receipt.folio?.expectedCheckOutAt))}</p>
      </div>
    </div>

    <table>
      <caption>Room rent</caption>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${renderLineRows(groups.roomRent, currency)}</tbody>
    </table>

    <table>
      <caption>Food / POS orders</caption>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${renderLineRows(groups.foodOrders, currency)}</tbody>
    </table>

    <table>
      <caption>Additional services</caption>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${renderLineRows(groups.hotelServices, currency)}</tbody>
    </table>

    <table>
      <caption>Adjustments &amp; discounts</caption>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
      <tbody>${renderLineRows(groups.adjustments, currency)}</tbody>
    </table>

    <table class="totals">
      <tbody>
        <tr><td>Subtotal</td><td class="num">${escapeHtml(formatMoneyInr(totals.subtotal, currency))}</td></tr>
        <tr><td>Discounts</td><td class="num">${escapeHtml(formatMoneyInr(totals.discountTotal, currency))}</td></tr>
        <tr><td>Tax</td><td class="num">${escapeHtml(formatMoneyInr(totals.taxTotal, currency))}</td></tr>
        <tr class="grand"><td>Grand total</td><td class="num">${escapeHtml(formatMoneyInr(totals.grandTotal, currency))}</td></tr>
        <tr class="paid"><td>Paid</td><td class="num">${escapeHtml(formatMoneyInr(totals.paidAmount, currency))}</td></tr>
        <tr class="due"><td>Outstanding balance</td><td class="num">${escapeHtml(formatMoneyInr(totals.dueAmount, currency))}</td></tr>
      </tbody>
    </table>

    <table>
      <caption>Payments</caption>
      <thead><tr><th>Date</th><th>Mode</th><th class="num">Amount</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>

    <footer class="footer">
      ${isDraft ? "This is an interim bill. Outstanding balance may change until checkout settles the folio." : "This is the final settled guest invoice. Folio amounts are immutable."}
      Generated for print / Save as PDF. Food charges appear once from the Room Folio — not as separate POS bills.
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Fetch is done by caller; this only renders + opens print dialog.
 */
export async function printFolioInvoice(receipt, { onError } = {}) {
  try {
    const html = buildFolioInvoiceHtml(receipt);
    await printDocumentHtml(html, { page: "A4" });
  } catch (error) {
    if (typeof onError === "function") onError(error);
    else throw error;
  }
}
