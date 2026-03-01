import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import syncQueue from "../utils/syncQueue";

const ConnectionContext = createContext();

const CHECK_INTERVAL_ONLINE = 10000; // 10s quand online
const CHECK_INTERVAL_OFFLINE_MIN = 2000; // 2s initial quand offline
const CHECK_INTERVAL_OFFLINE_MAX = 15000; // 15s max quand offline

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(null); // null = pas encore vérifié
  const intervalRef = useRef(null);
  const offlineFailsRef = useRef(0);

  const checkConnection = useCallback(async () => {
    try {
      const serverAddress = await window.store?.get("serverAddress");
      if (!serverAddress) {
        setIsOnline(false);
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${serverAddress}/api/server/status`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const online = response.ok;
      if (online) offlineFailsRef.current = 0;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Check initial une seule fois
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Interval adaptatif avec backoff quand offline
  useEffect(() => {
    if (isOnline === null) return; // Attendre le premier check
    let cancelled = false;

    if (isOnline) {
      offlineFailsRef.current = 0;
      intervalRef.current = setInterval(checkConnection, CHECK_INTERVAL_ONLINE);
    } else {
      const scheduleNext = () => {
        if (cancelled) return;
        const delay = Math.min(
          CHECK_INTERVAL_OFFLINE_MIN * Math.pow(1.5, offlineFailsRef.current),
          CHECK_INTERVAL_OFFLINE_MAX
        );
        intervalRef.current = setTimeout(async () => {
          if (cancelled) return;
          offlineFailsRef.current++;
          const nowOnline = await checkConnection();
          // Si toujours offline, re-planifier (setIsOnline(false) ne re-trigger pas l'effect)
          if (!nowOnline) scheduleNext();
        }, delay);
      };
      scheduleNext();
    }

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
      clearTimeout(intervalRef.current);
    };
  }, [isOnline, checkConnection]);

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
