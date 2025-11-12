// drathos/src/renderer/src/contexts/connectionContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import syncQueue from "../utils/syncQueue";

const ConnectionContext = createContext();

// Variable globale pour setter le statut depuis n'importe où
let globalSetOnline = null;

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);

  // Exposer le setter globalement
  globalSetOnline = setIsOnline;

  // Détecter le passage en mode online et trigger la sync immédiatement
  useEffect(() => {
    if (isOnline) {
      console.log("[ConnectionContext] 🌐 Connection restored - triggering immediate sync");
      // Attendre un peu pour laisser le réseau se stabiliser
      const timeout = setTimeout(() => {
        syncQueue.processQueue();
      }, 1000);

      return () => clearTimeout(timeout);
    } else {
      console.log("[ConnectionContext] 📴 Connection lost - stats will be queued locally");
    }
  }, [isOnline]);

  return (
    <ConnectionContext.Provider value={{ isOnline }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within ConnectionProvider");
  }
  return context;
}

// Fonction helper pour mettre à jour le statut depuis les API
export function updateConnectionStatus(online) {
  if (globalSetOnline) {
    globalSetOnline(online);
  }
}
