/**
 * Automatic Mode KOT print helpers (client).
 *
 * Deduplicates print jobs across socket retries / duplicate events.
 * Does not mark items READY/SERVED. markKOTPrinted remains printKOT's job
 * after a successful printer dispatch.
 */

const recentPrintJobs = new Map();
const DEDUPE_WINDOW_MS = 60_000;

export function buildKotPrintJobKey({ orderId, items, kotType }) {
  const id = String(orderId || "");
  const itemIds = (Array.isArray(items) ? items : [])
    .map((item) => String(item?._id || ""))
    .filter(Boolean)
    .sort()
    .join(",");
  return `${kotType || "NEW"}:${id}:${itemIds}`;
}

export function claimKotPrintJob(key) {
  if (!key) return false;
  const now = Date.now();
  for (const [existingKey, ts] of recentPrintJobs.entries()) {
    if (now - ts > DEDUPE_WINDOW_MS) {
      recentPrintJobs.delete(existingKey);
    }
  }
  if (recentPrintJobs.has(key)) {
    return false;
  }
  recentPrintJobs.set(key, now);
  return true;
}

export function releaseKotPrintJob(key) {
  if (key) recentPrintJobs.delete(key);
}

export function stripAutoKotMeta(payload) {
  if (!payload || typeof payload !== "object") {
    return { order: payload, meta: {} };
  }

  const {
    automaticAccepted,
    automaticMode,
    autoPrintKot,
    kotItems,
    kotType,
    ...order
  } = payload;

  return {
    order,
    meta: {
      automaticAccepted: Boolean(automaticAccepted),
      automaticMode: Boolean(automaticMode),
      autoPrintKot: Boolean(autoPrintKot),
      kotItems: Array.isArray(kotItems) ? kotItems : [],
      kotType: kotType || null,
    },
  };
}

export function resolveAutoKotItems(order, meta = {}) {
  if (Array.isArray(meta.kotItems) && meta.kotItems.length > 0) {
    return meta.kotItems.filter((item) => item?.status !== "REJECTED");
  }
  return (order?.items || []).filter(
    (item) => item?.status !== "REJECTED" && !item?.kotPrintedAt,
  );
}

/**
 * Whether Automatic Mode should dispatch KOT for this new-order payload.
 */
export function shouldAutoPrintNewOrder(meta, order) {
  if (!meta?.automaticMode && !meta?.automaticAccepted) return false;
  if (order?.status !== "ACCEPTED") return false;
  return resolveAutoKotItems(order, meta).length > 0;
}

/**
 * Whether Automatic Mode should dispatch KOT for a running append.
 */
export function shouldAutoPrintRunningOrder(payloadMeta, items) {
  if (!payloadMeta?.automaticMode && !payloadMeta?.autoPrintKot) return false;
  return (items || []).filter((item) => item?.status !== "REJECTED").length > 0;
}
