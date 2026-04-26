import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import syncQueue from "../utils/syncQueue";

const ConnectionContext = createContext();

const CHECK_INTERVAL_ONLINE = 10000; // 10s when online
const CHECK_INTERVAL_OFFLINE_MIN = 2000; // 2s initial when offline
const CHECK_INTERVAL_OFFLINE_MAX = 15000; // 15s max when offline

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(null); // null = not yet checked
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

  // Initial check once
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Pause the polling interval when the window is hidden, resume + re-check when visible
  useEffect(() => {
    let lastFocusCheck = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Pause — clear any running interval/timeout
        clearInterval(intervalRef.current);
        clearTimeout(intervalRef.current);
        return;
      }
      // Resumed — debounce to avoid firing twice on quick focus flickers
      const now = Date.now();
      if (now - lastFocusCheck < 2000) return;
      lastFocusCheck = now;
      checkConnection(); // Re-check immediately; the interval effect will restart
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [checkConnection]);

  // Adaptive interval with backoff when offline
  useEffect(() => {
    if (isOnline === null) return; // Wait for the first check
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
          // If still offline, reschedule (setIsOnline(false) does not re-trigger the effect)
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

  // Sync queue when coming back online
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
