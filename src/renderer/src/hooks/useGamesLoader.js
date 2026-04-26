import { useState, useEffect, useCallback } from "react";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { gamesCache } from "../utils/gamesCache";
import { useConnection } from "../contexts/connectionContext";
import { storeGet } from "../utils/storeClient";
import logger from "../services/logger";

/**
 * Shared data-loading hook for both Home and Games pages.
 *
 * Returns:
 *  - games          : all server games ([] when offline)
 *  - installedGames : installed games (from cache or server)
 *  - loading        : true during the initial fetch
 *  - error          : string | null
 *  - reload         : () => void — force-invalidates cache and re-fetches
 */
export function useGamesLoader() {
  const { isOnline } = useConnection();
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [loading, setLoading] = useState(!gamesCache.isValid());
  const [error, setError] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => {
    gamesCache.clear();
    setError(null);
    setReloadCount(c => c + 1);
  }, []);

  useEffect(() => {
    if (isOnline === null) return; // not yet determined

    let mounted = true;

    const load = async () => {
      // 1. Always read the local IPC cache for installed games
      const localCache = await storeGet("installedGamesCache", {});
      if (!mounted) return;

      const localInstalled = Object.entries(localCache ?? {}).map(([id, data]) => ({
        _id: `installed_${id}`,
        serverGameId: {
          _id: id,
          name: data.name,
          coverUrl: data.coverUrl,
          genres: data.genres,
          summary: data.summary,
        },
        path: data.path,
      }));

      // 2. Offline — show only what we have locally
      if (!isOnline) {
        gamesCache.clear();
        setInstalledGames(localInstalled);
        setGames([]);
        setLoading(false);
        return;
      }

      // 3. Online + warm cache — apply instantly, no spinner
      if (gamesCache.isValid()) {
        const c = gamesCache.get();
        setGames(c.games);
        setInstalledGames(c.installedGames);
        setLoading(false);
        return;
      }

      // 4. Online + cold cache — fetch
      setLoading(true);
      setError(null);
      try {
        const [allGames, installed] = await Promise.all([
          getAllServerGames(),
          getInstalledGames(),
        ]);
        if (!mounted) return;
        gamesCache.set({ games: allGames || [], installedGames: installed || [] });
        setGames(allGames || []);
        setInstalledGames(installed || []);
      } catch (err) {
        if (!mounted) return;
        logger.error("[useGamesLoader] fetch error:", err.message);
        setError(err.message || "Loading failed");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [isOnline, reloadCount]);

  return { games, setGames, installedGames, setInstalledGames, loading, error, reload };
}
