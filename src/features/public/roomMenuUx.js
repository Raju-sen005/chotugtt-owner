/**
 * Pure UX helpers for Guest Room QR menu.
 * No network / storage side effects.
 */

export const GUEST_NAME_RE = /^[A-Za-z ]{3,50}$/;
export const GUEST_PHONE_RE = /^[6-9]\d{9}$/;

export function validateGuestName(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { ok: false, message: "Please enter your name." };
  }
  if (!GUEST_NAME_RE.test(trimmed)) {
    return {
      ok: false,
      message: "Use letters and spaces only (3–50 characters).",
    };
  }
  return { ok: true, value: trimmed, message: "" };
}

export function validateGuestPhone(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { ok: true, value: "", message: "" };
  }
  if (!GUEST_PHONE_RE.test(trimmed)) {
    return {
      ok: false,
      message: "Enter a valid 10-digit Indian mobile number.",
    };
  }
  return { ok: true, value: trimmed, message: "" };
}

export function formatOrderingAsLabel(customerName, customerPhoneMasked) {
  const name = String(customerName || "").trim();
  if (!name) return "";
  const phone = String(customerPhoneMasked || "").trim();
  return phone ? `Ordering as ${name} · ${phone}` : `Ordering as ${name}`;
}

export function identityFromSessionPayload(data) {
  const identity = data?.identity;
  if (!identity?.hasProfile || !identity?.customerName) {
    return null;
  }
  return {
    customerName: String(identity.customerName).trim(),
    customerPhoneMasked: String(identity.customerPhoneMasked || "").trim(),
  };
}

export function itemKey(item) {
  return String(item?.id || item?._id || "");
}

export function isItemAvailable(item) {
  return item?.isAvailable !== false;
}

export function matchesSearch(item, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const name = String(item?.name || "").toLowerCase();
  const description = String(item?.description || "").toLowerCase();
  return name.includes(q) || description.includes(q);
}

export function buildCategoryTabs({ categoryOrder, categories, combos }) {
  const tabs = [];
  if (Array.isArray(combos) && combos.length > 0) {
    tabs.push({ id: "combos", label: "Combos" });
  }
  for (const name of categoryOrder || []) {
    const items = categories?.[name] || [];
    if (items.length > 0) {
      tabs.push({ id: name, label: name });
    }
  }
  return tabs;
}

export function filterCatalogSections({
  categoryOrder,
  categories,
  combos,
  selectedCategory,
  searchQuery,
}) {
  const q = String(searchQuery || "").trim();
  const sections = [];

  const includeCombos =
    !selectedCategory || selectedCategory === "combos" || Boolean(q);
  if (includeCombos && Array.isArray(combos) && combos.length > 0) {
    const items = combos.filter((c) => matchesSearch(c, q));
    if (items.length) {
      sections.push({ id: "combos", title: "Combos", type: "combo", items });
    }
  }

  for (const name of categoryOrder || []) {
    const include =
      !selectedCategory || selectedCategory === name || Boolean(q);
    if (!include) continue;
    const items = (categories?.[name] || []).filter((item) =>
      matchesSearch(item, q),
    );
    if (!items.length) continue;
    sections.push({ id: name, title: name, type: "item", items });
  }

  return sections;
}

export function cartTotals(cart) {
  const entries = Object.entries(cart || {});
  let totalItems = 0;
  let subtotal = 0;
  for (const [, details] of entries) {
    const qty = Number(details?.quantity || 0);
    totalItems += qty;
    subtotal += qty * Number(details?.price || 0);
  }
  return { entries, totalItems, subtotal };
}

/**
 * Guest-facing status for the room ordering banner.
 * Backend remains authoritative; this only maps known UI flags.
 */
export function roomOrderingStatusMeta({ orderingEnabled, guestMessage }) {
  if (orderingEnabled) {
    return {
      tone: "ready",
      label: "Ordering available",
      detail:
        guestMessage ||
        "You can browse the menu and place an order to your room.",
    };
  }
  return {
    tone: "browse",
    label: "Browse only",
    detail:
      guestMessage ||
      "You can browse the menu. Ordering unlocks after check-in.",
  };
}
