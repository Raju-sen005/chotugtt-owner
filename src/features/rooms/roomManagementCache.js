/**
 * Room Management cache synchronization + Socket.IO bridge.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "../../context/SocketContext";
import {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterBookingCreatedSocket,
  syncAfterBookingMutation,
  syncAfterFolioMutation,
  syncAfterGuestMutation,
  syncAfterRoomMutation,
  syncAfterRoomQrMutation,
  syncAfterRoomsSocketEvent,
} from "./roomManagementCacheSync.js";

export {
  ROOM_MGMT_QUERY_DEFAULTS,
  syncAfterBookingCreatedSocket,
  syncAfterBookingMutation,
  syncAfterFolioMutation,
  syncAfterGuestMutation,
  syncAfterRoomMutation,
  syncAfterRoomQrMutation,
  syncAfterRoomsSocketEvent,
};

/**
 * Subscribe the current page to backend room/booking socket events.
 */
export function useRoomManagementCacheSync({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !enabled) return undefined;

    const onRoomsUpdated = (payload) => {
      syncAfterRoomsSocketEvent(queryClient, payload).catch(() => {});
    };
    const onBookingCreated = () => {
      syncAfterBookingCreatedSocket(queryClient).catch(() => {});
    };

    socket.on("ROOMS_UPDATED", onRoomsUpdated);
    socket.on("ROOM_BOOKING_CREATED", onBookingCreated);
    return () => {
      socket.off("ROOMS_UPDATED", onRoomsUpdated);
      socket.off("ROOM_BOOKING_CREATED", onBookingCreated);
    };
  }, [socket, queryClient, enabled]);
}
