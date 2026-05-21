import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { loginUser, registerUser } from "../api/user";
import { setUnauthorizedHandler } from "../utils/apiUtils";
import logger from "../services/logger";
import { storeGet } from "../utils/storeClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await window.store.delete("userToken");
      setUser(null);
      setIsAuthenticated(false);
    };
    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await storeGet("userToken");
        if (typeof token === 'string' && token.length > 0) {
          try {
            const decoded = jwtDecode(token);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
              window.store.delete("userToken");
            } else {
              setUser(decoded.user);
              setIsAuthenticated(true);
            }
          } catch {
            window.store.delete("userToken");
          }
        }
        setLoading(false);
      } catch (error) {
        logger.error("Error retrieving token:", error);
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  const login = async (username, password) => {
    const { success, token, error } = await loginUser(username, password);
    if (success) {
      const decoded = jwtDecode(token);
      setUser(decoded.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error };
  };

  const register = async (username, password) => {
    const { success, token, error } = await registerUser(username, password);
    if (success) {
      const decoded = jwtDecode(token);
      setUser(decoded.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, error };
  };

  const logout = async () => {
    await window.store.delete("userToken");
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAuthenticated, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
