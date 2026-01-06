import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

// ==================== RÉCUPÉRER LES MODS ====================

export const getModsForGame = async (gameId) => {
  try {
    const serverAddress = await window.store.get("serverAddress");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, `/api/mods/game/${gameId}`),
      {}
    );

    if (!response.ok) {
      throw new Error(`Error fetching mods: ${response.status}`);
    }

    const data = await response.json();
    return data.mods || [];
  } catch (error) {
    console.debug("[API] Mods unavailable (offline mode)");
    return [];
  }
};

export const getInstalledMods = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, '/api/mods/installed'),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching installed mods: ${response.status}`);
    }

    const data = await response.json();
    return data.installedMods || [];
  } catch (error) {
    console.error("[API] Error fetching installed mods:", error);
    return [];
  }
};

// ==================== INSTALLATION / DÉSINSTALLATION ====================

export const installMod = async (modId, gameId) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  // Pre-check: Verify game is installed
  const installedGames = await window.store.get("installedGamesCache") || {};
  if (!installedGames[gameId]) {
    throw new Error('Game not installed. Please install the game first before installing mods.');
  }

  // 1. Télécharger le mod via IPC
  console.log('[API] Downloading mod:', modId);
  const downloadResult = await window.api.mods.downloadMod({ modId, gameId });

  if (!downloadResult.success) {
    throw new Error(downloadResult.error || 'Failed to download mod');
  }

  // 2. Marquer comme installé sur le serveur
  const response = await fetchWithConnectionTracking(
    buildServerUrl(serverAddress, '/api/mods/install'),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ modId, gameId })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mark mod as installed');
  }

  return response.json();
};

export const uninstallMod = async (modId) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  // 1. Supprimer du serveur
  const response = await fetchWithConnectionTracking(
    buildServerUrl(serverAddress, `/api/mods/uninstall/${modId}`),
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to uninstall mod');
  }

  // 2. Supprimer le fichier local via IPC
  await window.api.mods.deleteModFile({ modId });

  return response.json();
};

// ==================== ACTIVATION / DÉSACTIVATION ====================

export const toggleMod = async (modId, enabled) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  const response = await fetchWithConnectionTracking(
    buildServerUrl(serverAddress, `/api/mods/toggle/${modId}`),
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to toggle mod');
  }

  return response.json();
};

// ==================== ADMIN - UPLOAD ====================

export const uploadMod = async (modData, file, onProgress) => {
  const serverAddress = await window.store.get("serverAddress");
  const token = await window.store.get("userToken");

  const formData = new FormData();
  formData.append('modFile', file);
  formData.append('gameId', modData.gameId);
  formData.append('name', modData.name);
  formData.append('description', modData.description || '');
  formData.append('author', modData.author || '');
  formData.append('version', modData.version || '1.0.0');
  formData.append('modType', modData.modType || 'other');
  formData.append('compatibleGameVersions', JSON.stringify(modData.compatibleGameVersions || []));
  formData.append('platform', JSON.stringify(modData.platform || ['win32', 'linux', 'darwin']));
  formData.append('installPath', modData.installPath || 'Mods');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress((e.loaded / e.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${serverAddress}/api/mods/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
};

export const getAllGamesForAdmin = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, '/api/serverGame/getAllGames'),
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error fetching games: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("[API] Error fetching games:", error);
    return [];
  }
};

// ==================== HELPERS ====================

export const getModInfo = async (modId) => {
  try {
    const installedMods = await window.store.get('installedMods');

    for (const gameId in installedMods) {
      if (installedMods[gameId][modId]) {
        return installedMods[gameId][modId];
      }
    }

    return null;
  } catch (error) {
    console.error("[API] Error getting mod info:", error);
    return null;
  }
};
