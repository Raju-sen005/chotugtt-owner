/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { io } from "socket.io-client";

import { useAuth } from "./AuthContext";
import { useNotificationSound } from "../hooks/useNotificationSound";

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_APP_API_BASE;

/*
 * --------------------------------------------------
 * CONFIGURATION
 * --------------------------------------------------
 */

const SOUND_DEDUP_WINDOW_MS = 1500;

/*
 * --------------------------------------------------
 * RESTAURANT ID
 * --------------------------------------------------
 */

const getRestaurantId = (user) => {
  if (!user?.restaurantId) {
    return null;
  }

  if (typeof user.restaurantId === "object") {
    return user.restaurantId?._id
      ? String(user.restaurantId._id)
      : null;
  }

  return String(user.restaurantId);
};

/*
 * --------------------------------------------------
 * EVENT TENANT VALIDATION
 * --------------------------------------------------
 */

const getEventRestaurantId = (payload) => {
  if (!payload?.restaurantId) {
    return null;
  }

  if (typeof payload.restaurantId === "object") {
    return payload.restaurantId?._id
      ? String(payload.restaurantId._id)
      : null;
  }

  return String(payload.restaurantId);
};

const isTenantEvent = (payload, restaurantId) => {
  const eventRestaurantId = getEventRestaurantId(payload);

  /*
   * If backend does not include restaurantId in payload,
   * trust the Socket.IO server-side tenant room.
   *
   * If it does include restaurantId, validate it.
   */
  if (!eventRestaurantId) {
    return true;
  }

  return String(eventRestaurantId) === String(restaurantId);
};

