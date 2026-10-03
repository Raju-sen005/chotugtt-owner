// Single source of truth for the printed-bill receipt CSS.
// Used by:
//   - LiveOrderMonitor.jsx -> actual print window
//   - RestaurantProfile.jsx -> live preview modal
// Keep both in sync automatically by editing ONLY this file.
export const getBillReceiptCSSLegacy = () => `
  @media print {
    @page { margin: 0; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier New', ui-monospace, monospace;
    margin: 0; padding: 0;
    display: flex; justify-content: center;
    background: #fff;
    margin-top: 10px;
  }
  .receipt {
    width: 300px;
    padding: 20px 16px 16px;
    color: #111;
  }
  .center { text-align: center; }
  .shop-logo {
    width: 55px;
    height: 55px;
    object-fit: contain;
    display: block;
    margin: 0 auto 6px;
  }
  .shop-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin: 0 0 4px 0;
  }
  .shop-line {
    font-size: 11px;
    line-height: 1.45;
    margin: 0;
    color: #333;
  }
  .divider { border-top: 1px dashed #444; margin: 11px 0; }
  .divider-solid { border-top: 2px solid #111; margin: 12px 0 10px; }
  .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; gap: 10px; }
  .row span { line-height: 1.4; }
  .row b { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
  thead td { font-weight: 700; font-size: 10.5px; padding-bottom: 6px; border-bottom: 1.5px solid #111; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 5px 0; vertical-align: top; }
  .col-item { width: 46%; }
  .col-qty { width: 14%; text-align: center; }
  .col-price { width: 20%; text-align: right; }
  .col-amount { width: 20%; text-align: right; font-weight: 600; }
  .totals-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
  .grand-total { font-size: 16px; font-weight: 700; border-top: 1.5px dashed #444; padding-top: 9px; margin-top: 9px; }
  .payment-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    font-weight: 600;
    color: #555;
    margin-top: 10px;
  }
  .payment-paid {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    margin-top: 4px;
  }
  .payment-due {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    color: #b45309;
    margin-top: 4px;
  }
  .upi-block { text-align: center; margin-top: 14px; }
  .upi-block img { width: 118px; height: 118px; object-fit: contain; }
  .upi-id { font-size: 11px; font-weight: 700; margin-top: 7px; letter-spacing: 0.2px; }
  .scan-label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 8px; color: #333; text-transform: uppercase; }
  .footer-line { font-size: 10.5px; text-align: center; margin-top: 16px; line-height: 1.6; color: #555; }
  .powered-by {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #ccc;
    text-align: center;
    font-size: 9px;
    font-weight: 600;
    color: #aaa;
    letter-spacing: 0.4px;
  }
  .powered-by b { color: #666; font-weight: 800; letter-spacing: 0.2px; }
  .template-minimal { font-family: Arial, sans-serif; }
  .receipt.template-minimal { padding: 12px 10px 10px; }
  .receipt.template-minimal .shop-name { font-size: 15px; text-transform: uppercase; }
  .receipt.template-minimal .shop-logo { display: none; }
  .receipt.template-minimal .divider-solid { border-top-width: 1px; margin: 8px 0; }
  .template-elegant { font-family: Georgia, serif; }
  .receipt.template-elegant { width: 340px; padding: 24px 20px 18px; }
  .receipt.template-elegant .shop-name { font-size: 20px; letter-spacing: 1px; }
  .receipt.template-elegant .shop-line { font-family: Arial, sans-serif; }
  .receipt.template-elegant .divider-solid { border-top: 1px solid #a16207; }
  .receipt.template-elegant .grand-total { border-top-color: #a16207; font-size: 18px; }
  .template-bold { font-family: Arial, sans-serif; }
  .receipt.template-bold { width: 360px; padding: 18px 18px 16px; }
  .receipt.template-bold .shop-name { font-size: 18px; text-transform: uppercase; }
  .receipt.template-bold .divider-solid { border-top: 4px solid #111; margin: 10px 0; }
  .receipt.template-bold .grand-total { background: #111; color: #fff; padding: 10px 8px; border-top: 0; }
  .receipt.template-terracotta { width: 340px; padding: 24px 20px 18px; font-family: Georgia, serif; color: #3f2923; }
  .receipt.template-terracotta .shop-name { color: #a3482b; font-size: 20px; letter-spacing: 1px; }
  .receipt.template-terracotta .divider-solid { border-top: 1px solid #a3482b; }
  .receipt.template-terracotta .grand-total { border-top-color: #a3482b; color: #a3482b; font-size: 18px; }
  .receipt.template-ledger { width: 360px; padding: 18px; font-family: Arial, sans-serif; }
  .receipt.template-ledger .shop-name { font-size: 18px; text-transform: uppercase; }
  .receipt.template-ledger .divider-solid { border-top: 4px solid #1e293b; }
  .receipt.template-ledger thead td { background: #1e293b; color: #fff; padding: 6px 4px; }
  .receipt.template-ledger .grand-total { border-top: 2px solid #1e293b; font-size: 17px; }
  .receipt {
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt.template-classic {
    background: linear-gradient(180deg, #fff 0%, #fffdf9 100%);
    border-top: 7px solid #111;
  }
  .receipt.template-classic .shop-name { letter-spacing: 1px; }
  .receipt.template-minimal {
    background-color: #fff;
    background-image: linear-gradient(#f1f5f9 1px, transparent 1px);
    background-size: 100% 22px;
    border: 1px solid #cbd5e1;
  }
  .receipt.template-elegant {
    background: #fffcf5;
    border: 1px solid #e7d7b0;
    box-shadow: inset 0 0 0 5px #fff8e7;
  }
  .receipt.template-elegant .shop-logo { border: 1px solid #b8892d; border-radius: 50%; padding: 4px; }
  .receipt.template-bold {
    background: #f8fafc;
    border-top: 18px solid #111827;
    border-bottom: 5px solid #111827;
  }
  .receipt.template-bold .shop-name { color: #111827; letter-spacing: 1.2px; }
  .receipt.template-terracotta {
    background: #fff7ed;
    border: 1px solid #e7a98d;
    box-shadow: inset 0 0 0 5px #fff1e6;
  }
  .receipt.template-terracotta .divider { border-top-color: #d98968; }
  .receipt.template-terracotta .shop-line { color: #70483c; }
  .receipt.template-ledger {
    background: #f8fafc;
    border: 1px solid #94a3b8;
    border-top: 14px solid #1e293b;
  }
  .receipt.template-ledger .shop-line { color: #475569; }
  .receipt.template-ledger .divider { border-top-color: #94a3b8; }
  .receipt.template-midnight { width: 360px; background: #111827; color: #f8fafc; border-top: 12px solid #38bdf8; font-family: Arial, sans-serif; }
  .receipt.template-midnight .shop-name, .receipt.template-midnight .grand-total { color: #7dd3fc; }
  .receipt.template-midnight .shop-line, .receipt.template-midnight .payment-row, .receipt.template-midnight .footer-line { color: #cbd5e1; }
  .receipt.template-midnight .divider, .receipt.template-midnight .divider-solid, .receipt.template-midnight .grand-total { border-color: #475569; }
  .receipt.template-saffron { width: 340px; background: #fffaf0; color: #422006; border: 2px solid #f59e0b; font-family: Georgia, serif; }
  .receipt.template-saffron .shop-name { color: #b45309; font-size: 20px; }
  .receipt.template-saffron .divider-solid { border-color: #f59e0b; }
  .receipt.template-coastal { width: 340px; background: #f0fdfa; color: #134e4a; border-top: 10px solid #0f766e; font-family: Arial, sans-serif; }
  .receipt.template-coastal .shop-name { color: #0f766e; }
  .receipt.template-coastal .divider { border-color: #5eead4; }
  .receipt.template-botanical { width: 340px; background: #f3f7f0; color: #263b2a; border: 1px solid #9caf88; font-family: Georgia, serif; }
  .receipt.template-botanical .shop-name { color: #3f6212; font-size: 20px; }
  .receipt.template-botanical .grand-total { border-color: #84a66d; color: #3f6212; }
  .receipt.template-monogram { width: 360px; background: #18181b; color: #fafafa; border: 3px solid #d4af37; font-family: Georgia, serif; }
  .receipt.template-monogram .shop-name, .receipt.template-monogram .grand-total { color: #f5d76e; }
  .receipt.template-monogram .shop-line, .receipt.template-monogram .payment-row, .receipt.template-monogram .footer-line { color: #d4d4d8; }
  .receipt.template-monogram .divider, .receipt.template-monogram .divider-solid, .receipt.template-monogram .grand-total { border-color: #a38427; }
  .receipt.template-studio { width: 360px; background: #f5f5f4; color: #292524; border: 1px solid #78716c; font-family: Arial, sans-serif; }
  .receipt.template-studio thead td { background: #292524; color: #fff; padding: 6px 4px; }
  .receipt.template-studio .grand-total { background: #d6d3d1; padding: 8px; border: 0; }
  .receipt.template-noir { width: 300px; background: #000; color: #fff; border-top: 8px solid #fff; font-family: 'Courier New', monospace; }
  .receipt.template-noir .shop-name, .receipt.template-noir .grand-total { color: #fff; }
  .receipt.template-noir .shop-line, .receipt.template-noir .payment-row, .receipt.template-noir .footer-line { color: #d4d4d4; }
  .receipt.template-noir .divider, .receipt.template-noir .divider-solid, .receipt.template-noir .grand-total { border-color: #737373; }
  .receipt.template-heritage { width: 340px; background: #f5efe3; color: #3f3125; border: 1px solid #b89b72; font-family: Georgia, serif; }
  .receipt.template-heritage .shop-name { color: #6b4423; font-size: 20px; }
  .receipt.template-heritage .divider, .receipt.template-heritage .divider-solid, .receipt.template-heritage .grand-total { border-color: #9a744c; }
`;

