// drathos/src/renderer/src/api/gameStats.js

// Variable pour stocker le callback de mise à jour de connexion
let connectionCallback = null;

/**
 * Enregistre un callback pour notifier les changements de connexion
 * @param {Function} callback - Fonction à appeler avec (isOnline: boolean)
 */
export function setConnectionCallback(callback) {
  connectionCallback = callback;
}

/**
 * Vérifie si le serveur est accessible (health check)
 * @returns {Promise<boolean>} true si le serveur est online, false sinon
 */
export async function isServerOnline() {
  try {
    const serverAddress = await window.store.get("serverAddress");
    if (!serverAddress) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`http://${serverAddress}/api/server/health`, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.debug("[API] Server offline or unreachable:", error.message);
    return false;
  }
}

/**
 * Récupère les statistiques d'un jeu depuis le serveur
 * @param {string} gameId - ID du jeu
 * @returns {Promise<Object>} Statistiques du jeu
 */
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

    // ✅ Requête réussie = serveur online
    if (connectionCallback) connectionCallback(true);

    return await response.json();
  } catch (error) {
    // ❌ Requête échouée = serveur offline
    if (connectionCallback) connectionCallback(false);

    // Mode hors ligne : throw silencieusement pour utiliser le fallback local
    console.debug(`[API] Stats for ${gameId} unavailable (offline mode)`);
    throw error;
  }
}

/**
 * Synchronise les statistiques locales vers le serveur
 * @param {string} gameId - ID du jeu
 * @param {Object} localStats - Statistiques locales complètes
 * @param {number} sessionDuration - Durée de la dernière session en secondes
 * @returns {Promise<Object>} Résultat de la synchronisation
 */
export async function syncStatsToServer(gameId, localStats, sessionDuration) {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetch(
      `http://${serverAddress}/api/installedGames/sync-stats/${gameId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          totalPlayTime: localStats.totalPlayTime,
          totalSessions: localStats.totalSessions,
          lastPlayed: localStats.lastPlayed,
          firstLaunched: localStats.firstLaunched,
          sessionDuration: sessionDuration,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to sync stats");
    }

    // ✅ Requête réussie = serveur online
    if (connectionCallback) connectionCallback(true);

    const result = await response.json();
    console.debug("[API] Stats synced to server");
    return result;
  } catch (error) {
    // ❌ Requête échouée = serveur offline
    if (connectionCallback) connectionCallback(false);

    console.debug("[API] Sync failed, stats kept locally");
    throw error;
  }
}

/**
 * Récupère les statistiques locales d'un jeu
 * @param {string} gameId - ID du jeu
 * @returns {Promise<Object|null>} Statistiques locales ou null
 */
export async function getLocalStats(gameId) {
  try {
    return await window.api.getLocalStats({ gameId });
  } catch (error) {
    console.debug("[API] Failed to read local stats:", error.message);
    return null;
  }
}

/**
 * Sauvegarde les statistiques d'une session localement
 * @param {string} gameId - ID du jeu
 * @param {Object} sessionData - Données de la session { duration, startTime }
 * @returns {Promise<Object>} Résultat de la sauvegarde
 */
export async function saveLocalStats(gameId, sessionData) {
  try {
    return await window.api.saveLocalStats({ gameId, sessionData });
  } catch (error) {
    console.debug("[API] Failed to save local stats:", error.message);
    throw error;
  }
}

/**
 * Récupère et merge les statistiques locales et serveur
 * @param {string} gameId - ID du jeu
 * @returns {Promise<Object>} Statistiques mergées
 */
export async function getMergedStats(gameId) {
  // 1️⃣ Charger les stats locales (toujours disponibles)
  const localStats = await getLocalStats(gameId);

  try {
    // 2️⃣ Essayer de récupérer les stats serveur (mode online)
    const remoteStats = await getGameStats(gameId);

    // 3️⃣ MERGE : Prendre les données les plus récentes
    return mergeStats(localStats, remoteStats);
  } catch {
    // 4️⃣ Mode hors ligne : utiliser uniquement les stats locales
    return localStats;
  }
}

/**
 * Helper pour merger les stats local/remote
 * @private
 */
function mergeStats(local, remote) {
  if (!local) return remote;
  if (!remote) return local;

  // Convertir les timestamps si nécessaire
  const localLastPlayed = local.lastPlayed || 0;
  const remoteLastPlayed = remote.lastPlayed ? new Date(remote.lastPlayed).getTime() : 0;

  // Prendre les valeurs maximales (les plus à jour)
  return {
    totalPlayTime: Math.max(local.totalPlayTime || 0, parsePlayTimeToSeconds(remote.totalPlayTime) || 0),
    totalSessions: Math.max(local.totalSessions || 0, remote.totalSessions || 0),
    lastPlayed: Math.max(localLastPlayed, remoteLastPlayed),
    firstLaunched: Math.min(
      local.firstLaunched || Date.now(),
      remote.firstLaunched ? new Date(remote.firstLaunched).getTime() : Date.now()
    ),
  };
}

/**
 * Helper pour parser le temps de jeu formaté du serveur (ex: "2h 30m" -> 9000 secondes)
 * @private
 */
function parsePlayTimeToSeconds(formatted) {
  if (!formatted || formatted === "< 1 minute") return 0;

  const match = formatted.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
  }

  const minMatch = formatted.match(/(\d+)\s*minutes?/);
  if (minMatch) {
    return parseInt(minMatch[1]) * 60;
  }

  return 0;
}

/**
 * Formate les statistiques brutes en format d'affichage
 * @param {Object} stats - Statistiques brutes (en secondes, timestamps)
 * @returns {Object} Statistiques formatées pour l'affichage
 */
export function formatStats(stats) {
  if (!stats) return null;

  return {
    totalPlayTime: formatPlayTime(stats.totalPlayTime),
    totalSessions: stats.totalSessions,
    lastPlayedFormatted: stats.lastPlayed
      ? formatRelativeTime(stats.lastPlayed)
      : "Never",
    firstLaunchedFormatted: stats.firstLaunched
      ? new Date(stats.firstLaunched).toLocaleDateString()
      : "Never",
    averageSessionTime:
      stats.totalSessions > 0
        ? formatPlayTime(Math.floor(stats.totalPlayTime / stats.totalSessions))
        : "0h 0m",
  };
}

/**
 * Formate une durée en secondes en format lisible
 * @private
 */
function formatPlayTime(seconds) {
  if (!seconds || seconds < 60) return "< 1 minute";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Formate un timestamp en temps relatif
 * @private
 */
function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
