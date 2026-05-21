// drathos/src/renderer/src/api/gameStats.js

import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";
import logger from "../services/logger";
import i18n from "../i18n/config";


const _statsPending = new Map();

export async function getGameStats(gameId) {
  if (_statsPending.has(gameId)) return _statsPending.get(gameId);
  const p = (async () => {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, `/api/installedGames/stats/${gameId}`),
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
  })().finally(() => _statsPending.delete(gameId));
  _statsPending.set(gameId, p);
  return p;
}

/**
 * Synchronizes local statistics to the server
 * @param {string} gameId - Game ID
 * @param {Object} localStats - Complete local statistics
 * @param {number} sessionDuration - Duration of the last session in seconds
 * @returns {Promise<Object>} Synchronization result
 */
export async function syncStatsToServer(gameId, localStats, sessionDuration) {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  const response = await fetchWithTimeout(
    buildServerUrl(serverAddress, `/api/installedGames/sync-stats/${gameId}`),
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

  return await response.json();
}

/**
 * Retrieves local statistics for a game
 * @param {string} gameId - Game ID
 * @returns {Promise<Object|null>} Local statistics or null
 */
export async function getLocalStats(gameId) {
  try {
    return await window.api.getLocalStats({ gameId });
  } catch (error) {
    logger.debug("[API] Failed to read local stats:", error.message);
    return null;
  }
}

/**
 * Saves session statistics locally
 * @param {string} gameId - Game ID
 * @param {Object} sessionData - Session data { duration, startTime }
 * @returns {Promise<Object>} Save result
 */
export async function saveLocalStats(gameId, sessionData) {
  try {
    return await window.api.saveLocalStats({ gameId, sessionData });
  } catch (error) {
    logger.debug("[API] Failed to save local stats:", error.message);
    throw error;
  }
}

/**
 * Retrieves and merges local and server statistics
 * @param {string} gameId - Game ID
 * @returns {Promise<Object>} Merged statistics
 */
export async function getMergedStats(gameId) {
  // 1️⃣ Load local stats (always available)
  const localStats = await getLocalStats(gameId);

  try {
    // 2️⃣ Try to fetch server stats (online mode)
    const remoteStats = await getGameStats(gameId);

    // 3️⃣ MERGE: Take the most recent data
    return mergeStats(localStats, remoteStats);
  } catch {
    // 4️⃣ Offline mode: use only local stats
    return localStats;
  }
}

/**
 * Helper to merge local/remote stats
 * @private
 */
function mergeStats(local, remote) {
  if (!local) return remote;
  if (!remote) return local;

  // Convert timestamps if necessary
  const localLastPlayed = local.lastPlayed || 0;
  const remoteLastPlayed = remote.lastPlayed ? new Date(remote.lastPlayed).getTime() : 0;

  // Take the maximum values (the most up to date)
  return {
    totalPlayTime: Math.max(local.totalPlayTime || 0, parsePlayTimeToSeconds(remote.totalPlayTime) || 0),
    totalSessions: Math.max(local.totalSessions || 0, remote.totalSessions || 0),
    lastPlayed: Math.max(localLastPlayed, remoteLastPlayed),
    firstLaunched: (() => {
      const candidates = [
        local.firstLaunched || null,
        remote.firstLaunched ? new Date(remote.firstLaunched).getTime() : null,
      ].filter(Boolean);
      return candidates.length > 0 ? Math.min(...candidates) : Date.now();
    })(),
  };
}

/**
 * Helper to parse the formatted play time from the server (e.g., "2h 30m" -> 9000 seconds)
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
 * Formats raw statistics into a display format
 * @param {Object} stats - Raw statistics (in seconds, timestamps)
 * @returns {Object} Formatted statistics for display
 */
export function formatStats(stats) {
  if (!stats) return null;

  const avgSeconds = stats.totalSessions > 0 ? Math.floor(stats.totalPlayTime / stats.totalSessions) : 0;
  return {
    totalPlayTime: formatPlayTime(stats.totalPlayTime),
    totalPlayTimeSeconds: stats.totalPlayTime || 0,
    totalSessions: stats.totalSessions,
    averageSessionTime: avgSeconds > 0 ? formatPlayTime(avgSeconds) : "0h 0m",
    averageSessionSeconds: avgSeconds,
    lastPlayedFormatted: stats.lastPlayed
      ? formatRelativeTime(stats.lastPlayed)
      : i18n.t("games.never"),
    firstLaunchedFormatted: stats.firstLaunched
      ? new Date(stats.firstLaunched).toLocaleDateString()
      : i18n.t("games.never"),
  };
}

/**
 * Formats a duration in seconds into a human-readable format
 * @private
 */
function formatPlayTime(seconds) {
  // Strict validation: check that seconds is a valid number
  if (!seconds || isNaN(seconds) || seconds < 60) return "< 1 minute";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  // Double-check to avoid NaN in the display
  if (isNaN(hours) || isNaN(minutes)) return "< 1 minute";

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/**
 * Formats a timestamp as relative time
 * @private
 */
function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return i18n.t("users.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return i18n.t("users.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return i18n.t("users.hoursAgo", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return i18n.t("users.daysAgo", { count: days });
  return new Date(timestamp).toLocaleDateString();
}
