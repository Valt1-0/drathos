import { useState, useEffect, useRef } from "react";
import { formatStats as formatStatsAPI, saveLocalStats, syncStatsToServer } from "../../api/gameStats";
import { stopGame } from "../../api/installedGames";
import syncQueue from "../../utils/syncQueue";
import { toast } from "sonner";

export const useGameStats = () => {
  const [gameStats, setGameStats] = useState({});
  const isProcessingStats = useRef(false);
  const statsQueue = useRef([]);

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

  // Process stats queue sequentially
  const processStatsQueue = async () => {
    if (isProcessingStats.current || statsQueue.current.length === 0) {
      return;
    }

    isProcessingStats.current = true;

    while (statsQueue.current.length > 0) {
      const data = statsQueue.current.shift();

      if (!data || !data.sessionData) {
        console.error("[useGameStats] Invalid session data");
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
            console.log(`[useGameStats] ✅ Stats synced successfully for ${data.gameId}`);
          } else {
            await stopGame(data.gameId);
          }
        } catch (error) {
          if (saveResult.success && saveResult.stats) {
            await syncQueue.enqueue(data.gameId, saveResult.stats, data.sessionData.duration);
          }

          toast.info("Statistics saved locally", {
            description: `Session of ${durationStr} will be synced when connection is restored`,
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
        console.error("[useGameStats] Error saving stats:", error);

        toast.error("Failed to save statistics", {
          description: "Unable to record session data",
          duration: 5000,
        });
      }
    }

    isProcessingStats.current = false;
  };

  // Handle save game stats event
  useEffect(() => {
    const handleSaveStats = async (data) => {
      // Add to queue instead of skipping
      statsQueue.current.push(data);
      console.log(`[useGameStats] 📝 Stats event queued (queue size: ${statsQueue.current.length})`);

      // Process the queue
      processStatsQueue();
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
