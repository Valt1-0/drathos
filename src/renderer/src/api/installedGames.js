import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

export async function getInstalledGames() {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  // Load the local cache (object)
  const cachedGamesObject = await window.store.get("installedGamesCache", {});

  if (!token) {
    console.debug("[API] No token - loading from local cache");
    const gamesArray = Object.entries(cachedGamesObject).map(([gameId, data]) => ({
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
    return gamesArray;
  }

  try {
    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, '/api/installedGames/getInstalledGames'),
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch installed games");
    }

    const serverGames = await response.json();

    // Merge with the local cache to keep executable and local stats
    const mergedGames = serverGames.map((serverGame) => {
      const gameId = serverGame.serverGameId?._id || serverGame.serverGameId;
      const localData = cachedGamesObject[gameId];

      if (localData) {
        // Use local stats which are more up to date
        return {
          ...serverGame,
          stats: localData.stats || serverGame.stats,
        };
      }

      return serverGame;
    });

    console.debug(`[API] ${mergedGames.length} installed game(s) fetched and merged`);
    return mergedGames;
  } catch (error) {
    console.debug("[API] Server unavailable, loading from cache");

    const gamesArray = Object.entries(cachedGamesObject).map(([gameId, data]) => ({
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

    if (gamesArray.length > 0) {
      console.debug(`[API] ${gamesArray.length} game(s) loaded from cache`);
    } else {
      console.debug("[API] No games in cache");
    }

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
    console.error("Error launching game:", error);
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
    console.error("Error stopping game:", error);
    throw error;
  }
}