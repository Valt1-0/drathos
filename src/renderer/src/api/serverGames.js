import { fetchWithConnectionTracking } from "../utils/apiUtils";

export const getAllServerGames = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const response = await fetchWithConnectionTracking(
      `http://${serverAddress}/api/serverGame/getAllGames`,
    );
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération des jeux : ${response.status}`,
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
) => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const token = await window.store.get("userToken");
    const url = `http://${serverAddress}/api/serverGame/addGame`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("zipFile", zipFile);
      formData.append("version", version);
      formData.append("isPublic", isPublic);
      formData.append("igdbId", igdbId);

      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      // Suivi de la progression si onProgress est fourni
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve(responseData);
          } catch (err) {
            reject(new Error("Réponse invalide du serveur"));
          }
        } else {
          reject(new Error(`Erreur HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Erreur réseau lors de l'upload"));
      };

      xhr.send(formData);
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du jeu :", error.message);
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
      `http://${serverAddress}/api/serverGame/deleteGame/${gameId}`,
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
      throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[API] Error deleting game:", error.message);
    throw error;
  }
};
