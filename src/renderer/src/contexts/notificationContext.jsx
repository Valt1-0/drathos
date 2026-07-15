import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, refreshAccessToken } from "./authContext";
import { connectSocket, disconnectSocket } from "../services/socketService";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const userRef = useRef(user);
  const tRef = useRef(t);

  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    window.store.get("notificationsEnabled").then(v => setEnabled(v ?? true));
  }, []);

  const setNotificationsEnabled = useCallback(async (value) => {
    setEnabled(value);
    await window.store.set("notificationsEnabled", value);
  }, []);

  useEffect(() => {
    if (!user || !enabled) {
      disconnectSocket();
      return;
    }

    const init = async () => {
      const serverAddress = await window.store.get("serverAddress");
      if (!serverAddress) return;

      const socket = connectSocket(serverAddress, () => window.store.get("userToken"));

      // If the socket is rejected due to an expired token, refresh and let socket.io
      // reconnect automatically — the getter will pick up the new token.
      socket.on("connect_error", (err) => {
        const isAuthError = err.message?.toLowerCase().includes("auth")
          || err.data?.type === "UnauthorizedError";
        if (isAuthError) refreshAccessToken().catch(() => {});
      });

      socket.on("game:added", ({ game, user: addedBy }) => {
        if (addedBy?.id === userRef.current?._id) return;
        const msg = tRef.current("notifications.gameAdded", { game: game?.name, user: addedBy?.username || tRef.current("notifications.unknownUser") });
        window.api.notification.show({ title: tRef.current("notifications.newGame"), body: msg });
      });
    };

    init();
    return () => disconnectSocket();
  }, [user, enabled]);

  return (
    <NotificationContext.Provider value={{ enabled, setNotificationsEnabled }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