export const getBillReceiptCSS = () => `
  @media print {
    @page {
      size: 80mm auto;
      margin: 0;
    }
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Courier New', ui-monospace, monospace;
    margin: 0;
    padding: 0;
    display: flex;
    justify-content: center;
    background: #fff;
  }

  .receipt {
    width: 300px;
    padding: 20px 16px 16px;
    color: #111;
  }

  .center {
    text-align: center;
  }

  .shop-logo {
    width: 55px;
    height: 55px;
    object-fit: contain;
    display: block;
    margin: 0 auto 6px;
  }

  .shop-name {
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.3px;
    margin: 0 0 4px 0;
  }

  .shop-line {
    font-size: 11px;
    line-height: 1.45;
    margin: 0;
    color: #333;
  }

  .divider {
    border-top: 1px dashed #444;
    margin: 11px 0;
  }

  .divider-solid {
    border-top: 2px solid #111;
    margin: 12px 0 10px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin: 3px 0;
    gap: 10px;
  }

  .row span {
    line-height: 1.4;
  }

  .row b {
    font-weight: 700;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin-top: 6px;
  }

  thead td {
    font-weight: 700;
    font-size: 10.5px;
    padding-bottom: 6px;
    border-bottom: 1.5px solid #111;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  td {
    padding: 5px 0;
    vertical-align: top;
  }

  .col-item {
    width: 46%;
  }

  .col-qty {
    width: 14%;
    text-align: center;
  }

  .col-price {
    width: 20%;
    text-align: right;
  }

  .col-amount {
    width: 20%;
    text-align: right;
    font-weight: 600;
  }

  .totals-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin: 4px 0;
  }

  .grand-total {
    font-size: 16px;
    font-weight: 700;
    border-top: 1.5px dashed #444;
    padding-top: 9px;
    margin-top: 9px;
  }

  .payment-row {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    font-weight: 600;
    color: #555;
    margin-top: 10px;
  }

  .payment-paid {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    margin-top: 4px;
  }

  .payment-due {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 700;
    color: #b45309;
    margin-top: 4px;
  }

  .upi-block {
    text-align: center;
    margin-top: 14px;
  }

  .upi-block img {
    width: 118px;
    height: 118px;
    object-fit: contain;
  }

  .upi-id {
    font-size: 11px;
    font-weight: 700;
    margin-top: 7px;
    letter-spacing: 0.2px;
  }

  .scan-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    margin-bottom: 8px;
    color: #333;
    text-transform: uppercase;
  }

  .footer-line {
    font-size: 10.5px;
    text-align: center;
    margin-top: 16px;
    line-height: 1.6;
    color: #555;
  }

  .powered-by {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #ccc;
    text-align: center;
    font-size: 9px;
    font-weight: 600;
    color: #aaa;
    letter-spacing: 0.4px;
  }

  .powered-by b {
    color: #666;
    font-weight: 800;
    letter-spacing: 0.2px;
  }

  .template-minimal {
    font-family: Arial, sans-serif;
  }

  .receipt.template-minimal {
    padding: 12px 10px 10px;
  }

  .receipt.template-minimal .shop-name {
    font-size: 15px;
    text-transform: uppercase;
  }

  .receipt.template-minimal .shop-logo {
    display: none;
  }

  .receipt.template-minimal .divider-solid {
    border-top-width: 1px;
    margin: 8px 0;
  }

  .template-elegant {
    font-family: Georgia, serif;
  }

  .receipt.template-elegant {
    width: 340px;
    padding: 24px 20px 18px;
  }

  .receipt.template-elegant .shop-name {
    font-size: 20px;
    letter-spacing: 1px;
  }

  .receipt.template-elegant .shop-line {
    font-family: Arial, sans-serif;
  }

  .receipt.template-elegant .divider-solid {
    border-top: 1px solid #a16207;
  }

  .receipt.template-elegant .grand-total {
    border-top-color: #a16207;
    font-size: 18px;
  }

  .template-bold {
    font-family: Arial, sans-serif;
  }

  .receipt.template-bold {
    width: 360px;
    padding: 18px 18px 16px;
  }

  .receipt.template-bold .shop-name {
    font-size: 18px;
    text-transform: uppercase;
  }

  .receipt.template-bold .divider-solid {
    border-top: 4px solid #111;
    margin: 10px 0;
  }

  .receipt.template-bold .grand-total {
    background: #111;
    color: #fff;
    padding: 10px 8px;
    border-top: 0;
  }

  .receipt.template-terracotta {
    width: 340px;
    padding: 24px 20px 18px;
    font-family: Georgia, serif;
    color: #3f2923;
  }

  .receipt.template-terracotta .shop-name {
    color: #a3482b;
    font-size: 20px;
    letter-spacing: 1px;
  }

  .receipt.template-terracotta .divider-solid {
    border-top: 1px solid #a3482b;
  }

  .receipt.template-terracotta .grand-total {
    border-top-color: #a3482b;
    color: #a3482b;
    font-size: 18px;
  }

  .receipt.template-ledger {
    width: 360px;
    padding: 18px;
    font-family: Arial, sans-serif;
  }

  .receipt.template-ledger .shop-name {
    font-size: 18px;
    text-transform: uppercase;
  }

  .receipt.template-ledger .divider-solid {
    border-top: 4px solid #1e293b;
  }

  .receipt.template-ledger thead td {
    background: #1e293b;
    color: #fff;
    padding: 6px 4px;
  }

  .receipt.template-ledger .grand-total {
    border-top: 2px solid #1e293b;
    font-size: 17px;
  }

  .receipt {
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .receipt.template-classic {
    background: linear-gradient(180deg, #fff 0%, #fffdf9 100%);
    border-top: 7px solid #111;
  }

  .receipt.template-classic .shop-name {
    letter-spacing: 1px;
  }

  .receipt.template-minimal {
    background-color: #fff;
    background-image: linear-gradient(
      #f1f5f9 1px,
      transparent 1px
    );
    background-size: 100% 22px;
    border: 1px solid #cbd5e1;
  }

  .receipt.template-elegant {
    background: #fffcf5;
    border: 1px solid #e7d7b0;
    box-shadow: inset 0 0 0 5px #fff8e7;
  }

  .receipt.template-elegant .shop-logo {
    border: 1px solid #b8892d;
    border-radius: 50%;
    padding: 4px;
  }

  .receipt.template-bold {
    background: #f8fafc;
    border-top: 18px solid #111827;
    border-bottom: 5px solid #111827;
  }

  .receipt.template-bold .shop-name {
    color: #111827;
    letter-spacing: 1.2px;
  }

  .receipt.template-terracotta {
    background: #fff7ed;
    border: 1px solid #e7a98d;
    box-shadow: inset 0 0 0 5px #fff1e6;
  }

  .receipt.template-terracotta .divider {
    border-top-color: #d98968;
  }

  .receipt.template-terracotta .shop-line {
    color: #70483c;
  }

  .receipt.template-ledger {
    background: #f8fafc;
    border: 1px solid #94a3b8;
    border-top: 14px solid #1e293b;
  }

  .receipt.template-ledger .shop-line {
    color: #475569;
  }

  .receipt.template-ledger .divider {
    border-top-color: #94a3b8;
  }

  .receipt.template-midnight {
    width: 360px;
    background: #111827;
    color: #f8fafc;
    border-top: 12px solid #38bdf8;
    font-family: Arial, sans-serif;
  }

  .receipt.template-midnight .shop-name,
  .receipt.template-midnight .grand-total {
    color: #7dd3fc;
  }

  .receipt.template-midnight .shop-line,
  .receipt.template-midnight .payment-row,
  .receipt.template-midnight .footer-line {
    color: #cbd5e1;
  }

  .receipt.template-midnight .divider,
  .receipt.template-midnight .divider-solid,
  .receipt.template-midnight .grand-total {
    border-color: #475569;
  }

  .receipt.template-saffron {
    width: 340px;
    background: #fffaf0;
    color: #422006;
    border: 2px solid #f59e0b;
    font-family: Georgia, serif;
  }

  .receipt.template-saffron .shop-name {
    color: #b45309;
    font-size: 20px;
  }

  .receipt.template-saffron .divider-solid {
    border-color: #f59e0b;
  }

  .receipt.template-coastal {
    width: 340px;
    background: #f0fdfa;
    color: #134e4a;
    border-top: 10px solid #0f766e;
    font-family: Arial, sans-serif;
  }

  .receipt.template-coastal .shop-name {
    color: #0f766e;
  }

  .receipt.template-coastal .divider {
    border-color: #5eead4;
  }

  .receipt.template-botanical {
    width: 340px;
    background: #f3f7f0;
    color: #263b2a;
    border: 1px solid #9caf88;
    font-family: Georgia, serif;
  }

  .receipt.template-botanical .shop-name {
    color: #3f6212;
    font-size: 20px;
  }

  .receipt.template-botanical .grand-total {
    border-color: #84a66d;
    color: #3f6212;
  }

  .receipt.template-monogram {
    width: 360px;
    background: #18181b;
    color: #fafafa;
    border: 3px solid #d4af37;
    font-family: Georgia, serif;
  }

  .receipt.template-monogram .shop-name,
  .receipt.template-monogram .grand-total {
    color: #f5d76e;
  }

  .receipt.template-monogram .shop-line,
  .receipt.template-monogram .payment-row,
  .receipt.template-monogram .footer-line {
    color: #d4d4d8;
  }

  .receipt.template-monogram .divider,
  .receipt.template-monogram .divider-solid,
  .receipt.template-monogram .grand-total {
    border-color: #a38427;
  }

  .receipt.template-studio {
    width: 360px;
    background: #f5f5f4;
    color: #292524;
    border: 1px solid #78716c;
    font-family: Arial, sans-serif;
  }

  .receipt.template-studio thead td {
    background: #292524;
    color: #fff;
    padding: 6px 4px;
  }

  .receipt.template-studio .grand-total {
    background: #d6d3d1;
    padding: 8px;
    border: 0;
  }

  .receipt.template-noir {
    width: 300px;
    background: #000;
    color: #fff;
    border-top: 8px solid #fff;
    font-family: 'Courier New', monospace;
  }

  .receipt.template-noir .shop-name,
  .receipt.template-noir .grand-total {
    color: #fff;
  }

  .receipt.template-noir .shop-line,
  .receipt.template-noir .payment-row,
  .receipt.template-noir .footer-line {
    color: #d4d4d4;
  }

  .receipt.template-noir .divider,
  .receipt.template-noir .divider-solid,
  .receipt.template-noir .grand-total {
    border-color: #737373;
  }

  .receipt.template-heritage {
    width: 340px;
    background: #f5efe3;
    color: #3f3125;
    border: 1px solid #b89b72;
    font-family: Georgia, serif;
  }

  .receipt.template-heritage .shop-name {
    color: #6b4423;
    font-size: 20px;
  }

  .receipt.template-heritage .divider,
  .receipt.template-heritage .divider-solid,
  .receipt.template-heritage .grand-total {
    border-color: #9a744c;
  }


  /* =========================================================
     PRINT-ONLY THERMAL OVERRIDES
     ========================================================= */

  @media print {

    @page {
      size: 80mm auto;
      margin: 0;
    }

    html,
    body {
      width: 80mm !important;
      min-width: 80mm !important;
      max-width: 80mm !important;

      margin: 0 !important;
      padding: 0 !important;

      background: #fff !important;
    }

    body {
      display: block !important;
      font-family: 'Courier New', ui-monospace, monospace !important;
      overflow: visible !important;
    }

    /*
     * IMPORTANT:
     * Every template keeps its existing screen/preview width.
     * Only physical printing is normalized to the 80mm printer.
     */
    .receipt,
    .receipt.template-elegant,
    .receipt.template-bold,
    .receipt.template-terracotta,
    .receipt.template-ledger,
    .receipt.template-midnight,
    .receipt.template-saffron,
    .receipt.template-coastal,
    .receipt.template-botanical,
    .receipt.template-monogram,
    .receipt.template-studio,
    .receipt.template-noir,
    .receipt.template-heritage {
      width: 72mm !important;
      min-width: 72mm !important;
      max-width: 72mm !important;

      margin: 0 auto !important;

      box-sizing: border-box !important;

      overflow: visible !important;
    }

    /*
     * Compact thermal padding.
     * This does NOT affect preview/share.
     */
    .receipt {
      padding: 4mm 3mm 3mm !important;
    }

    /*
     * Prevent wide children from creating a wider print layout.
     */
    .receipt table {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;

      table-layout: fixed !important;

      margin-top: 3px !important;
    }

    .receipt td,
    .receipt th {
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: normal;
    }

    /*
     * Keep item/qty/price/amount columns inside the
     * actual printable width.
     */
    .receipt .col-item {
      width: 46% !important;
    }

    .receipt .col-qty {
      width: 14% !important;
    }

    .receipt .col-price {
      width: 20% !important;
    }

    .receipt .col-amount {
      width: 20% !important;
    }

    /*
     * Remove excessive vertical spacing only during print.
     */
    .receipt .divider {
      margin: 5px 0 !important;
    }

    .receipt .divider-solid {
      margin: 6px 0 !important;
    }

    .receipt td {
      padding: 2.5px 0 !important;
    }

    .receipt table {
      font-size: 10.5px !important;
    }

    .receipt thead td {
      font-size: 9.5px !important;
      padding-bottom: 3px !important;
      letter-spacing: 0 !important;
    }

    .receipt .row {
      font-size: 10.5px !important;
      margin: 2px 0 !important;
      gap: 5px !important;
    }

    .receipt .shop-name {
      font-size: 15px !important;
      margin-bottom: 2px !important;
      letter-spacing: 0.2px !important;
    }

    .receipt .shop-line {
      font-size: 9.5px !important;
      line-height: 1.25 !important;
    }

    .receipt .shop-logo {
      width: 42px !important;
      height: 42px !important;
      margin: 0 auto 3px !important;

      object-fit: contain !important;

      filter: none !important;
      mix-blend-mode: normal !important;
      background: transparent !important;
    }

    .receipt .totals-row {
      font-size: 10.5px !important;
      margin: 2px 0 !important;
    }

    .receipt .grand-total {
      font-size: 14px !important;
      padding-top: 5px !important;
      margin-top: 5px !important;
    }

    .receipt .payment-row {
      font-size: 10px !important;
      margin-top: 5px !important;
    }

    .receipt .payment-paid,
    .receipt .payment-due {
      font-size: 11px !important;
      margin-top: 2px !important;
    }

    .receipt .upi-block {
      margin-top: 7px !important;
    }


    .receipt .upi-id {
      font-size: 9px !important;
      margin-top: 3px !important;
    }

    .receipt .scan-label {
      font-size: 8.5px !important;
      margin-bottom: 4px !important;
      letter-spacing: 0.3px !important;
    }

    .receipt .footer-line {
      font-size: 9px !important;
      margin-top: 7px !important;
      line-height: 1.3 !important;
    }

    .receipt .powered-by {
      margin-top: 7px !important;
      padding-top: 5px !important;
      font-size: 8px !important;
    }

    /*
     * Thermal printers generally work better with a white
     * paper background. Preserve the selected template's
     * typography/borders, but avoid huge decorative areas
     * expanding the physical print width.
     */
    .receipt {
      background-clip: padding-box !important;
    }

    /*
     * Prevent images from exceeding the paper width.
     */
    .receipt img {
      max-width: 100% !important;
      height: auto;
    }

    .receipt .shop-logo {
      max-width: 42px !important;
    }

    /*
     * Long restaurant/item names must wrap instead of
     * increasing the receipt width.
     */
    .receipt .shop-name,
    .receipt .shop-line,
    .receipt td,
    .receipt span,
    .receipt b {
      overflow-wrap: anywhere;
    }

    /*
     * Prevent browser link decoration in physical print.
     */
    .receipt a {
      color: inherit !important;
      text-decoration: none !important;
    }

    /*
     * Do not allow print content to create horizontal overflow.
     */
    .receipt,
    .receipt * {
      max-width: 100%;
    }

    /*
     * Keep the print root itself constrained.
     */
    #receipt-print-root,
    #bill-print-root,
    #print-root {
      width: 80mm !important;
      max-width: 80mm !important;
      min-width: 80mm !important;

      margin: 0 !important;
      padding: 0 !important;
    }
  }



    /* =========================================================
     THERMAL PRINT FIXES: no dark fills, crisp 1-bit images
     ========================================================= */
  @media print {
    .receipt,
    .receipt[class*="template-"] {
      background: #fff !important;
      background-image: none !important;
      color: #000 !important;
      border: none !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: economy;
      print-color-adjust: economy;
    }

    /* dark templates (midnight, monogram, noir, bold, ledger, studio) -> pure B/W text */
    .receipt *,
    .receipt[class*="template-"] * {
      color: #000 !important;
      background: transparent !important;
      text-shadow: none !important;
    }

    .receipt .grand-total {
      border-top: 1.5px dashed #000 !important;
      border-bottom: 1.5px dashed #000 !important;
    }

    .receipt thead td {
      border-bottom: 1.5px solid #000 !important;
    }

    .receipt .divider,
    .receipt .divider-solid {
      border-color: #000 !important;
    }

    /* pre-processed 1-bit images: never scale/filter them in CSS */
    .receipt img.thermal-img {
      display: block;
      margin: 0 auto;
      max-width: none !important;
      object-fit: fill !important;
      border: 0 !important;
      border-radius: 0 !important;
      padding: 0 !important;
      filter: none !important;
      mix-blend-mode: normal !important;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt .upi-block img.thermal-img {
      margin-top: 4px;
    }
  }




    /* =========================================================
     TOP GAP + POWERED BY FIX
     ========================================================= */
  @media print {
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }

    body {
      align-items: flex-start !important;
    }

    .receipt,
    .receipt[class*="template-"] {
      margin: 0 auto !important;
      padding: 1mm 3mm 5mm !important;
      border-top: 0 !important;
    }

    .receipt > .center:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }

    .receipt .powered-by {
      margin-top: 4px !important;
      padding-top: 3px !important;
      border-top: 1px dashed #000 !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #000 !important;
      letter-spacing: 0.5px !important;
    }

    .receipt .powered-by b {
      font-size: 13px !important;
      font-weight: 900 !important;
      color: #000 !important;
    }
  }



    /* =========================================================
     FINAL: NO LEFT/TOP GAP + BOTTOM FEED FOR CUTTER
     ========================================================= */
  @media print {
    html,
    body {
      width: 72mm !important;
      min-width: 0 !important;
      max-width: 72mm !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
    }

    .receipt,
    .receipt[class*="template-"] {
      width: 72mm !important;
      min-width: 0 !important;
      max-width: 72mm !important;
      margin: 0 !important;
      padding: 0 1mm 2mm !important;
      border: 0 !important;
    }

    .receipt > .center:first-child,
    .receipt > .center:first-child > *:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
  }
`;