/*
 * --------------------------------------------------
 * PROVIDER
 * --------------------------------------------------
 */

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);

  const socketRef = useRef(null);

  /*
   * Stores recently played order IDs.
   *
   * Prevents:
   *
   * NEW_ORDER_RECEIVED
   * +
   * PLAY_NOTIFICATION_SOUND
   *
   * from playing two sounds.
   */
  const recentSoundEventsRef = useRef(new Map());

  const restaurantId = getRestaurantId(user);

  /*
   * Existing notification sound hook.
   *
   * API remains unchanged.
   */
  const playAlert = useNotificationSound();

  /*
   * --------------------------------------------------
   * SOUND TRIGGER
   * --------------------------------------------------
   */

  const triggerNotificationSound = (payload, source) => {
    const orderId =
      payload?.orderId ??
      payload?._id ??
      payload?.id ??
      null;

    /*
     * Preserve existing behavior when order ID
     * is not available.
     */
    if (!orderId) {
      console.log(
        `🔊 Notification sound triggered from ${source}`
      );

      playAlert();
      return;
    }

    const normalizedOrderId = String(orderId);

    const now = Date.now();

    /*
     * Remove expired entries.
     */
    for (const [
      cachedOrderId,
      timestamp,
    ] of recentSoundEventsRef.current.entries()) {
      if (
        now - timestamp >
        SOUND_DEDUP_WINDOW_MS
      ) {
        recentSoundEventsRef.current.delete(
          cachedOrderId
        );
      }
    }

    /*
     * Check duplicate.
     */
    const previousTimestamp =
      recentSoundEventsRef.current.get(
        normalizedOrderId
      );

    if (
      previousTimestamp &&
      now - previousTimestamp <
        SOUND_DEDUP_WINDOW_MS
    ) {
      console.log(
        `🔇 Duplicate notification sound ignored: ${normalizedOrderId}`
      );

      return;
    }

    /*
     * Remember this order.
     */
    recentSoundEventsRef.current.set(
      normalizedOrderId,
      now
    );

    console.log(
      `🔊 Notification sound triggered from ${source}:`,
      normalizedOrderId
    );

    playAlert();
  };

  /*
   * --------------------------------------------------
   * SOCKET EFFECT
   * --------------------------------------------------
   */

  useEffect(() => {
    /*
     * -----------------------------------------------
     * AUTH CHECK
     * -----------------------------------------------
     */

    if (!user || !restaurantId) {
      if (socketRef.current) {
        console.log(
          "🧹 Disconnecting socket because tenant is unavailable"
        );

        socketRef.current.removeAllListeners();

        socketRef.current.disconnect();

        socketRef.current = null;
      }

      recentSoundEventsRef.current.clear();

      setSocket(null);

      return;
    }

    /*
     * -----------------------------------------------
     * PREVENT DUPLICATE SOCKET
     * -----------------------------------------------
     */

    if (socketRef.current) {
      console.log(
        "♻️ Existing socket already present"
      );

      return;
    }

    console.log(
      "🔌 Creating tenant socket:",
      restaurantId
    );

    /*
     * -----------------------------------------------
     * SOCKET INSTANCE
     * -----------------------------------------------
     */

    const socketInstance = io(SOCKET_URL, {
      /*
       * JWT authentication is handled through
       * HttpOnly cookie.
       */
      withCredentials: true,

      /*
       * WebSocket first is generally preferable,
       * polling remains the fallback.
       */
      transports: [
        "websocket",
        "polling",
      ],

      upgrade: true,

      autoConnect: true,

      reconnection: true,

      reconnectionAttempts: Infinity,

      reconnectionDelay: 1000,

      reconnectionDelayMax: 5000,

      randomizationFactor: 0.5,

      timeout: 10000,
    });

    socketRef.current = socketInstance;

    setSocket(socketInstance);

    /*
     * -----------------------------------------------
     * CONNECT
     * -----------------------------------------------
     */

    const handleConnect = () => {
      console.log(
        "🟢 Socket connected:",
        socketInstance.id
      );

      console.log(
        "🏪 Authenticated tenant:",
        restaurantId
      );

      /*
       * IMPORTANT:
       *
       * restaurantId is NOT sent to backend.
       *
       * Backend derives tenant from JWT.
       */
    };

    /*
     * -----------------------------------------------
     * NEW ORDER
     * -----------------------------------------------
     *
     * This event is used for the GLOBAL blocking
     * order alert.
     */

    const handleNewOrder = (order) => {
      console.log(
        "🔔 NEW_ORDER_RECEIVED:",
        order
      );

      /*
       * Defense in depth.
       *
       * Socket server already isolates the tenant.
       * If payload contains restaurantId, validate it.
       */

      if (
        !isTenantEvent(
          order,
          restaurantId
        )
      ) {
        console.warn(
          "🚫 Ignoring cross-tenant order event"
        );

        return;
      }

      /*
       * Existing notification sound.
       */
      triggerNotificationSound(
        order,
        "NEW_ORDER_RECEIVED"
      );
    };

    /*
     * -----------------------------------------------
     * RUNNING ORDER UPDATED
     * -----------------------------------------------
     *
     * This event is ONLY for the case where new
     * items are appended to an already-running order.
     *
     * IMPORTANT:
     *
     * We do NOT use ORDER_STATUS_UPDATED for this,
     * because ORDER_STATUS_UPDATED is also used for
     * accept/reject/cancel/etc.
     */

    const handleRunningOrderUpdated = (
      payload
    ) => {
      console.log(
        "🔔 RUNNING_ORDER_UPDATED:",
        payload
      );

      const order =
        payload?.order ?? payload;

      if (
        !isTenantEvent(
          order,
          restaurantId
        )
      ) {
        console.warn(
          "🚫 Ignoring cross-tenant running-order event"
        );

        return;
      }

      /*
       * Sound.
       *
       * If backend also emits PLAY_NOTIFICATION_SOUND,
       * deduplication prevents double playback.
       */
      triggerNotificationSound(
        order,
        "RUNNING_ORDER_UPDATED"
      );
    };

    /*
     * -----------------------------------------------
     * PLAY NOTIFICATION SOUND
     * -----------------------------------------------
     *
     * Existing event preserved.
     */

    const handleNotificationSound = (
      payload
    ) => {
      console.log(
        "🔊 PLAY_NOTIFICATION_SOUND:",
        payload
      );

      if (
        !isTenantEvent(
          payload,
          restaurantId
        )
      ) {
        console.warn(
          "🚫 Ignoring cross-tenant notification sound"
        );

        return;
      }

      triggerNotificationSound(
        payload,
        "PLAY_NOTIFICATION_SOUND"
      );
    };

    /*
     * -----------------------------------------------
     * DISCONNECT
     * -----------------------------------------------
     */

    const handleDisconnect = (
      reason
    ) => {
      console.warn(
        "🟡 Socket disconnected:",
        reason
      );
    };

    /*
     * -----------------------------------------------
     * CONNECTION ERROR
     * -----------------------------------------------
     */

    const handleConnectError = (
      error
    ) => {
      console.error(
        "🔴 Socket connection error:",
        error?.message || error
      );
    };

    /*
     * -----------------------------------------------
     * RECONNECT ATTEMPT
     * -----------------------------------------------
     */

    const handleReconnectAttempt = (
      attempt
    ) => {
      console.log(
        `🔄 Socket reconnect attempt #${attempt}`
      );
    };

    /*
     * -----------------------------------------------
     * RECONNECTED
     * -----------------------------------------------
     */

    const handleReconnect = (
      attempt
    ) => {
      console.log(
        `🟢 Socket reconnected after ${attempt} attempt(s)`
      );
    };

    /*
     * -----------------------------------------------
     * SOCKET LISTENERS
     * -----------------------------------------------
     */

    socketInstance.on(
      "connect",
      handleConnect
    );

    socketInstance.on(
      "NEW_ORDER_RECEIVED",
      handleNewOrder
    );

    socketInstance.on(
      "RUNNING_ORDER_UPDATED",
      handleRunningOrderUpdated
    );

    socketInstance.on(
      "PLAY_NOTIFICATION_SOUND",
      handleNotificationSound
    );

    socketInstance.on(
      "disconnect",
      handleDisconnect
    );

    socketInstance.on(
      "connect_error",
      handleConnectError
    );

    /*
     * Socket.IO Manager events.
     */

    socketInstance.io.on(
      "reconnect_attempt",
      handleReconnectAttempt
    );

    socketInstance.io.on(
      "reconnect",
      handleReconnect
    );

    /*
     * -----------------------------------------------
     * CLEANUP
     * -----------------------------------------------
     */

    return () => {
      console.log(
        "🧹 Cleaning tenant socket:",
        restaurantId
      );

      socketInstance.off(
        "connect",
        handleConnect
      );

      socketInstance.off(
        "NEW_ORDER_RECEIVED",
        handleNewOrder
      );

      socketInstance.off(
        "RUNNING_ORDER_UPDATED",
        handleRunningOrderUpdated
      );

      socketInstance.off(
        "PLAY_NOTIFICATION_SOUND",
        handleNotificationSound
      );

      socketInstance.off(
        "disconnect",
        handleDisconnect
      );

      socketInstance.off(
        "connect_error",
        handleConnectError
      );

      socketInstance.io.off(
        "reconnect_attempt",
        handleReconnectAttempt
      );

      socketInstance.io.off(
        "reconnect",
        handleReconnect
      );

      socketInstance.disconnect();

      if (
        socketRef.current ===
        socketInstance
      ) {
        socketRef.current = null;

        setSocket(null);
      }
    };
  }, [
    user,
    restaurantId,
    playAlert,
  ]);

  /*
   * --------------------------------------------------
   * CONTEXT VALUE
   * --------------------------------------------------
   *
   * IMPORTANT:
   *
   * useSocket() continues returning the socket
   * instance exactly like before.
   */

  const value = useMemo(
    () => socket,
    [socket]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/*
 * --------------------------------------------------
 * SOCKET HOOK
 * --------------------------------------------------
 */

export const useSocket = () =>
  useContext(SocketContext);