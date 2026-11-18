/**
 * Room QR print helpers — pure + browser print document builder.
 * Does not regenerate tokens; uses the already-rendered canvas + publicUrl.
 */

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Build printable HTML for one room QR.
 * @param {{ restaurantName: string, roomNumber: string, dataUrl: string }} opts
 */
export function buildRoomQrPrintHtml({
  restaurantName,
  roomNumber,
  dataUrl,
}) {
  const brand = escapeHtml(restaurantName || "ChotuGTT");
  const room = escapeHtml(roomNumber || "");
  const src = escapeHtml(dataUrl || "");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Room ${room} QR</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #fff;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 100%;
      max-width: 420px;
      text-align: center;
      padding: 28px 24px;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
    }
    .eyebrow {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #64748b;
    }
    .brand {
      margin: 0 0 18px;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .room {
      margin: 0 0 18px;
      font-size: 28px;
      font-weight: 800;
    }
    .qr {
      display: inline-block;
      padding: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
    }
    .qr img {
      width: 220px;
      height: 220px;
      display: block;
    }
    .hint {
      margin: 18px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: #475569;
    }
    @media print {
      body { min-height: auto; }
      .sheet { border: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <p class="eyebrow">ChotuGTT</p>
    <p class="brand">${brand}</p>
    <h1 class="room">Room ${room}</h1>
    <div class="qr"><img id="qr-img" src="${src}" alt="Room QR code" width="220" height="220" /></div>
    <p class="hint">Scan this QR to open the guest menu and place food orders during your stay.</p>
  </div>
  <script>
    (function () {
      function triggerPrint() {
        try { window.focus(); } catch (e) {}
        window.print();
      }
      var img = document.getElementById("qr-img");
      if (!img) {
        triggerPrint();
        return;
      }
      if (img.complete) {
        triggerPrint();
        return;
      }
      img.onload = triggerPrint;
      img.onerror = triggerPrint;
      setTimeout(triggerPrint, 1500);
    })();
  </script>
</body>
</html>`;
}

/**
 * Open a print window for an already-rendered QR canvas.
 * Returns { ok: true } or { ok: false, code, message }.
 */
export function printRoomQrFromCanvas({
  canvas,
  publicUrl,
  roomNumber,
  restaurantName,
  openWindow = (...args) => window.open(...args),
}) {
  if (!publicUrl) {
    return {
      ok: false,
      code: "MISSING_PUBLIC_URL",
      message:
        "Room QR public URL is missing. Reload the QR from the server before printing.",
    };
  }
  if (!canvas || typeof canvas.toDataURL !== "function") {
    return {
      ok: false,
      code: "QR_NOT_READY",
      message: "QR code is not ready. Wait for the QR to render, then try again.",
    };
  }

  let dataUrl;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    return {
      ok: false,
      code: "QR_EXPORT_FAILED",
      message: "Could not export the QR image for printing.",
    };
  }

  // Do not pass "noopener" in the features string — Chromium returns null.
  const printWindow = openWindow("", "_blank", "width=520,height=720");
  if (!printWindow) {
    return {
      ok: false,
      code: "POPUP_BLOCKED",
      message: "Pop-up blocked. Allow pop-ups for this site to print the QR.",
    };
  }

  const html = buildRoomQrPrintHtml({
    restaurantName,
    roomNumber,
    dataUrl,
  });

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return { ok: true };
}
