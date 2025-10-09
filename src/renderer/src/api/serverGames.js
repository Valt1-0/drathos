export const getAllServerGames = async () => {
  try {
    const serverAddress = await window.store.get("serverAddress");
    const response = await fetch(
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
    const url = `http://${serverAddress}/api/serverGame/addGame`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("zipFile", zipFile);
      formData.append("version", version);
      formData.append("isPublic", isPublic);
      formData.append("igdbId", igdbId);

      xhr.open("POST", url, true);

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
