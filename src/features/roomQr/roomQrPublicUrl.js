/**
 * Pure helpers for Room QR public URL resolution (Phase C).
 * No Vite env / API-origin fallback — backend publicUrl is authoritative.
 */

/**
 * @param {{ publicUrl?: string | null } | null | undefined} data
 * @returns {{ ok: true, url: string } | { ok: false, code: string, message: string }}
 */
export function resolveBackendRoomQrPublicUrl(data) {
  const raw = data?.publicUrl;
  if (raw == null || typeof raw !== "string" || !String(raw).trim()) {
    return {
      ok: false,
      code: "ROOM_QR_PUBLIC_URL_MISSING",
      message:
        "Server did not return a guest menu URL. Check ROOM_QR_PUBLIC_BASE_URL on the API.",
    };
  }

  const url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) {
    return {
      ok: false,
      code: "ROOM_QR_PUBLIC_URL_INVALID",
      message: "Guest menu URL from the server is not a valid absolute URL.",
    };
  }

  // Guard against accidentally encoding an API public JSON path.
  if (/\/public\/room-menu\//i.test(url)) {
    return {
      ok: false,
      code: "ROOM_QR_PUBLIC_URL_INVALID",
      message:
        "Guest menu URL points at the API JSON path. Configure ROOM_QR_PUBLIC_BASE_URL to the frontend origin.",
    };
  }

  return { ok: true, url };
}

/**
 * UX-only ordering flag from public room-menu response.
 * Backend still authorizes every placeOrder.
 */
export function isRoomOrderingUiEnabled(roomOrdering) {
  return Boolean(roomOrdering?.orderingEnabled);
}

export function guestBannerFromRoomOrdering(roomOrdering) {
  if (!roomOrdering) {
    return "Welcome! You can browse our restaurant menu.";
  }
  if (typeof roomOrdering.guestMessage === "string" && roomOrdering.guestMessage.trim()) {
    return roomOrdering.guestMessage.trim();
  }
  if (roomOrdering.orderingEnabled) {
    return `Welcome to Room ${roomOrdering.roomNumber || ""}! You can browse the menu and order food during your stay.`.trim();
  }
  return "Welcome! You can browse our restaurant menu. Food ordering will be available after your room check-in is completed. Please contact reception for assistance.";
}
