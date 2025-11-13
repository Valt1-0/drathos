import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { loginUser, registerUser } from "../api/user";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Wait for the promise to resolve
        const token = await window.store.get("userToken");
        if (token && Object.keys(token).length !== 0) {
          try {
            const decoded = jwtDecode(token);
            setUser(decoded.user);
          } catch (error) {
            window.store.delete("userToken");
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error retrieving token:", error);
        setLoading(false);
      }
    };
    fetchToken(); // Call the async function to retrieve the token
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
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAuthenticated }}>
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
