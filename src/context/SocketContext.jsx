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

const getRestaurantId = (user) => {
  if (!user?.restaurantId) {
    return null;
  }

  if (typeof user.restaurantId === "object") {
    return user.restaurantId?._id ? String(user.restaurantId._id) : null;
  }

  return String(user.restaurantId);
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();

  const [socket, setSocket] = useState(null);

  const socketRef = useRef(null);

  const restaurantId = getRestaurantId(user);

  const playAlert = useNotificationSound();

  useEffect(() => {
    /*
     * -----------------------------------------
     * AUTH CHECK
     * -----------------------------------------
     */
    if (!user || !restaurantId) {
      if (socketRef.current) {
        console.log("🧹 Disconnecting socket because tenant is unavailable");

        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      setSocket(null);
      return;
    }

    /*
     * -----------------------------------------
     * PREVENT DUPLICATE SOCKET
     * -----------------------------------------
     */
    if (socketRef.current) {
      console.log("♻️ Existing socket already present");

      return;
    }

    console.log("🔌 Creating tenant socket:", restaurantId);

    /*
     * -----------------------------------------
     * SOCKET INSTANCE
     * -----------------------------------------
     */
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,

      /*
       * WebSocket preferred.
       * Polling fallback if websocket unavailable.
       */
      transports: ["polling", "websocket"],

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
     * -----------------------------------------
     * CONNECT
     * -----------------------------------------
     */
    const handleConnect = () => {
      console.log("🟢 Socket connected:", socketInstance.id);

      console.log("🏪 Authenticated tenant:", restaurantId);

      /*
       * IMPORTANT:
       *
       * restaurantId server ko send nahi karna.
       *
       * Backend JWT se restaurantId
       * determine karega.
       */
    };

    /*
     * -----------------------------------------
     * NEW ORDER
     * -----------------------------------------
     */
    const handleNewOrder = (order) => {
      console.log("🔔 NEW_ORDER_RECEIVED:", order);

      const eventRestaurantId =
        typeof order?.restaurantId === "object"
          ? order.restaurantId?._id
          : order?.restaurantId;

      /*
       * Defense-in-depth check.
       */
      if (
        eventRestaurantId &&
        String(eventRestaurantId) !== String(restaurantId)
      ) {
        console.warn("🚫 Ignoring cross-tenant order event");

        return;
      }

      playAlert();
    };

    /*
     * -----------------------------------------
     * SOUND
     * -----------------------------------------
     */
    const handleNotificationSound = (payload) => {
      console.log("🔊 PLAY_NOTIFICATION_SOUND:", payload);

      playAlert();
    };

    /*
     * -----------------------------------------
     * DISCONNECT
     * -----------------------------------------
     */
    const handleDisconnect = (reason) => {
      console.warn("🟡 Socket disconnected:", reason);
    };

    /*
     * -----------------------------------------
     * CONNECTION ERROR
     * -----------------------------------------
     */
    const handleConnectError = (error) => {
      console.error("🔴 Socket connection error:", error?.message || error);
    };

    /*
     * -----------------------------------------
     * RECONNECT ATTEMPT
     * -----------------------------------------
     */
    const handleReconnectAttempt = (attempt) => {
      console.log(`🔄 Socket reconnect attempt #${attempt}`);
    };

    /*
     * -----------------------------------------
     * RECONNECTED
     * -----------------------------------------
     */
    const handleReconnect = (attempt) => {
      console.log(`🟢 Socket reconnected after ${attempt} attempt(s)`);
    };

    /*
     * -----------------------------------------
     * LISTENERS
     * -----------------------------------------
     */

    socketInstance.on("connect", handleConnect);

    socketInstance.on("NEW_ORDER_RECEIVED", handleNewOrder);

    socketInstance.on("PLAY_NOTIFICATION_SOUND", handleNotificationSound);

    socketInstance.on("disconnect", handleDisconnect);

    socketInstance.on("connect_error", handleConnectError);

    socketInstance.io.on("reconnect_attempt", handleReconnectAttempt);

    socketInstance.io.on("reconnect", handleReconnect);

    /*
     * -----------------------------------------
     * CLEANUP
     * -----------------------------------------
     */
    return () => {
      console.log("🧹 Cleaning tenant socket:", restaurantId);

      socketInstance.off("connect", handleConnect);

      socketInstance.off("NEW_ORDER_RECEIVED", handleNewOrder);

      socketInstance.off("PLAY_NOTIFICATION_SOUND", handleNotificationSound);

      socketInstance.off("disconnect", handleDisconnect);

      socketInstance.off("connect_error", handleConnectError);

      socketInstance.io.off("reconnect_attempt", handleReconnectAttempt);

      socketInstance.io.off("reconnect", handleReconnect);

      socketInstance.disconnect();

      if (socketRef.current === socketInstance) {
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user, restaurantId, playAlert]);

  const value = useMemo(() => socket, [socket]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
