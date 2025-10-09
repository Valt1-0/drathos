// drathos/src/renderer/src/api/gameManager.js

/**
 * API simplifiée pour la gestion des jeux
 */
class GameManager {
  constructor() {
    this.statusListeners = new Map(); // Map<gameId, callback[]>
    this.uninstallListeners = new Map(); // Map<gameId, callback[]> - NOUVEAU
    this.setupEventListeners();
  }

  /**
   * Configure les écouteurs d'événements globaux
   */
  setupEventListeners() {
    // Écouter les changements de statut des jeux
    window.api.onGameStatusChanged((status) => {
      console.log(`[GameManager] 📡 Event reçu: ${status.gameId} - ${status.status}`);

      // Appeler les listeners pour ce gameId spécifique
      const listeners = this.statusListeners.get(status.gameId) || [];
      console.log(`[GameManager] Listeners spécifiques pour ${status.gameId}: ${listeners.length}`);
      listeners.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          console.error("Erreur dans le callback de statut:", error);
        }
      });

      // Appeler aussi les listeners globaux (wildcard "*")
      const globalListeners = this.statusListeners.get("*") || [];
      console.log(`[GameManager] Listeners globaux (*): ${globalListeners.length}`);
      globalListeners.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          console.error("Erreur dans le callback de statut global:", error);
        }
      });
    });

    // NOUVEAU - Écouter les progressions de désinstallation
    window.api.onUninstallProgress((progress) => {
      // Appeler les listeners pour ce gameId spécifique
      const listeners = this.uninstallListeners.get(progress.id) || [];
      listeners.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          console.error("Erreur dans le callback de désinstallation:", error);
        }
      });

      // Appeler aussi les listeners globaux (wildcard "*")
      const globalListeners = this.uninstallListeners.get("*") || [];
      globalListeners.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          console.error("Erreur dans le callback de désinstallation global:", error);
        }
      });
    });
  }

  /**
   * Lance un jeu avec détection automatique de l'exécutable si nécessaire
   * @param {string} gameId - ID unique du jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string|null} executableName - Nom de l'exécutable (null pour détection auto)
   * @param {string} gameName - Nom du jeu pour aider la détection
   * @param {Function} onStatusChange - Callback optionnel pour les changements d'état
   */
  async launchGame(
    gameId,
    gamePath,
    executableName = null,
    gameName = "",
    onStatusChange = null
  ) {
    try {
      console.log(`[GameManager] Lancement de ${gameId}...`);

      // Détection automatique de l'exécutable si nécessaire
      let finalExecutableName = executableName;

      if (!finalExecutableName) {
        console.log(
          `[GameManager] Détection automatique de l'exécutable pour ${gameName}...`
        );

        const detection = await window.api.getBestExecutable({
          gamePath,
          gameName,
        });

        if (!detection.success || !detection.executable) {
          throw new Error("Impossible de détecter l'exécutable du jeu");
        }

        finalExecutableName = detection.executable;
        console.log(`[GameManager] Exécutable détecté: ${finalExecutableName}`);
      }

      // Ajouter le callback si fourni
      if (onStatusChange) {
        this.addStatusListener(gameId, onStatusChange);
      }

      // Appeler l'API native avec le format correct (pas de double wrapping)
      const result = await window.api.launchGame({
        gameId,
        gamePath,
        executableName: finalExecutableName,
        gameName,
      });

      console.log(`[GameManager] Résultat du lancement:`, result);
      return result;
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors du lancement de ${gameId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Détecte tous les exécutables disponibles pour un jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu
   */
  async detectExecutables(gamePath, gameName = "") {
    try {
      const result = await window.api.detectExecutables({ gamePath, gameName });
      return result.success ? result.executables : [];
    } catch (error) {
      console.error("[GameManager] Erreur lors de la détection:", error);
      return [];
    }
  }

  /**
   * Obtient le meilleur exécutable pour un jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu
   */
  async getBestExecutable(gamePath, gameName = "") {
    try {
      const result = await window.api.getBestExecutable({ gamePath, gameName });
      return result.success ? result.executable : null;
    } catch (error) {
      console.error(
        "[GameManager] Erreur lors de la détection du meilleur exécutable:",
        error
      );
      return null;
    }
  }

  /**
   * Liste le contenu d'un dossier de jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   */
  async listGameDirectory(gamePath) {
    try {
      const result = await window.api.listGameDirectory(gamePath);
      return result.success ? result.items : [];
    } catch (error) {
      console.error("[GameManager] Erreur lors du listage:", error);
      return [];
    }
  }

  /**
   * Vérifie si un jeu est en cours d'exécution
   * @param {string} gameId - ID du jeu
   */
  async isGameRunning(gameId) {
    try {
      return await window.api.isGameRunning(gameId);
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors de la vérification de ${gameId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Obtient la liste de tous les jeux actifs
   */
  async getActiveGames() {
    try {
      return await window.api.getActiveGames();
    } catch (error) {
      console.error(
        "[GameManager] Erreur lors de la récupération des jeux actifs:",
        error
      );
      return [];
    }
  }

  /**
   * Ouvre le dossier d'un jeu dans l'explorateur
   * @param {string} gamePath - Chemin vers le dossier du jeu
   */
  async openGameFolder(gamePath) {
    try {
      return await window.api.openGameFolder(gamePath);
    } catch (error) {
      console.error(
        "[GameManager] Erreur lors de l'ouverture du dossier:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtient les informations d'un processus de jeu
   * @param {string} gameId - ID du jeu
   */
  async getGameProcess(gameId) {
    try {
      return await window.api.getGameProcess(gameId);
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors de la récupération du processus ${gameId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Ajoute un listener pour les changements de statut d'un jeu
   * @param {string} gameId - ID du jeu
   * @param {Function} callback - Fonction à appeler lors des changements
   */
  addStatusListener(gameId, callback) {
    if (!this.statusListeners.has(gameId)) {
      this.statusListeners.set(gameId, []);
    }
    this.statusListeners.get(gameId).push(callback);
  }

  /**
   * Supprime un listener spécifique
   * @param {string} gameId - ID du jeu
   * @param {Function} callback - Fonction à supprimer
   */
  removeStatusListener(gameId, callback) {
    const listeners = this.statusListeners.get(gameId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Supprime tous les listeners pour un jeu
   * @param {string} gameId - ID du jeu
   */
  removeStatusListeners(gameId) {
    this.statusListeners.delete(gameId);
  }

  /**
   * Formate une durée en secondes en format lisible
   * @param {number} seconds - Durée en secondes
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Formate la taille des fichiers
   * @param {number} sizeInMB - Taille en MB
   */
  formatFileSize(sizeInMB) {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  }

  /**
   * 🛑 Arrête un jeu en cours
   */
  async stopGame(gameId, force = false) {
    try {
      console.log(`[GameManager] 🛑 Arrêt de ${gameId} (force: ${force})`);

      const result = await window.api.stopGame({ gameId, force });

      // Nettoyer les listeners si le jeu s'arrête avec succès
      if (result.success) {
        this.removeStatusListeners(gameId);
      }

      return result;
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors de l'arrêt de ${gameId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ⚡ Arrêt forcé d'un jeu
   */
  async forceStopGame(gameId) {
    try {
      console.log(`[GameManager] ⚡ Arrêt forcé de ${gameId}`);

      const result = await window.api.forceStopGame({ gameId });

      if (result.success) {
        this.removeStatusListeners(gameId);
      }

      return result;
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors de l'arrêt forcé de ${gameId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🗑️ Désinstalle un jeu complètement
   */
  async uninstallGame(gameId, gamePath, gameName, onProgress = null) {
    try {
      console.log(`[GameManager] 🗑️ Désinstallation de ${gameName}...`);

      // Ajouter le listener de progression si fourni
      if (onProgress) {
        this.addUninstallListener(gameId, onProgress);
      }

      const result = await window.api.uninstallGame({
        gameId,
        gamePath,
        gameName,
      });

      console.log(`[GameManager] Résultat désinstallation:`, result);

      // Nettoyer tous les listeners pour ce jeu
      this.removeStatusListeners(gameId);
      this.removeUninstallListeners(gameId);

      return result;
    } catch (error) {
      console.error(
        `[GameManager] Erreur lors de la désinstallation de ${gameName}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🔍 Vérifie si un jeu peut être désinstallé
   */
  async canUninstallGame(gameId, gamePath) {
    try {
      return await window.api.canUninstallGame({ gameId, gamePath });
    } catch (error) {
      console.error(
        `[GameManager] Erreur vérification désinstallation:`,
        error
      );
      return { canUninstall: false, reason: error.message };
    }
  }

  /**
   * 📊 Obtient la taille d'un jeu installé
   * @param {string} gamePath - Chemin du jeu
   */
  async getGameSize(gamePath) {
    try {
      return await window.api.getGameSize({ gamePath });
    } catch (error) {
      console.error(`[GameManager] Erreur calcul taille:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ajoute un listener pour la désinstallation
   * @param {string} gameId - ID du jeu
   * @param {Function} callback - Fonction à appeler
   */
  addUninstallListener(gameId, callback) {
    if (!this.uninstallListeners.has(gameId)) {
      this.uninstallListeners.set(gameId, []);
    }
    this.uninstallListeners.get(gameId).push(callback);
  }

  /**
   * Supprime tous les listeners de désinstallation pour un jeu
   * @param {string} gameId - ID du jeu
   */
  removeUninstallListeners(gameId) {
    this.uninstallListeners.delete(gameId);
  }
}

// Instance singleton
const gameManager = new GameManager();

export default gameManager;
