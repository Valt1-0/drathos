import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { loginUser, registerUser, logoutUser } from "../api/user";
import { setUnauthorizedHandler, setTokenRefresher } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";
import logger from "../services/logger";
import { storeGet } from "../utils/storeClient";

// Calls the /refresh endpoint and updates the stored access token.
// Returns: new token string (success) | null (server rejected) | false (network error / offline)
// Intentionally uses raw fetch (not fetchWithTimeout) to avoid triggering another refresh loop.
// Exported so notificationContext can trigger a refresh without going through fetchWithTimeout.
export async function refreshAccessToken() {
  const [serverAddress, refreshToken] = await Promise.all([
    window.store.get("serverAddress"),
    window.store.get("refreshToken"),
  ]);
  if (!refreshToken) return null;

  try {
    const response = await fetch(buildServerUrl(serverAddress, "/api/users/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null; // server explicitly rejected (expired, revoked, etc.)

    const data = await response.json();
    await window.store.set("userToken", data.token);
    if (data.refreshToken) await window.store.set("refreshToken", data.refreshToken);
    return data.token;
  } catch {
    return false; // network error — server unreachable (offline mode)
  }
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await Promise.all([
        window.store.delete("userToken"),
        window.store.delete("refreshToken"),
      ]);
      setUser(null);
      setIsAuthenticated(false);
    };

    const handleRefresh = async () => {
      const result = await refreshAccessToken();
      if (typeof result !== "string") throw new Error("Token refresh failed");
      return result;
    };

    setUnauthorizedHandler(handleUnauthorized);
    setTokenRefresher(handleRefresh);
    return () => {
      setUnauthorizedHandler(null);
      setTokenRefresher(null);
    };
  }, []);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await storeGet("userToken");
        if (typeof token === 'string' && token.length > 0) {
          try {
            const decoded = jwtDecode(token);
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
              // Access token expired — try silent refresh
              const refreshResult = await refreshAccessToken();
              if (typeof refreshResult === "string") {
                // Refresh succeeded — use new token
                const newDecoded = jwtDecode(refreshResult);
                setUser(newDecoded.user);
                setIsAuthenticated(true);
              } else if (refreshResult === false) {
                // Network error / server offline — allow offline access with expired token.
                // Locally installed games can still be launched; server requests will
                // re-trigger the refresh flow once the server is reachable again.
                setUser(decoded.user);
                setIsAuthenticated(true);
              } else {
                // null — server explicitly rejected the refresh token (expired/revoked)
                await Promise.all([
                  window.store.delete("userToken"),
                  window.store.delete("refreshToken"),
                ]);
              }
            } else {
              setUser(decoded.user);
              setIsAuthenticated(true);
            }
          } catch {
            window.store.delete("userToken");
            window.store.delete("refreshToken");
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
    // Fire-and-forget — invalidates the refresh token in DB, don't block local logout
    logoutUser().catch(() => {});
    await Promise.all([
      window.store.delete("userToken"),
      window.store.delete("refreshToken"),
    ]);
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
