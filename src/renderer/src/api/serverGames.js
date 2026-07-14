import { fetchWithTimeout } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";
import uploadManager from "../services/uploadManager";
import { gamesCache } from "../utils/gamesCache";
import logger from "../services/logger";

let _serverGamesPending = null;

const GAMES_PAGE_SIZE = 100;

export const getAllServerGames = async () => {
  if (_serverGamesPending) return _serverGamesPending;
  _serverGamesPending = (async () => {
    try {
      const serverAddress = await window.store.get("serverAddress");
      const token = await window.store.get("userToken");
      const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Paginate past the server's 100-item cap. A server that predates
      // pagination ignores the params and doesn't echo `page` back — return
      // its single response as-is instead of looping on duplicates.
      let all = [];
      for (let page = 1; ; page++) {
        const response = await fetchWithTimeout(
          buildServerUrl(serverAddress, `/api/serverGame/getAllGames?page=${page}&limit=${GAMES_PAGE_SIZE}`),
          { headers }
        );
        if (!response.ok) {
          throw new Error(`Error fetching games: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) return data;

        const games = data.games ?? [];
        if (data.page === undefined) return games;

        all = all.concat(games);
        if (games.length < GAMES_PAGE_SIZE || page >= (data.totalPages ?? page)) {
          return all;
        }
      }
    } catch (error) {
      logger.debug("[API] Server games unavailable (offline mode)");
      return null;
    }
  })().finally(() => { _serverGamesPending = null; });
  return _serverGamesPending;
};

// Invalidate the central games cache
export const invalidateGamesCache = () => {
  gamesCache.invalidate();
};

export const addGameToServer = async (
  zipFile,
  version,
  isPublic,
  igdbId,
  onProgress = null,
  executableName = null,
  multiplayer = null, // New format: { enabled, type, maxPlayers, modes }
  options = {}
) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");
    const url = buildServerUrl(serverAddress, '/api/serverGame/addGame');

    // Verify file size before upload
    const sizeCheck = uploadManager.verifyFileSize(zipFile);
    if (!sizeCheck.valid) {
      throw new Error(sizeCheck.error);
    }

    // Queue the upload with uploadManager
    const result = await uploadManager.queueUpload({
      file: zipFile,
      version,
      isPublic,
      multiplayer,
      igdbId,
      executableName,
      url,
      token,
      onProgress,
      resumable: options.resumable !== false,
      onQueued: (upload) => {
        onProgress?.({
          percent: 0,
          loaded: 0,
          total: zipFile.size,
          speed: 0,
          eta: 0,
          status: 'queued',
          uploadId: upload.id,
          queueInfo: uploadManager.getQueueInfo()
        });
      }
    });

    // Invalidate cache after successful upload
    invalidateGamesCache();

    return result;
  } catch (error) {
    logger.error(`Error adding game: ${error.message}`);
    throw error;
  }
};

/**
 * Get upload queue information
 * @returns {Object} Queue info
 */
export const getUploadQueueInfo = () => {
  return uploadManager.getQueueInfo();
};

/**
 * Cancel an upload
 * @param {string} uploadId - Upload ID
 */
export const cancelUpload = (uploadId) => {
  uploadManager.cancelUpload(uploadId);
};

/**
 * Pause an upload (for resumable uploads)
 * @param {string} uploadId - Upload ID
 */
export const pauseUpload = (uploadId) => {
  uploadManager.pauseUpload(uploadId);
};

/**
 * Configure upload manager settings
 * @param {Object} settings - Settings object
 */
export const configureUploadManager = (settings) => {
  if (settings.maxFileSize) {
    uploadManager.setMaxFileSize(settings.maxFileSize);
  }
  if (settings.maxSimultaneousUploads) {
    uploadManager.setMaxSimultaneousUploads(settings.maxSimultaneousUploads);
  }
};

/**
 * Deletes a game from the server (Admin only)
 * @param {string} gameId - ID of the game to delete
 * @returns {Promise<Object>} Deletion result
 */
export const deleteServerGame = async (gameId) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithTimeout(
      buildServerUrl(serverAddress, `/api/serverGame/deleteGame/${gameId}`),
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP Error ${response.status}`);
    }

    // Invalidate cache after deletion
    invalidateGamesCache();

    return await response.json();
  } catch (error) {
    logger.error(`[API] Error deleting game: ${error.message}`);
    throw error;
  }
};
