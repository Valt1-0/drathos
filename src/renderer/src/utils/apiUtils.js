// drathos/src/renderer/src/utils/apiUtils.js

import { updateConnectionStatus } from "../contexts/connectionContext";

/**
 * Wrapper autour de fetch qui met à jour automatiquement le statut de connexion
 */
export async function fetchWithConnectionTracking(url, options = {}) {
  try {
    const response = await fetch(url, options);

    // Si la requête aboutit, le serveur est online
    updateConnectionStatus(true);

    return response;
  } catch (error) {
    // Si la requête échoue (réseau, timeout, etc.), le serveur est offline
    updateConnectionStatus(false);
    throw error;
  }
}
