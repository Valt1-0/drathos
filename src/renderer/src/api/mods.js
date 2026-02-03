import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

// Cache system with 5min TTL and request deduplication
const cache = new Map();
const pendingRequests = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCachedResult = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const cacheResult = (key, data) => cache.set(key, { data, ts: Date.now() });

/**
 * Invalidate cache for specific patterns
 */
export const invalidateModsCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  // Use Array.from to avoid modifying Map while iterating
  for (const key of Array.from(cache.keys())) {
    if (key.includes(pattern)) cache.delete(key);
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
 * Cached fetch with deduplication
 */
const cachedFetch = async (cacheKey, fetchFn) => {
  const cached = getCachedResult(cacheKey);
  if (cached) return cached;

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const result = await fetchFn();
      cacheResult(cacheKey, result);
      return result;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, promise);
  return promise;
};

/**
 * Normalize ID to always return a string
 * Handles both populated objects {_id: "..."} and plain strings
 */
const normalizeId = (id) => {
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id._id) return id._id;
  return String(id);
};

export const normalizeGameId = normalizeId;
export const normalizeModId = normalizeId;

export const getModsForGame = async (gameId, { page = 1, limit = 20, search = '' } = {}) => {
  try {
    const cacheKey = `mods_game_${gameId}_p${page}_l${limit}_s${search}`;
    return await cachedFetch(cacheKey, async () => {
      const params = {};
      if (page > 1 || limit !== 20) Object.assign(params, { page, limit });
      if (search) params.search = search;

      const response = await fetchWithConnectionTracking(await buildUrl(`/api/mods/game/${gameId}`, params), { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = await response.json();
      const mods = Array.isArray(data) ? data : (data.mods || []);
      return {
        mods,
        totalPages: data.totalPages || 1,
        currentPage: data.currentPage || 1,
        totalMods: data.totalMods || mods.length
      };
    });
  } catch {
    return { mods: [], totalPages: 1, currentPage: 1, totalMods: 0 };
  }
};

export const getInstalledMods = async ({ page = 1, limit = 100 } = {}) => {
  try {
    return await cachedFetch(`mods_installed_p${page}_l${limit}`, async () => {
      const params = {};
      if (page > 1 || limit !== 100) Object.assign(params, { page, limit });

      const response = await fetchWithConnectionTracking(await buildUrl('/api/mods/installed', params), { headers: await getAuthHeaders() });
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = await response.json();
      const installedMods = Array.isArray(data) ? data : (data.installedMods || []);
      return { installedMods, totalPages: data.totalPages || 1, currentPage: data.currentPage || 1, totalMods: data.totalMods || installedMods.length };
    });
  } catch {
    return { installedMods: [], totalPages: 1, currentPage: 1, totalMods: 0 };
  }
};

export const installMod = async (modId, gameId, onProgress = null) => {
  const installedGames = await window.store.get("installedGamesCache") || {};
  if (!installedGames[gameId]) throw new Error('Game not installed. Install the game first.');

  // Track if listener was added for proper cleanup
  let listenerAdded = false;
  if (onProgress && window.api.mods.onDownloadProgress) {
    window.api.mods.onDownloadProgress((data) => data.modId === modId && onProgress(data));
    listenerAdded = true;
  }

  const cleanup = () => {
    if (listenerAdded && window.api.mods.removeDownloadProgressListener) {
      window.api.mods.removeDownloadProgressListener();
    }
  };

  try {
    const downloadResult = await window.api.mods.downloadMod({ modId, gameId });
    if (!downloadResult.success) throw new Error(downloadResult.error || 'Download failed');

    const response = await fetchWithConnectionTracking(await buildUrl('/api/mods/install'), {
      method: 'POST',
      headers: { ...await getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ modId, gameId })
    });

    if (!response.ok) throw new Error((await response.json()).message || 'Failed to mark as installed');
    invalidateModsCache('mods_installed');
    return response.json();
  } finally {
    cleanup();
  }
};

export const uninstallMod = async (modId) => {
  const response = await fetchWithConnectionTracking(await buildUrl(`/api/mods/uninstall/${modId}`), { method: 'DELETE', headers: await getAuthHeaders() });
  if (!response.ok) throw new Error((await response.json()).message || 'Uninstall failed');
  await window.api.mods.deleteModFile({ modId });
  invalidateModsCache('mods_installed');
  return response.json();
};

export const uploadMod = async (modData, file, onProgress, signal) => {
  const [serverAddress, token] = await Promise.all([window.store.get("serverAddress"), window.store.get("userToken")]);

  const formData = new FormData();
  formData.append('modFile', file);
  Object.entries({
    gameId: modData.gameId, name: modData.name, description: modData.description || '',
    author: modData.author || '', version: modData.version || '1.0.0', modType: modData.modType || 'other',
    compatibleGameVersions: JSON.stringify(modData.compatibleGameVersions || []),
    platform: JSON.stringify(modData.platform || ['win32', 'linux', 'darwin']), installPath: modData.installPath || 'Mods'
  }).forEach(([k, v]) => formData.append(k, v));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Support AbortController for cleanup on component unmount
    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.((e.loaded / e.total) * 100);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (modData.gameId) invalidateModsCache(`mods_game_${modData.gameId}`);
        resolve(JSON.parse(xhr.responseText));
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).message || 'Upload failed')); }
        catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
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
    const response = await fetchWithConnectionTracking(await buildUrl('/api/serverGame/getAllGames'), { headers: await getAuthHeaders() });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
  } catch {
    return [];
  }
};

export const deleteMod = async (modId) => {
  const response = await fetchWithConnectionTracking(await buildUrl(`/api/mods/delete/${modId}`), { method: 'DELETE', headers: await getAuthHeaders() });
  if (!response.ok) throw new Error((await response.json()).message || 'Delete failed');
  invalidateModsCache('mods_game_');
  return response.json();
};
