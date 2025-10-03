// src/main/uninstallEngine.js - Logique de désinstallation 🗑️

import fs from "fs";
import path from "path";

export class UninstallEngine {
  constructor() {
    this.serverAddress = null;
    this.userToken = null;
    this.sendProgress = null;
  }

  /**
   * 🗑️ Désinstalle complètement un jeu
   */
  async uninstallGame(gameId, gamePath, { store, sendProgress }) {
    try {
      console.log(`[UninstallEngine] 🗑️ Désinstallation: ${gameId}`);
      console.log(`[UninstallEngine] Chemin: ${gamePath}`);

      // Initialiser
      this.serverAddress = store.get("serverAddress");
      this.userToken = store.get("userToken");
      this.sendProgress = sendProgress;

      // Vérifier que le chemin existe
      if (!fs.existsSync(gamePath)) {
        throw new Error(`Le dossier du jeu n'existe pas: ${gamePath}`);
      }

      // Étape 1: Préparation
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 10,
        message: "Préparation de la désinstallation...",
      });

      // Étape 2: Supprimer les fichiers
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 30,
        message: "Suppression des fichiers...",
      });

      await this.deleteDirectory(gamePath, (progress) => {
        sendProgress({
          id: gameId,
          stage: "uninstalling",
          progress: 30 + Math.floor(progress * 0.5), // 30% -> 80%
          message: `Suppression en cours... ${Math.floor(progress)}%`,
        });
      });

      console.log(`[UninstallEngine] ✅ Fichiers supprimés: ${gamePath}`);

      // Étape 3: Supprimer de la base de données
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 85,
        message: "Nettoyage de la base de données...",
      });

      await this.removeFromDatabase(gameId);

      console.log(`[UninstallEngine] ✅ Jeu supprimé de la base de données`);

      // Étape 4: Finalisation
      sendProgress({
        id: gameId,
        stage: "uninstalled",
        progress: 100,
        message: "Désinstallation terminée !",
      });

      return { success: true };
    } catch (error) {
      console.error(`[UninstallEngine] ❌ Erreur:`, error);

      sendProgress({
        id: gameId,
        stage: "failed",
        progress: 0,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Supprime récursivement un dossier avec progression
   */
  async deleteDirectory(dirPath, progressCallback) {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const totalItems = items.length;
    let processedItems = 0;

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      try {
        if (item.isDirectory()) {
          // Suppression récursive des sous-dossiers
          await this.deleteDirectory(itemPath, () => {}); // Pas de sous-progression
          await fs.promises.rmdir(itemPath);
        } else {
          // Suppression du fichier
          await fs.promises.unlink(itemPath);
        }

        processedItems++;
        const progress = (processedItems / totalItems) * 100;
        progressCallback(progress);
      } catch (error) {
        console.warn(
          `[UninstallEngine] ⚠️ Erreur suppression ${itemPath}:`,
          error.message
        );
        // Continuer malgré l'erreur
      }
    }

    // Supprimer le dossier racine
    try {
      await fs.promises.rmdir(dirPath);
      console.log(`[UninstallEngine] ✅ Dossier supprimé: ${dirPath}`);
    } catch (error) {
      console.error(
        `[UninstallEngine] ❌ Impossible de supprimer ${dirPath}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Supprime le jeu de la base de données backend
   */
  async removeFromDatabase(gameId) {
    try {
      const response = await fetch(
        `http://${this.serverAddress}/api/installedGames/removeInstalledGame/${gameId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.userToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || `HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(
        `[UninstallEngine] ❌ Erreur suppression base de données:`,
        error
      );
      // Ne pas faire échouer toute la désinstallation si la suppression DB échoue
      console.warn(
        `[UninstallEngine] ⚠️ La désinstallation continue malgré l'erreur DB`
      );
      return false;
    }
  }
}
