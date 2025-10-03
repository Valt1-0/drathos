// src/main/uninstallEngine.js - Version sécurisée avec rollback 🛡️

import fs from "fs";
import path from "path";

export class UninstallEngine {
  constructor() {
    this.serverAddress = null;
    this.userToken = null;
    this.sendProgress = null;
  }

  /**
   * 🗑️ Désinstalle complètement un jeu avec sécurité renforcée
   */
  async uninstallGame(gameId, gamePath, { store, sendProgress }) {
    // État de la désinstallation pour rollback
    const uninstallState = {
      filesDeleted: false,
      dbDeleted: false,
      error: null,
    };

    try {
      console.log(`[UninstallEngine] 🗑️ Désinstallation: ${gameId}`);
      console.log(`[UninstallEngine] Chemin: ${gamePath}`);

      // Initialiser
      this.serverAddress = store.get("serverAddress");
      this.userToken = store.get("userToken");
      this.sendProgress = sendProgress;

      // ========================================
      // PHASE 1 : VÉRIFICATIONS PRÉALABLES
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 5,
        message: "Vérifications préalables...",
      });

      // Vérifier que le chemin existe
      if (!fs.existsSync(gamePath)) {
        console.warn(
          `[UninstallEngine] ⚠️ Le dossier n'existe pas, suppression BDD uniquement`
        );

        // Supprimer uniquement de la BDD
        const dbResult = await this.removeFromDatabase(gameId);

        if (dbResult) {
          sendProgress({
            id: gameId,
            stage: "uninstalled",
            progress: 100,
            message:
              "Jeu supprimé de la base de données (fichiers déjà absents)",
          });
          return { success: true, filesDeleted: false, dbDeleted: true };
        } else {
          throw new Error(
            "Impossible de supprimer le jeu de la base de données"
          );
        }
      }

      // Vérifier les permissions d'écriture
      try {
        await fs.promises.access(gamePath, fs.constants.W_OK);
      } catch (err) {
        throw new Error(
          `Permissions insuffisantes pour supprimer: ${gamePath}`
        );
      }

      // ========================================
      // PHASE 2 : SUPPRESSION DES FICHIERS
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 10,
        message: "Préparation de la suppression...",
      });

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 20,
        message: "Suppression des fichiers...",
      });

      try {
        await this.deleteDirectory(gamePath, (progress) => {
          sendProgress({
            id: gameId,
            stage: "uninstalling",
            progress: 20 + Math.floor(progress * 0.6), // 20% -> 80%
            message: `Suppression en cours... ${Math.floor(progress)}%`,
          });
        });

        uninstallState.filesDeleted = true;
        console.log(`[UninstallEngine] ✅ Fichiers supprimés: ${gamePath}`);
      } catch (filesError) {
        console.error(
          `[UninstallEngine] ❌ Erreur suppression fichiers:`,
          filesError
        );
        uninstallState.error = filesError;

        // Ne pas continuer si les fichiers n'ont pas été supprimés
        throw new Error(
          `Échec de la suppression des fichiers: ${filesError.message}`
        );
      }

      // ========================================
      // PHASE 3 : SUPPRESSION EN BASE DE DONNÉES
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 85,
        message: "Nettoyage de la base de données...",
      });

      try {
        const dbResult = await this.removeFromDatabase(gameId);

        if (dbResult) {
          uninstallState.dbDeleted = true;
          console.log(
            `[UninstallEngine] ✅ Jeu supprimé de la base de données`
          );
        } else {
          console.warn(
            `[UninstallEngine] ⚠️ Échec suppression BDD, mais fichiers supprimés`
          );

          // Les fichiers sont supprimés mais pas la BDD
          sendProgress({
            id: gameId,
            stage: "uninstalled",
            progress: 100,
            message: "⚠️ Fichiers supprimés, mais erreur base de données",
            warning: true,
          });

          return {
            success: true,
            filesDeleted: true,
            dbDeleted: false,
            warning: "Fichiers supprimés mais le jeu reste en base de données",
          };
        }
      } catch (dbError) {
        console.error(`[UninstallEngine] ❌ Erreur suppression BDD:`, dbError);

        // Les fichiers sont supprimés mais pas la BDD
        sendProgress({
          id: gameId,
          stage: "uninstalled",
          progress: 100,
          message: "⚠️ Fichiers supprimés, mais erreur base de données",
          warning: true,
        });

        return {
          success: true,
          filesDeleted: true,
          dbDeleted: false,
          warning: "Fichiers supprimés mais le jeu reste en base de données",
        };
      }

      // ========================================
      // PHASE 4 : FINALISATION
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalled",
        progress: 100,
        message: "Désinstallation terminée !",
      });

      return {
        success: true,
        filesDeleted: true,
        dbDeleted: true,
      };
    } catch (error) {
      console.error(`[UninstallEngine] ❌ Erreur critique:`, error);

      // ========================================
      // GESTION D'ERREUR ET ROLLBACK
      // ========================================

      // Si les fichiers ont été supprimés mais pas la BDD
      if (uninstallState.filesDeleted && !uninstallState.dbDeleted) {
        console.warn(
          `[UninstallEngine] ⚠️ État incohérent: fichiers supprimés mais pas la BDD`
        );

        // Tenter de supprimer de la BDD une dernière fois
        try {
          const retryDb = await this.removeFromDatabase(gameId);
          if (retryDb) {
            console.log(
              `[UninstallEngine] ✅ Suppression BDD réussie au retry`
            );
            return {
              success: true,
              filesDeleted: true,
              dbDeleted: true,
            };
          }
        } catch (retryError) {
          console.error(`[UninstallEngine] ❌ Retry suppression BDD échoué`);
        }

        sendProgress({
          id: gameId,
          stage: "failed",
          progress: 0,
          error: "Fichiers supprimés mais erreur base de données",
          warning: true,
        });

        return {
          success: false,
          filesDeleted: true,
          dbDeleted: false,
          error: "Fichiers supprimés mais le jeu reste en base de données",
        };
      }

      // Erreur avant la suppression des fichiers
      sendProgress({
        id: gameId,
        stage: "failed",
        progress: 0,
        error: error.message,
      });

      return {
        success: false,
        filesDeleted: false,
        dbDeleted: false,
        error: error.message,
      };
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
        // Continuer malgré l'erreur pour les fichiers individuels
        processedItems++;
      }
    }

    // Supprimer le dossier racine
    await fs.promises.rmdir(dirPath);
    console.log(`[UninstallEngine] ✅ Dossier supprimé: ${dirPath}`);
  }

  /**
   * Supprime le jeu de la base de données backend
   * @returns {boolean} true si succès, false si échec
   */
  async removeFromDatabase(gameId) {
    try {
      console.log(
        `[UninstallEngine] 🗑️ Suppression BDD pour gameId: ${gameId}`
      );

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
        console.error(`[UninstallEngine] ❌ Erreur backend:`, errorData);
        return false;
      }

      const data = await response.json();
      console.log(`[UninstallEngine] ✅ Réponse backend:`, data);

      return true;
    } catch (error) {
      console.error(
        `[UninstallEngine] ❌ Erreur suppression base de données:`,
        error
      );
      return false;
    }
  }
}
