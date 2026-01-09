import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

// Cache system for API responses
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map();

/**
 * Clean expired cache entries
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
};

/**
 * Get cached result if available and not expired
 */
const getCachedResult = (cacheKey) => {
  cleanExpiredCache();
  const cached = cache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Mods API] Cache hit for "${cacheKey}"`);
    return cached.data;
  }

  return null;
};

/**
 * Cache result
 */
const cacheResult = (cacheKey, data) => {
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
};

/**
 * Invalidate cache for specific patterns
 */
export const invalidateModsCache = (pattern) => {
  if (!pattern) {
    // Clear all mods cache
    cache.clear();
    console.log("[Mods API] All cache cleared");
    return;
  }

  // Clear specific cache entries matching pattern
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      console.log(`[Mods API] Cache invalidated for "${key}"`);
    }
  }
};

const getAuthHeaders = async () => ({
  Authorization: `Bearer ${await window.store.get("userToken")}`
});

const buildUrl = async (path, params = {}) => {
  const serverAddress = await window.store.get("serverAddress");
  const queryString = new URLSearchParams(params).toString();
  return buildServerUrl(serverAddress, `${path}${queryString ? `?${queryString}` : ''}`);
};

/**
 * Normalize gameId to always return a string ID
 * Handles both populated objects {_id: "..."} and plain strings
 */
export const normalizeGameId = (gameId) => {
  if (!gameId) return null;
  if (typeof gameId === 'string') return gameId;
  if (typeof gameId === 'object' && gameId._id) return gameId._id;
  return String(gameId);
};

/**
 * Normalize modId to always return a string ID
 * Handles both populated objects {_id: "..."} and plain strings
 */
export const normalizeModId = (modId) => {
  if (!modId) return null;
  if (typeof modId === 'string') return modId;
  if (typeof modId === 'object' && modId._id) return modId._id;
  return String(modId);
};

export const getModsForGame = async (gameId, { page = 1, limit = 20, search = '' } = {}) => {
  try {
    // Create cache key
    const cacheKey = `mods_game_${gameId}_p${page}_l${limit}_s${search}`;

    // Check cache first
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    // Check if request is already in progress
    if (pendingRequests.has(cacheKey)) {
      console.log(`[Mods API] Waiting for pending request for "${cacheKey}"`);
      return await pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const params = {};
        if (page > 1 || limit !== 20) Object.assign(params, { page, limit });
        if (search) params.search = search;

        const url = await buildUrl(`/api/mods/game/${gameId}`, params);
        const response = await fetchWithConnectionTracking(url, {});

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        const mods = Array.isArray(data) ? data : (data.mods || []);

        const result = {
          mods,
          totalPages: data.totalPages || 1,
          currentPage: data.currentPage || 1,
          totalMods: data.totalMods || mods.length
        };

        // Cache the result
        cacheResult(cacheKey, result);

        return result;
      } finally {
        // Remove from pending requests
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);

    return await requestPromise;
  } catch (error) {
    console.debug("[API] Mods unavailable:", error.message);
    return { mods: [], totalPages: 1, currentPage: 1, totalMods: 0 };
  }
};

export const getInstalledMods = async ({ page = 1, limit = 100 } = {}) => {
  try {
    // Create cache key
    const cacheKey = `mods_installed_p${page}_l${limit}`;

    // Check cache first
    const cached = getCachedResult(cacheKey);
    if (cached) return cached;

    // Check if request is already in progress
    if (pendingRequests.has(cacheKey)) {
      console.log(`[Mods API] Waiting for pending request for "${cacheKey}"`);
      return await pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const params = {};
        if (page > 1 || limit !== 100) Object.assign(params, { page, limit });

        const url = await buildUrl('/api/mods/installed', params);
        const response = await fetchWithConnectionTracking(url, {
          headers: await getAuthHeaders()
        });

        if (!response.ok) throw new Error(`Error: ${response.status}`);

        const data = await response.json();
        const installedMods = Array.isArray(data) ? data : (data.installedMods || []);

        const result = {
          installedMods,
          totalPages: data.totalPages || 1,
          currentPage: data.currentPage || 1,
          totalMods: data.totalMods || installedMods.length
        };

        // Cache the result
        cacheResult(cacheKey, result);

        return result;
      } finally {
        // Remove from pending requests
        pendingRequests.delete(cacheKey);
      }
    })();

    // Store pending request
    pendingRequests.set(cacheKey, requestPromise);

    return await requestPromise;
  } catch (error) {
    console.error("[API] Error:", error);
    return { installedMods: [], totalPages: 1, currentPage: 1, totalMods: 0 };
  }
};

export const installMod = async (modId, gameId) => {
  const installedGames = await window.store.get("installedGamesCache") || {};
  if (!installedGames[gameId]) {
    throw new Error('Game not installed. Install the game first.');
  }

  const downloadResult = await window.api.mods.downloadMod({ modId, gameId });
  if (!downloadResult.success) {
    throw new Error(downloadResult.error || 'Download failed');
  }

  const response = await fetchWithConnectionTracking(
    await buildUrl('/api/mods/install'),
    {
      method: 'POST',
      headers: {
        ...await getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ modId, gameId })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mark as installed');
  }

  // Invalidate cache for installed mods
  invalidateModsCache('mods_installed');

  return response.json();
};

export const uninstallMod = async (modId) => {
  const response = await fetchWithConnectionTracking(
    await buildUrl(`/api/mods/uninstall/${modId}`),
    {
      method: 'DELETE',
      headers: await getAuthHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Uninstall failed');
  }

  await window.api.mods.deleteModFile({ modId });

  // Invalidate cache for installed mods
  invalidateModsCache('mods_installed');

  return response.json();
};

export const toggleMod = async (modId, enabled) => {
  const response = await fetchWithConnectionTracking(
    await buildUrl(`/api/mods/toggle/${modId}`),
    {
      method: 'PATCH',
      headers: {
        ...await getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Toggle failed');
  }

  // Invalidate cache for installed mods (state changed)
  invalidateModsCache('mods_installed');

  return response.json();
};

export const uploadMod = async (modData, file, onProgress) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  const formData = new FormData();
  formData.append('modFile', file);
  Object.entries({
    gameId: modData.gameId,
    name: modData.name,
    description: modData.description || '',
    author: modData.author || '',
    version: modData.version || '1.0.0',
    modType: modData.modType || 'other',
    compatibleGameVersions: JSON.stringify(modData.compatibleGameVersions || []),
    platform: JSON.stringify(modData.platform || ['win32', 'linux', 'darwin']),
    installPath: modData.installPath || 'Mods'
  }).forEach(([key, value]) => formData.append(key, value));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Invalidate cache for game mods (new mod added)
        const gameId = modData.gameId;
        if (gameId) {
          invalidateModsCache(`mods_game_${gameId}`);
        }
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          reject(new Error(JSON.parse(xhr.responseText).message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));

    xhr.open('POST', `${serverAddress}/api/mods/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

export const getAllGamesForAdmin = async () => {
  try {
    const response = await fetchWithConnectionTracking(
      await buildUrl('/api/serverGame/getAllGames'),
      { headers: await getAuthHeaders() }
    );

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error("[API] Error:", error);
    return [];
  }
};

export const verifyModIntegrity = async (modId, gameId) => {
  try {
    return await window.api.mods.verifyIntegrity({ modId, gameId });
  } catch (error) {
    console.error("[API] Error:", error);
    return { success: false, error: error.message };
  }
};

export const deleteMod = async (modId) => {
  const response = await fetchWithConnectionTracking(
    await buildUrl(`/api/mods/delete/${modId}`),
    {
      method: 'DELETE',
      headers: await getAuthHeaders()
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Delete failed');
  }

  // Invalidate all game mods cache (we don't know which game this mod belonged to)
  invalidateModsCache('mods_game_');

  return response.json();
};
