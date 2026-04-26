import { buildServerUrl } from "../utils/urlHelper";
import logger from "../services/logger";

// In-memory cache for IGDB search results
const searchCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map(); // Prevent duplicate concurrent requests

/**
 * Clear expired cache entries
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      searchCache.delete(key);
    }
  }
};

/**
 * Get cached search result if available and not expired
 */
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

/**
 * Cache search result
 */
const cacheResult = (query, data) => {
  const cacheKey = query.toLowerCase().trim();
  searchCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
};

export const searchGamesFromIGDB = async (query) => {
  try {
    // Check cache first
    const cached = getCachedResult(query);
    if (cached) {
      return cached;
    }

    const cacheKey = query.toLowerCase().trim();

    // Check if request is already in progress
    if (pendingRequests.has(cacheKey)) {
      logger.info(`[IGDB] Waiting for pending request for "${query}"`);
      return await pendingRequests.get(cacheKey);
    }

    // Create new request
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

        // Cache the result
        cacheResult(query, data);

        return data;
      } finally {
        // Remove from pending requests
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);

    return await requestPromise;
  } catch (error) {
    logger.error("Erreur lors de la recherche de jeux :", error.message);
    return null;
  }
};

/**
 * Clear the IGDB search cache (useful for testing or manual refresh)
 */
export const clearIGDBCache = () => {
  searchCache.clear();
  logger.info("[IGDB] Cache cleared");
};
