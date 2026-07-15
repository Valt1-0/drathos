import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";
import logger from "../services/logger";

/** Maps the installedGamesCache store object to the installed-game array shape. */
function mapCacheToArray(cachedGamesObject) {
  return Object.entries(cachedGamesObject).map(([gameId, data]) => ({
    _id: `installed_${gameId}`,
    serverGameId: {
      _id: gameId,
      name: data.name,
      summary: data.summary,
      storyline: data.storyline,
      coverUrl: data.coverUrl,
      genres: data.genres,
      platforms: data.platforms,
      rating: data.rating,
      aggregatedRating: data.aggregatedRating,
      releaseDate: data.releaseDate,
      developer: data.developer,
      publisher: data.publisher,
    },
    path: data.path,
    version: data.version,
    stats: data.stats,
    installedAt: data.installedAt,
  }));
}

export async function getInstalledGames() {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  const cachedGamesObject = await window.store.get("installedGamesCache", {});

  if (!token) {
    logger.debug("[API] No token - loading from local cache");
    return mapCacheToArray(cachedGamesObject);
  }

  try {
    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, '/api/installedGames/getInstalledGames'),
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!response.ok) throw new Error("Failed to fetch installed games");

    const serverGames = await response.json();

    // Merge with the local cache to keep local stats (more up-to-date)
    const mergedGames = serverGames.map((serverGame) => {
      const gameId = serverGame.serverGameId?._id || serverGame.serverGameId;
      const localData = cachedGamesObject[gameId];
      return localData ? { ...serverGame, stats: localData.stats || serverGame.stats } : serverGame;
    });

    logger.debug(`[API] ${mergedGames.length} installed game(s) fetched and merged`);
    return mergedGames;
  } catch (error) {
    logger.debug("[API] Server unavailable, loading from cache");
    const gamesArray = mapCacheToArray(cachedGamesObject);
    logger.debug(gamesArray.length > 0
      ? `[API] ${gamesArray.length} game(s) loaded from cache`
      : "[API] No games in cache"
    );
    return gamesArray;
  }
}

export async function launchGame(gameId) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  try {
    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, `/api/installedGames/launch/${gameId}`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to launch game");
    }

    return await response.json();
  } catch (error) {
    logger.error("Error launching game:", error);
    throw error;
  }
}

export async function stopGame(gameId) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  try{
    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, `/api/installedGames/stop/${gameId}`),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to stop game");
    }

    return await response.json();
  } catch (error) {
    logger.error("Error stopping game:", error);
    throw error;
  }
}