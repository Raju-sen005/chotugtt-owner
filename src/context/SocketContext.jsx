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

/*
 * Same order can arrive through:
 *
 * NEW_ORDER_RECEIVED
 * +
 * PLAY_NOTIFICATION_SOUND
 *
 * within a very short time.
 *
 * We keep a small deduplication window.
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

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);

  const socketRef = useRef(null);

  /*
   * --------------------------------------------------
   * SOUND DEDUPLICATION
   * --------------------------------------------------
   *
   * Stores recently played order IDs.
   *
   * Example:
   *
   * NEW_ORDER_RECEIVED
   *       ↓
   * play sound
   *
   * PLAY_NOTIFICATION_SOUND
   *       ↓
   * same order
   *       ↓
   * skip duplicate
   */
  const recentSoundEventsRef = useRef(new Map());

  const restaurantId = getRestaurantId(user);

  /*
   * Existing hook API remains unchanged.
   */
  const playAlert = useNotificationSound();

  /*
   * --------------------------------------------------
   * SOUND TRIGGER HELPER
   * --------------------------------------------------
   */
  const triggerNotificationSound = (payload, source) => {
    /*
     * Try to identify the order.
     */
    const orderId =
      payload?.orderId ??
      payload?._id ??
      payload?.id ??
      null;

    /*
     * If order ID is unavailable,
     * preserve existing behavior.
     *
     * We cannot safely deduplicate an unknown event.
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
     * Remove old entries.
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

      /*
       * Clear old sound deduplication state
       * when tenant changes/logs out.
       */
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
       * WebSocket + polling fallback.
       */
      transports: [
        "polling",
        "websocket",
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
       * Backend derives restaurantId from JWT.
       */
    };

    /*
     * -----------------------------------------------
     * NEW ORDER
     * -----------------------------------------------
     */
    const handleNewOrder = (order) => {
      console.log(
        "🔔 NEW_ORDER_RECEIVED:",
        order
      );

      /*
       * -------------------------------------------
       * TENANT DEFENSE
       * -------------------------------------------
       */
      const eventRestaurantId =
        typeof order?.restaurantId ===
        "object"
          ? order.restaurantId?._id
          : order?.restaurantId;

      /*
       * If event explicitly contains another
       * restaurant ID, ignore it.
       */
      if (
        eventRestaurantId &&
        String(eventRestaurantId) !==
          String(restaurantId)
      ) {
        console.warn(
          "🚫 Ignoring cross-tenant order event"
        );

        return;
      }

      /*
       * -------------------------------------------
       * NOTIFICATION SOUND
       * -------------------------------------------
       */
      triggerNotificationSound(
        order,
        "NEW_ORDER_RECEIVED"
      );
    };

    /*
     * -----------------------------------------------
     * PLAY NOTIFICATION SOUND
     * -----------------------------------------------
     *
     * Existing event preserved.
     *
     * It will now be deduplicated if the same order
     * already triggered NEW_ORDER_RECEIVED.
     */
    const handleNotificationSound = (
      payload
    ) => {
      console.log(
        "🔊 PLAY_NOTIFICATION_SOUND:",
        payload
      );

      /*
       * If payload contains restaurantId,
       * perform the same defense-in-depth check.
       */
      const eventRestaurantId =
        typeof payload?.restaurantId ===
        "object"
          ? payload.restaurantId?._id
          : payload?.restaurantId;

      if (
        eventRestaurantId &&
        String(eventRestaurantId) !==
          String(restaurantId)
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

    /*
     * Existing functionality preserved.
     */
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
