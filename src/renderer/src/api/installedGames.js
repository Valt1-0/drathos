// drathos/src/renderer/src/api/installedGames.js

import { fetchWithConnectionTracking } from "../utils/apiUtils";

export async function getInstalledGames() {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  if (!token) {
    console.error("No token found in store!");
    // Essayer de charger depuis le cache local même sans token
    const cachedGames = await window.store.get("installedGamesCache");
    return cachedGames || [];
  }

  try {
    const response = await fetchWithConnectionTracking(
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

    const games = await response.json();

    // Mettre à jour le cache local pour le mode hors ligne
    await window.store.set("installedGamesCache", games);
    console.debug(`[API] ${games.length} installed game(s) fetched and cached`);

    return games;
  } catch (error) {
    // Mode hors ligne : utiliser le cache sans afficher d'erreur
    console.debug("[API] Server unavailable, loading from cache");

    // Fallback vers le cache local en cas d'erreur réseau
    const cachedGames = await window.store.get("installedGamesCache");

    if (cachedGames && cachedGames.length > 0) {
      console.debug(`[API] ${cachedGames.length} game(s) loaded from cache`);
      return cachedGames;
    }

    console.debug("[API] No games in cache");
    return [];
  }
}

export async function launchGame(gameId) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  try {
    const response = await fetchWithConnectionTracking(
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
    const response = await fetchWithConnectionTracking(
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

/**
 * Met à jour le cache local des jeux installés
 * Utilisé après installation/désinstallation pour maintenir la cohérence hors ligne
 */
export async function updateInstalledGamesCache(games) {
  try {
    await window.store.set("installedGamesCache", games);
    console.log(`[Cache] Mise à jour du cache: ${games.length} jeu(x)`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du cache:", error);
    return false;
  }
}