import { useState, useEffect, useRef } from "react";
import { storeGet } from "../../utils/storeClient";
import { useTranslation } from "react-i18next";
import { formatStats as formatStatsAPI, saveLocalStats, syncStatsToServer } from "../../api/gameStats";
import { stopGame } from "../../api/installedGames";
import syncQueue from "../../utils/syncQueue";
import { toast } from "sonner";
import logger from "../../services/logger";

export const useGameStats = () => {
  const { t } = useTranslation();
  const [gameStats, setGameStats] = useState({});
  const isProcessingStats = useRef(false);
  const statsQueue = useRef([]);

  // Load initial stats from cache
  useEffect(() => {
    const loadStatsFromCache = async () => {
      const cachedGamesObject = await storeGet("installedGamesCache", {});
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

  // Ref-stabilized processor — updated every render so it always reads the
  // latest `t` translation function while the useEffect below stays mounted once.
  const processStatsQueueRef = useRef(null);
  processStatsQueueRef.current = async () => {
    if (isProcessingStats.current || statsQueue.current.length === 0) {
      return;
    }

    isProcessingStats.current = true;

    while (statsQueue.current.length > 0) {
      const data = statsQueue.current.shift();

      if (!data || !data.sessionData) {
        logger.error("[useGameStats] Invalid session data");
        continue;
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
            logger.info(`[useGameStats] Stats synced successfully for ${data.gameId}`);
          } else {
            await stopGame(data.gameId);
          }
        } catch (error) {
          if (saveResult.success && saveResult.stats) {
            await syncQueue.enqueue(data.gameId, saveResult.stats, data.sessionData.duration);
          }

          toast.info(t('gameStats.savedLocally'), {
            description: t('gameStats.savedLocallyDesc', { duration: durationStr }),
            duration: 4000,
            id: "game-stats-sync-offline",
          });
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        const cachedGamesObject = await storeGet("installedGamesCache", {});
        const stats = {};
        Object.entries(cachedGamesObject).forEach(([gameId, gameData]) => {
          if (gameData.stats) {
            stats[gameId] = formatStatsAPI(gameData.stats);
          }
        });
        setGameStats(stats);
      } catch (error) {
        logger.error("[useGameStats] Error saving stats:", error);

        toast.error(t('gameStats.saveFailed'), {
          description: t('gameStats.saveFailedDesc'),
          duration: 5000,
          id: "game-stats-error",
        });
      }
    }

    isProcessingStats.current = false;
  };

  // Handle save game stats event — mounted once, calls via ref to avoid stale closure
  useEffect(() => {
    const handleSaveStats = async (data) => {
      statsQueue.current.push(data);
      logger.info(`[useGameStats] Stats event queued (queue size: ${statsQueue.current.length})`);
      processStatsQueueRef.current();
    };

    let unsub;
    if (window.api.onSaveGameStats) {
      unsub = window.api.onSaveGameStats(handleSaveStats);
    }

    return () => {
      unsub?.();
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
