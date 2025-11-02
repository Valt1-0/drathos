import { useState, useEffect, useRef } from "react";
import { formatStats as formatStatsAPI, saveLocalStats, syncStatsToServer } from "../../api/gameStats";
import { stopGame } from "../../api/installedGames";
import syncQueue from "../../utils/syncQueue";
import { toast } from "sonner";

export const useGameStats = () => {
  const [gameStats, setGameStats] = useState({});
  const isProcessingStats = useRef(false);

  // Load initial stats from cache
  useEffect(() => {
    const loadStatsFromCache = async () => {
      const cachedGamesObject = await window.store.get("installedGamesCache", {});
      const stats = {};
      Object.entries(cachedGamesObject).forEach(([gameId, data]) => {
        if (data.stats) {
          stats[gameId] = formatStatsAPI(data.stats);
        }
      });
      setGameStats(stats);
    };

    loadStatsFromCache();
  }, []);

  // Handle save game stats event
  useEffect(() => {
    const handleSaveStats = async (data) => {
      if (isProcessingStats.current) {
        console.debug("[useGameStats] Stats update already in progress, skipping...");
        return;
      }

      isProcessingStats.current = true;

      if (!data || !data.sessionData) {
        console.error("[useGameStats] Données de session invalides");
        isProcessingStats.current = false;
        return;
      }

      const duration = data.sessionData.duration;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      try {
        const saveResult = await saveLocalStats(data.gameId, data.sessionData);

        try {
          if (saveResult.success && saveResult.stats) {
            await syncStatsToServer(data.gameId, saveResult.stats, data.sessionData.duration);
          } else {
            await stopGame(data.gameId);
          }
        } catch (error) {
          if (saveResult.success && saveResult.stats) {
            await syncQueue.enqueue(data.gameId, saveResult.stats, data.sessionData.duration);
          }

          toast.info("Statistiques sauvegardées localement", {
            description: `Session de ${durationStr} sera synchronisée lors de la prochaine connexion`,
            duration: 4000,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const cachedGamesObject = await window.store.get("installedGamesCache", {});
        const stats = {};
        Object.entries(cachedGamesObject).forEach(([gameId, gameData]) => {
          if (gameData.stats) {
            stats[gameId] = formatStatsAPI(gameData.stats);
          }
        });
        setGameStats(stats);
      } catch (error) {
        console.error("[useGameStats] Erreur lors de la sauvegarde des stats:", error);

        toast.error("Erreur de sauvegarde des statistiques", {
          description: "Impossible d'enregistrer les données de la session",
          duration: 5000,
        });
      } finally {
        setTimeout(() => {
          isProcessingStats.current = false;
        }, 2000);
      }
    };

    if (window.api.onSaveGameStats) {
      window.api.onSaveGameStats(handleSaveStats);
    }

    return () => {
      // Cleanup listener
    };
  }, []);

  // Update stats when session duration changes
  const updateSessionStats = (gameId, sessionDuration) => {
    if (sessionDuration) {
      setGameStats((prev) => ({
        ...prev,
        [gameId]: {
          ...prev[gameId],
          currentSessionDuration: sessionDuration,
          lastActivity: Date.now(),
        },
      }));
    }
  };

  return {
    gameStats,
    setGameStats,
    updateSessionStats,
  };
};
