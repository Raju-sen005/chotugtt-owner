import { getBillReceiptCSS } from "../constants/billReceiptStyles";
import { prepareImageForThermal, generateThermalQr } from "./thermalImage";
import { printThermalHtml } from "./thermalPrint";

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function printOrderBill({
  order,
  storeDetails,
  user,
  selectedBillTemplate,
  onError,
  duplicate = false,
}) {
  const showError = onError;

      // 🔑 FIX: cancelled/rejected items bill par
      const items = (order.items || []).filter((i) => i.status !== "REJECTED");

      const subtotal =
        order.subtotal ??
        items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0);
      const discount = order.discount || 0;
      const taxRate = Number(order.taxRate || 0);
      const grandTotal = order.total ?? subtotal - discount + taxRate;
      const roundOff = grandTotal - (subtotal - discount + taxRate);
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

      const tableLabel = order.mergedTables?.length
        ? `${order.tableNumber}, ${order.mergedTables.join(", ")}`
        : order.tableNumber;

      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;
      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const cashierName =
        user?.name || user?.username || user?.email || "Staff";

      // 🔑 image ko absolute URL (relative path ho to base attach karo)
      // =========================================================
      // BILL QR LOGIC
      // =========================================================
      // UPI      -> UPI QR
      // CASH     -> Google Review QR
      // DUE      -> Google Review QR
      // SPLIT    -> based on splitPaymentMethod
      // =========================================================

      const isSplit = order.paymentMethod === "SPLIT" || order.isSplitBill;

      const isMixed = order.paymentMethod === "MIXED";

      const effectivePaymentMethod = isMixed
        ? "UPI"
        : isSplit
          ? order.splitPaymentMethod
          : order.paymentMethod;

      const mixedUpiAmount = isMixed
        ? Number(
            order.payments?.find((payment) => payment.method === "UPI")
              ?.amount || 0,
          )
        : 0;
      // Never let an image failure block printing — just skip that image.
      const safe = async (fn) => {
        try {
          return await fn();
        } catch (e) {
          console.warn("Thermal image prep failed:", e);
          return null;
        }
      };

      const buildQr = async () => {
        if (effectivePaymentMethod === "UPI") {
          // Split bill: QR amount must be what is being collected NOW, not the full total
          const payable = isSplit
            ? Number(order.paidAmount || 0)
            : isMixed
              ? mixedUpiAmount
              : Number(grandTotal);

          if (storeDetails.upiId && payable > 0) {
            const upiString =
              `upi://pay?pa=${encodeURIComponent(String(storeDetails.upiId).trim())}` +
              `&pn=${encodeURIComponent(String(storeDetails.name || "Restaurant").trim())}` +
              `&am=${payable.toFixed(2)}` +
              `&cu=INR` +
              `&tn=${encodeURIComponent(`Bill ${order.orderId || ""}`.trim())}`;

            const generated = await safe(async () => ({
              ...generateThermalQr(upiString, { targetMm: 42, ecl: "M" }),
              type: "UPI",
            }));
            if (generated) return generated;
          }

          if (storeDetails.upiQrCode) {
            return safe(async () => ({
              ...(await prepareImageForThermal(storeDetails.upiQrCode, {
                mode: "qr",
                widthMm: 42,
              })),
              type: "UPI",
            }));
          }
          return null;
        }

        if (storeDetails.googleReviewQrCode) {
          return safe(async () => ({
            ...(await prepareImageForThermal(storeDetails.googleReviewQrCode, {
              mode: "qr",
              widthMm: 28,
            })),
            type: "GOOGLE_REVIEW",
          }));
        }
        return null;
      };

      const buildLogo = async () => {
        if (!storeDetails.logo || selectedBillTemplate === "minimal")
          return null;
        return safe(() =>
          prepareImageForThermal(storeDetails.logo, {
            mode: "logo",
            widthMm: 20,
          }),
        );
      };

      const [qr, logo] = await Promise.all([buildQr(), buildLogo()]);
      const billQrType = qr?.type || "";

      const itemRows = items
        .map(
          (i) => `
    <tr>
      <td class="col-item">${escapeHtml(i.name)}</td>
      <td class="col-qty">${escapeHtml(i.quantity)}</td>
      <td class="col-price">${(i.price || 0).toFixed(2)}</td>
      <td class="col-amount">${((i.price || 0) * (i.quantity || 0)).toFixed(2)}</td>
    </tr>`,
        )
        .join("");

      const windowContent = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Bill - Table ${escapeHtml(tableLabel)}</title>
      <style>${getBillReceiptCSS()}</style>
    </head>
    <body>
      <div class="receipt template-${escapeHtml(selectedBillTemplate)}">
        <div class="center">

   ${
     logo
       ? `<img class="shop-logo thermal-img" src="${logo.src}" alt="Logo"
           style="width:${logo.widthMm}mm !important;height:auto !important;" />`
       : ""
   }

  <p class="shop-name">
    ${escapeHtml(storeDetails.name || "OUR RESTAURANT")}
  </p>
  ${duplicate ? `<p class="shop-line">DUPLICATE COPY</p>` : ""}

  ${
    storeDetails.address
      ? `<p class="shop-line">
           ${escapeHtml(storeDetails.address)}
         </p>`
      : ""
  }

  ${
    storeDetails.contact
      ? `<p class="shop-line">
           Contact: ${escapeHtml(storeDetails.contact)}
         </p>`
      : ""
  }

  ${
    storeDetails.fssaiNumber
      ? `<p class="shop-line">
           FSSAI: ${escapeHtml(storeDetails.fssaiNumber)}
         </p>`
      : ""
  }

  ${
    storeDetails.gstin
      ? `<p class="shop-line">
           GSTIN: ${escapeHtml(storeDetails.gstin)}
         </p>`
      : ""
  }

