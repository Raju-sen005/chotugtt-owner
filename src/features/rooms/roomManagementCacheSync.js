/**
 * Pure Room Management cache sync helpers (no React / no Socket).
 */

import { roomMgmtKeys } from "./roomManagementQueryKeys.js";

const invalidate = (queryClient, queryKey) =>
  queryClient.invalidateQueries({ queryKey });

export async function syncAfterRoomMutation(queryClient) {
  await Promise.all([
    invalidate(queryClient, roomMgmtKeys.rooms()),
    invalidate(queryClient, roomMgmtKeys.availability()),
    invalidate(queryClient, roomMgmtKeys.bookings()),
    invalidate(queryClient, roomMgmtKeys.folioSummaries()),
  ]);
}

export async function syncAfterBookingMutation(queryClient, options = {}) {
  const tasks = [
    invalidate(queryClient, roomMgmtKeys.bookings()),
    invalidate(queryClient, roomMgmtKeys.rooms()),
    invalidate(queryClient, roomMgmtKeys.availability()),
    invalidate(queryClient, roomMgmtKeys.folioSummaries()),
    invalidate(queryClient, roomMgmtKeys.folio()),
  ];
  if (options.guestId) {
    const { restaurantId, guestId } = options;
    tasks.push(invalidate(queryClient, roomMgmtKeys.guests()));
    if (restaurantId && guestId) {
      tasks.push(
        invalidate(queryClient, roomMgmtKeys.guest(restaurantId, guestId)),
      );
      tasks.push(
        invalidate(
          queryClient,
          roomMgmtKeys.guestBookings(restaurantId, guestId),
        ),
      );
    }
  }
  if (options.includeOrders) {
    tasks.push(invalidate(queryClient, roomMgmtKeys.orders()));
  }
  await Promise.all(tasks);
}

export async function syncAfterRoomQrMutation(queryClient) {
  await Promise.all([
    invalidate(queryClient, roomMgmtKeys.rooms()),
    invalidate(queryClient, roomMgmtKeys.bookings()),
  ]);
}

export async function syncAfterFolioMutation(queryClient, options = {}) {
  const { restaurantId, bookingId, includeOrders = true } = options;
  const tasks = [
    invalidate(queryClient, roomMgmtKeys.folioSummaries()),
    invalidate(queryClient, roomMgmtKeys.bookings()),
    invalidate(queryClient, roomMgmtKeys.rooms()),
  ];
  if (restaurantId && bookingId) {
    tasks.push(
      invalidate(
        queryClient,
        roomMgmtKeys.folioByBooking(restaurantId, bookingId),
      ),
    );
  } else {
    tasks.push(invalidate(queryClient, roomMgmtKeys.folio()));
  }
  if (includeOrders) {
    tasks.push(invalidate(queryClient, roomMgmtKeys.orders()));
  }
  await Promise.all(tasks);
}

export async function syncAfterGuestMutation(queryClient, options = {}) {
  const { restaurantId, guestId, includeBookings = true } = options;
  const tasks = [invalidate(queryClient, roomMgmtKeys.guests())];
  if (restaurantId && guestId) {
    tasks.push(
      invalidate(queryClient, roomMgmtKeys.guest(restaurantId, guestId)),
    );
    tasks.push(
      invalidate(
        queryClient,
        roomMgmtKeys.guestDocuments(restaurantId, guestId),
      ),
    );
    tasks.push(
      invalidate(
        queryClient,
        roomMgmtKeys.guestBookings(restaurantId, guestId),
      ),
    );
  }
  if (includeBookings) {
    tasks.push(invalidate(queryClient, roomMgmtKeys.bookings()));
    tasks.push(invalidate(queryClient, roomMgmtKeys.folioSummaries()));
    tasks.push(invalidate(queryClient, roomMgmtKeys.folio()));
  }
  await Promise.all(tasks);
}

export async function syncAfterRoomsSocketEvent(queryClient, payload = {}) {
  const action = String(payload?.action || "").toUpperCase();
  const bookingLifecycle = [
    "BOOKING_CREATED",
    "CHECK_IN",
    "CHECKOUT",
    "CANCEL",
    "STAY_UPDATED",
  ].includes(action);

  if (bookingLifecycle || payload?.booking) {
    await syncAfterBookingMutation(queryClient, { includeOrders: true });
    return;
  }
  await syncAfterRoomMutation(queryClient);
}

export async function syncAfterBookingCreatedSocket(queryClient) {
  await syncAfterBookingMutation(queryClient);
}

export const ROOM_MGMT_QUERY_DEFAULTS = Object.freeze({
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});
