import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const restaurantId = user?.restaurantId; // primitive value 

  useEffect(() => {
    if (!restaurantId) {
      setSocket(null);
      return;
    }

    const socketInstance = io(`${import.meta.env.VITE_APP_API_BASE}`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      socketInstance.emit('join_restaurant_room', restaurantId);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
    // 🔑 only restaurantId (primitive) pe depend, all user object pe 
  }, [restaurantId]);

  const value = useMemo(() => socket, [socket]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);