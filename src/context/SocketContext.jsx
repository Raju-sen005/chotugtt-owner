import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useNotificationSound } from "../hooks/useNotificationSound";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  const { user } = useAuth();
  const restaurantId = user?.restaurantId;

  const playAlert = useNotificationSound();

  useEffect(() => {
    // User logged out / restaurant unavailable
    if (!restaurantId) {
      setSocket(null);
      return;
    }

    console.log(
      "🔌 Initializing socket for restaurant:",
      restaurantId
    );

    const socketInstance = io(
      import.meta.env.VITE_APP_API_BASE,
      {
        withCredentials: true,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }
    );

    // ==========================================
    // SOCKET CONNECTED
    // ==========================================
    const handleConnect = () => {
      console.log(
        "🔌 Socket connected:",
        socketInstance.id
      );

      socketInstance.emit(
        "join_restaurant_room",
        restaurantId
      );

      console.log(
        "🏪 Joined restaurant room:",
        restaurantId
      );
    };

    // ==========================================
    // GLOBAL NEW ORDER NOTIFICATION
    // ==========================================
    const handleGlobalNotification = (order) => {
      console.log(
        "🔔 Global order notification received:",
        order
      );

      // 🔊 Play your custom female MP3
      playAlert();
    };

    // ==========================================
    // SOCKET DISCONNECTED
    // ==========================================
    const handleDisconnect = (reason) => {
      console.warn(
        "🔌 Socket disconnected:",
        reason
      );
    };

    // ==========================================
    // SOCKET CONNECTION ERROR
    // ==========================================
    const handleConnectError = (error) => {
      console.error(
        "❌ Socket connection error:",
        error.message
      );
    };

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    socketInstance.on(
      "connect",
      handleConnect
    );

    socketInstance.on(
      "NEW_ORDER_RECEIVED",
      handleGlobalNotification
    );

    socketInstance.on(
      "PLAY_NOTIFICATION_SOUND",
      handleGlobalNotification
    );

    socketInstance.on(
      "disconnect",
      handleDisconnect
    );

    socketInstance.on(
      "connect_error",
      handleConnectError
    );

    // Make socket available globally
    setSocket(socketInstance);

    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      console.log(
        "🧹 Cleaning up restaurant socket:",
        restaurantId
      );

      socketInstance.off(
        "connect",
        handleConnect
      );

      socketInstance.off(
        "NEW_ORDER_RECEIVED",
        handleGlobalNotification
      );

      socketInstance.off(
        "PLAY_NOTIFICATION_SOUND",
        handleGlobalNotification
      );

      socketInstance.off(
        "disconnect",
        handleDisconnect
      );

      socketInstance.off(
        "connect_error",
        handleConnectError
      );

      socketInstance.disconnect();
    };
  }, [restaurantId, playAlert]);

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

export const useSocket = () =>
  useContext(SocketContext);