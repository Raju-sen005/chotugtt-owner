/**
 * Frontend billing gate helpers for Live Orders.
 *
 * Table Generate Bill + Room Folio release:
 * - automaticMode OFF → SERVED required for active items
 * - automaticMode ON  → ACCEPTED + any non-rejected item (incl. PREPARING)
 *
 * Kitchen itemReadyStatus is never faked by these helpers.
 */

export function isTableBillBlockedByReadiness(order, { automaticMode = false } = {}) {
  const items = order?.items || [];
  if (automaticMode === true) {
    return false;
  }
  return items.some(
    (item) => item?.status !== "REJECTED" && item?.itemReadyStatus !== "SERVED",
  );
}

export function isRoomFolioReleaseBlockedByReadiness(
  order,
  { automaticMode = false } = {},
) {
  const items = order?.items || [];
  if (automaticMode === true) {
    return false;
  }
  return items.some(
    (item) => item?.status !== "REJECTED" && item?.itemReadyStatus !== "SERVED",
  );
}
