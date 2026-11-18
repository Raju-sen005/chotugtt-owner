/**
 * Shared helpers for item-level special instructions (cooking notes).
 * Free-text only — never used in price / tax / qty math.
 */

export const SPECIAL_INSTRUCTIONS_MAX = 200;

export function normalizeSpecialInstructions(raw) {
  if (raw == null) return "";
  let text = String(raw);
  text = text.replace(/<[^>]*>/g, " ");
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  text = text.replace(/[\t\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.slice(0, SPECIAL_INSTRUCTIONS_MAX);
}

/** Display + submit: prefer specialInstructions, fall back to legacy notes. */
export function resolveItemSpecialInstructions(item) {
  if (!item || typeof item !== "object") return "";
  return normalizeSpecialInstructions(
    item.specialInstructions ?? item.notes ?? "",
  );
}

/**
 * Content key for merge decisions (not used as React list keys).
 * Same catalog item + same normalized instructions → same content key.
 */
export function buildCartLineKey(itemId, specialInstructions = "") {
  const id = String(itemId || "");
  const notes = normalizeSpecialInstructions(specialInstructions);
  if (!notes) return id;
  return `${id}::${notes}`;
}

export function catalogIdFromCartLineKey(lineKey) {
  const key = String(lineKey || "");
  const sep = key.indexOf("::");
  return sep === -1 ? key : key.slice(0, sep);
}

export function createCartLineId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Find an existing cart line with the same catalog item + instructions.
 * @param {Record<string, object>} cart
 * @param {string} catalogId
 * @param {string} specialInstructions
 * @returns {string|null} stable line id
 */
export function findCartLineId(cart, catalogId, specialInstructions = "") {
  const target = buildCartLineKey(catalogId, specialInstructions);
  for (const [lineId, details] of Object.entries(cart || {})) {
    const id = details?.catalogId || catalogIdFromCartLineKey(lineId);
    const key = buildCartLineKey(
      id,
      details?.specialInstructions || details?.notes || "",
    );
    if (key === target) return lineId;
  }
  return null;
}
