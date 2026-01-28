import { createContext, useContext, useState, useEffect, useRef } from "react";
import syncQueue from "../utils/syncQueue";

const ConnectionContext = createContext();

const CHECK_INTERVAL_ONLINE = 30000; // 30s quand online
const CHECK_INTERVAL_OFFLINE = 10000; // 10s quand offline

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(null); // null = pas encore vérifié
  const intervalRef = useRef(null);

  const checkConnection = async () => {
    try {
      const serverAddress = await window.store?.get("serverAddress");
      if (!serverAddress) {
        setIsOnline(false);
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${serverAddress}/api/server/status`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  };

  // Check initial une seule fois
  useEffect(() => {
    checkConnection();
  }, []);

  // Interval adaptatif basé sur le status (seulement après le premier check)
  useEffect(() => {
    if (isOnline === null) return; // Attendre le premier check

    const interval = isOnline ? CHECK_INTERVAL_ONLINE : CHECK_INTERVAL_OFFLINE;
    intervalRef.current = setInterval(checkConnection, interval);

    return () => clearInterval(intervalRef.current);
  }, [isOnline]);

  // Sync queue quand on repasse online
  useEffect(() => {
    if (isOnline) syncQueue.processQueue();
  }, [isOnline]);

  return (
    <ConnectionContext.Provider value={{ isOnline, checkConnection }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context)
    throw new Error("useConnection must be used within ConnectionProvider");
  return context;
}
