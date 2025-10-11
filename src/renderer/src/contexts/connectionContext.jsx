// drathos/src/renderer/src/contexts/connectionContext.jsx

import { createContext, useContext, useState } from "react";

const ConnectionContext = createContext();

// Variable globale pour setter le statut depuis n'importe où
let globalSetOnline = null;

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);

  // Exposer le setter globalement
  globalSetOnline = setIsOnline;

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
