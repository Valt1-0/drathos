import { buildServerUrl } from "../utils/urlHelper";
import logger from "../services/logger";

const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;
const pendingRequests = new Map(); // Prevent duplicate concurrent requests

const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
};

const getCachedResult = (query) => {
  cleanExpiredCache();
  const cacheKey = query.toLowerCase().trim();
  const cached = searchCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    logger.info(`[IGDB] Cache hit for "${query}"`);
    return cached.data;
  }

  return null;
};

const cacheResult = (query, data) => {
  const cacheKey = query.toLowerCase().trim();
  searchCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
};

export const searchGamesFromIGDB = async (query) => {
  try {
    const cached = getCachedResult(query);
    if (cached) {
      return cached;
    }

    const cacheKey = query.toLowerCase().trim();

    if (pendingRequests.has(cacheKey)) {
      logger.info(`[IGDB] Waiting for pending request for "${query}"`);
      return await pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const serverAddress = await window.store.get("serverAddress");
        const token = await window.store.get("userToken");

        const response = await fetch(buildServerUrl(serverAddress, `/api/igdb/search?game=${encodeURIComponent(query)}`), {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Erreur lors de la recherche de jeux : ${response.status}`);
        }

        const data = await response.json();

        cacheResult(query, data);

        return data;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);

    return await requestPromise;
  } catch (error) {
    logger.error("Erreur lors de la recherche de jeux :", error.message);
    return null;
  }
};

const screenshotsCache = new Map();

export const getGameScreenshots = async (igdbId) => {
  if (!igdbId) return [];
  if (screenshotsCache.has(igdbId)) return screenshotsCache.get(igdbId);
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");
    const response = await fetch(
      buildServerUrl(serverAddress, `/api/igdb/screenshots/${igdbId}`),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    const shots = Array.isArray(data.screenshots) ? data.screenshots : [];
    screenshotsCache.set(igdbId, shots);
    return shots;
  } catch (error) {
    logger.debug("[IGDB] Screenshots fetch failed:", error.message);
    return [];
  }
};

export const clearIGDBCache = () => {
  searchCache.clear();
  screenshotsCache.clear();
  logger.info("[IGDB] Cache cleared");
};
