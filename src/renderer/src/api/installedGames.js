// drathos/src/renderer/src/api/installedGames.js

export async function getInstalledGames() {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  if (!token) {
    console.error("No token found in store!");
    return [];
  }

  try {
    const response = await fetch(
      `http://${serverAddress}/api/installedGames/getInstalledGames`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch installed games");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching installed games:", error);
    return [];
  }
}

export async function launchGame(gameId) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  try {
    const response = await fetch(
      `http://${serverAddress}/api/installedGames/launch/${gameId}`,
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

  try {
    const response = await fetch(
      `http://${serverAddress}/api/installedGames/stop/${gameId}`,
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

export async function getGameStats(gameId) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  try {
    const response = await fetch(
      `http://${serverAddress}/api/installedGames/stats/${gameId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch game stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching game stats:", error);
    return null;
  }
}

export async function getAllGamesStats(gameIds) {
  try {
    const statsPromises = gameIds.map((gameId) =>
      getGameStats(gameId).catch((err) => {
        console.warn(`Failed to load stats for ${gameId}:`, err);
        return null;
      })
    );

    const results = await Promise.all(statsPromises);

    // Créer un objet { gameId: stats }
    const statsMap = {};
    gameIds.forEach((gameId, index) => {
      if (results[index]) {
        statsMap[gameId] = results[index];
      }
    });

    return statsMap;
  } catch (error) {
    console.error("Error fetching all games stats:", error);
    return {};
  }
}