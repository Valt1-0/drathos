// src/main/installGame.js - Version Beast Mode avec DownloadEngine 🚀

import { DownloadEngine } from "./DownloadEngine.js";

// Instance globale du DownloadEngine pour réutilisation
let downloadEngine = null;

/**
 * Installation optimisée d'un jeu avec nouveau DownloadEngine
 */
export const installGame = async (serverGame, { store, sendProgress }) => {
  try {
    // Créer ou réutiliser l'engine de download
    if (!downloadEngine) {
      downloadEngine = new DownloadEngine(store, sendProgress);
    }

    console.log(`[InstallGame] Démarrage installation: ${serverGame.name}`);

    // Validation des paramètres
    if (!serverGame._id || !serverGame.zipFileName) {
      throw new Error("Données du jeu invalides");
    }

    // Lancer le téléchargement avec le nouveau engine
    const result = await downloadEngine.downloadGame(serverGame);

    if (result.success) {
      console.log(`[InstallGame] ✅ Installation réussie: ${serverGame.name}`);
      return { success: true };
    } else {
      console.error(
        `[InstallGame] ❌ Installation échouée: ${serverGame.name}`,
        result.error
      );
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("[InstallGame] Erreur critique:", error);

    // Envoyer l'erreur au frontend
    sendProgress({
      id: serverGame._id,
      stage: "failed",
      progress: 0,
      error: error.message,
    });

    return { success: false, error: error.message };
  }
};

/**
 * Pause un téléchargement (future feature)
 */
export const pauseDownload = async (gameId) => {
  if (downloadEngine) {
    return downloadEngine.pauseDownload(gameId);
  }
  return { success: false, error: "Engine non initialisé" };
};

/**
 * Reprend un téléchargement (future feature)
 */
export const resumeDownload = async (gameId) => {
  if (downloadEngine) {
    return downloadEngine.resumeDownload(gameId);
  }
  return { success: false, error: "Engine non initialisé" };
};

/**
 * Annule un téléchargement (future feature)
 */
export const cancelDownload = async (gameId) => {
  if (downloadEngine) {
    return downloadEngine.cancelDownload(gameId);
  }
  return { success: false, error: "Engine non initialisé" };
};

/**
 * Obtient les statistiques de téléchargement
 */
export const getDownloadStats = () => {
  if (downloadEngine) {
    return downloadEngine.getStats();
  }
  return null;
};
