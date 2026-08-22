/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const AuthContext = createContext(null);
axios.defaults.withCredentials = true;
axios.defaults.baseURL = `${import.meta.env.VITE_APP_API_BASE}`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await axios.get("/auth/me");
        if (res.data.success) setUser(res.data.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await axios.post("/auth/login", { email, password });
    
    // Agar subscription expire ya past due hai
    if (res.data.requiresSubscription) {
      return res.data; // Yeh login component mein catch 
    }

    if (res.data.success) setUser(res.data.data);
    return res.data;
  }, []);

  const registerTenant = useCallback(async (formData) => {
    const res = await axios.post("/auth/register", formData);
    if (res.data.success) setUser(res.data.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await axios.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, login, registerTenant, logout, loading }),
    [user, loading, login, registerTenant, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