</div>

        <div class="divider-solid"></div>

        <div class="row">
          <span>Date: ${dateStr}<br/>Time: ${timeStr}</span>
          <span>Dine In: ${escapeHtml(tableLabel)}</span>
        </div>
        <div class="row">
          <span>Cashier:<br/>${escapeHtml(cashierName)}</span>
          <span>Bill No.:<br/>${escapeHtml(order.orderId)}</span>
        </div>
        <p class="row"><span>Name:</span><span>${escapeHtml(order.customerName || "Guest")}</span></p>

        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <td class="col-item">Item</td>
              <td class="col-qty">Qty.</td>
              <td class="col-price">Price</td>
              <td class="col-amount">Amount</td>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="divider"></div>

<div class="totals-row">
  <span>Total Qty: ${totalQty}</span>
  <span>Sub Total ₹${subtotal.toFixed(2)}</span>
</div>

${
  discount
    ? `<div class="totals-row">
       <span>Discount</span>
       <span>-₹${discount.toFixed(2)}</span>
     </div>`
    : ""
}

${
  taxRate
    ? `<div class="totals-row">
       <span>Tax${taxRate ? ` @ ${taxRate.toFixed(2)}%` : ""}</span>
       <span>₹${taxRate.toFixed(2)}</span>
     </div>`
    : ""
}

${
  roundOff
    ? `<div class="totals-row">
       <span>Round off</span>
       <span>${roundOff.toFixed(2)}</span>
     </div>`
    : ""
}

<div class="row grand-total">
  <span>Grand Total</span>
  <span>₹${grandTotal.toFixed(2)}</span>
</div>
        <div class="payment-row">
          <span>Payment Mode</span>
          <span>${escapeHtml(order.paymentMethod || "N/A")}</span>
        </div>

      ${
        order.paymentMethod === "MIXED"
          ? `
      <div class="payment-paid">
        <span>Cash</span>
        <span>₹${Number(
          order.payments?.find((p) => p.method === "CASH")?.amount || 0,
        ).toFixed(2)}</span>
      </div>

      <div class="payment-paid">
        <span>UPI</span>
        <span>₹${Number(
          order.payments?.find((p) => p.method === "UPI")?.amount || 0,
        ).toFixed(2)}</span>
      </div>

      <div class="payment-paid">
        <span>Total Paid</span>
        <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
      </div>
    `
          : order.isSplitBill
            ? `
        <div class="payment-paid">
          <span>Paid Now (${escapeHtml(order.splitPaymentMethod || "")})</span>
          <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
        </div>

        <div class="payment-due">
          <span>Remaining Due</span>
          <span>₹${Number(order.dueAmount || 0).toFixed(2)}</span>
        </div>
      `
            : order.paymentMethod === "DUE"
              ? `
          <div class="payment-due">
            <span>Amount Due</span>
            <span>₹${Number(order.dueAmount || 0).toFixed(2)}</span>
          </div>
        `
              : `
          <div class="payment-paid">
            <span>Amount Paid</span>
            <span>₹${Number(order.paidAmount || 0).toFixed(2)}</span>
          </div>
        `
      }
      ${
        qr
          ? `<div class="upi-block">
        <div class="divider"></div>
        <p class="scan-label">
          ${billQrType === "UPI" ? "Scan &amp; Pay" : "Scan &amp; Review Us"}
        </p>

        <img class="thermal-img" src="${qr.src}" alt="QR"
             style="width:${qr.widthMm}mm !important;height:auto !important;" />

        ${
          billQrType === "UPI" && storeDetails.upiId
            ? `<p class="upi-id">
                 ${escapeHtml(storeDetails.upiId)}
               </p>`
            : ""
        }

        ${
          billQrType === "GOOGLE_REVIEW"
            ? `<p class="upi-id">
                 We'd love your feedback ❤️
               </p>`
            : ""
        }
      </div>`
          : ""
      }

        <div class="footer-line">Thank you for visiting!<br/>Visit again 🙏</div>

        <div class="powered-by">Powered by <b>ChotuGTT</b></div>
      </div>
    </body>
  </html>`;

      try {
        await printThermalHtml(windowContent);
      } catch (error) {
        console.error("Bill print failed:", error);
        showError?.("Bill could not be printed. Check the printer and try again.");
      }
}
