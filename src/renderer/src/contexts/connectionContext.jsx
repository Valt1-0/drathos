// drathos/src/renderer/src/contexts/connectionContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { isServerOnline, setConnectionCallback } from "../api/gameStats";

const ConnectionContext = createContext();

export function ConnectionProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastCheck, setLastCheck] = useState(Date.now());
  const [checkInterval, setCheckInterval] = useState(null);

  /**
   * Vérifie la connexion au serveur
   */
  const checkConnection = useCallback(async () => {
    try {
      const online = await isServerOnline();
      setIsOnline(online);
      setLastCheck(Date.now());
      console.log(`[Connection] ${online ? "✅ Online" : "📴 Offline"}`);
    } catch (error) {
      setIsOnline(false);
      setLastCheck(Date.now());
      console.log("[Connection] 📴 Offline");
    }
  }, []);

  /**
   * Force une vérification immédiate (utile après une erreur API)
   */
  const forceCheck = useCallback(() => {
    checkConnection();
  }, [checkConnection]);

  /**
   * Marque manuellement comme online (quand une requête API réussit)
   */
  const markOnline = useCallback(() => {
    if (!isOnline) {
      console.log("[Connection] ✅ Détecté online via requête API");
      setIsOnline(true);
      setLastCheck(Date.now());
    }
  }, [isOnline]);

  /**
   * Marque manuellement comme offline (quand une requête API échoue)
   */
  const markOffline = useCallback(() => {
    if (isOnline) {
      console.log("[Connection] 📴 Détecté offline via requête API");
      setIsOnline(false);
      setLastCheck(Date.now());
    }
  }, [isOnline]);

  // Vérification initiale au montage + enregistrement du callback
  useEffect(() => {
    checkConnection();

    // Enregistrer le callback pour que les requêtes API mettent à jour automatiquement l'état
    setConnectionCallback((online) => {
      if (online !== isOnline) {
        setIsOnline(online);
        setLastCheck(Date.now());
      }
    });
  }, [checkConnection]);

  // Vérification périodique (toutes les 60 secondes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkConnection();
    }, 60000); // 1 minute

    setCheckInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkConnection]);

  const value = {
    isOnline,
    lastCheck,
    checkConnection: forceCheck,
    markOnline,
    markOffline,
  };

  return (
    <ConnectionContext.Provider value={value}>
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
