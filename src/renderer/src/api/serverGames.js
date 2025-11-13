import { fetchWithConnectionTracking } from "../utils/apiUtils";
import { buildServerUrl } from "../utils/urlHelper";

export const getAllServerGames = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const response = await fetchWithConnectionTracking(
      buildServerUrl(serverAddress, '/api/serverGame/getAllGames'),
    );
    if (!response.ok) {
      throw new Error(
        `Error fetching games: ${response.status}`,
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.debug("[API] Server games unavailable (offline mode)");
    return null;
  }
};

export const addGameToServer = async (
  zipFile,
  version,
  isPublic,
  igdbId,
  onProgress = null,
  executableName = null,
) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");
    const url = buildServerUrl(serverAddress, '/api/serverGame/addGame');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("zipFile", zipFile);
      formData.append("version", version);
      formData.append("isPublic", isPublic);
      formData.append("igdbId", igdbId);
      if (executableName) {
        formData.append("executableName", executableName);
      }

      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      // Variables pour calculer la vitesse et l'ETA
      let lastLoaded = 0;
      let lastTime = Date.now();

      // Suivi de la progression si onProgress est fourni
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            const currentTime = Date.now();
            const timeElapsed = (currentTime - lastTime) / 1000; // en secondes

            // Calculer la vitesse (bytes par seconde)
            const bytesUploaded = event.loaded - lastLoaded;
            const speed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;

            // Calculer le temps restant
            const bytesRemaining = event.total - event.loaded;
            const eta = speed > 0 ? bytesRemaining / speed : 0;

            // Mettre à jour pour la prochaine mesure
            lastLoaded = event.loaded;
            lastTime = currentTime;

            onProgress({
              percent,
              loaded: event.loaded,
              total: event.total,
              speed, // bytes/s
              eta, // secondes
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve(responseData);
          } catch (err) {
            reject(new Error("Invalid server response"));
          }
        } else {
          reject(new Error(`HTTP Error ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error adding game:", error.message);
    return null;
  }
};

/**
 * Supprime un jeu du serveur (Admin uniquement)
 * @param {string} gameId - ID du jeu à supprimer
 * @returns {Promise<Object>} Résultat de la suppression
 */
export const deleteServerGame = async (gameId) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");

    const response = await fetchWithConnectionTracking(
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

    return await response.json();
  } catch (error) {
    console.error("[API] Error deleting game:", error.message);
    throw error;
  }
};
