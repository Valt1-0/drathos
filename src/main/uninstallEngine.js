import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { buildServerUrl } from "./utils/urlHelper.js";

export class UninstallEngine {
  constructor() {
    this.serverAddress = null;
    this.userToken = null;
    this.sendProgress = null;
  }

  /**
   * 🗑️ Completely uninstalls a game with enhanced security
   */
  async uninstallGame(gameId, gamePath, { store, sendProgress }) {
    // Uninstall state for rollback
    const uninstallState = {
      filesDeleted: false,
      dbDeleted: false,
      error: null,
    };

    try {
      console.log(`[UninstallEngine] 🗑️ Désinstallation: ${gameId}`);
      console.log(`[UninstallEngine] Chemin: ${gamePath}`);

      // Initialize
      this.serverAddress = store.get("serverAddress");
      this.userToken = store.get("userToken");
      this.allowSelfSignedCerts = store.get("allowSelfSignedCerts") ?? true;
      this.sendProgress = sendProgress;

      // ========================================
      // PHASE 1: PRE-CHECKS
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 5,
        message: "Vérifications préalables...",
      });

      // Verify that the path exists
      if (!fs.existsSync(gamePath)) {
        console.warn(
          `[UninstallEngine] ⚠️ Le dossier n'existe pas, suppression BDD uniquement`
        );

        // Delete from the database only
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

      // Check write permissions
      try {
        await fs.promises.access(gamePath, fs.constants.W_OK);
      } catch (err) {
        throw new Error(
          `Permissions insuffisantes pour supprimer: ${gamePath}`
        );
      }

      // ========================================
      // PHASE 2: FILE DELETION
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
            progress: 20 + Math.floor(progress * 0.6), // 20% → 80%
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

        // Do not continue if files were not deleted
        throw new Error(
          `Échec de la suppression des fichiers: ${filesError.message}`
        );
      }

      // ========================================
      // PHASE 3: DATABASE DELETION
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 90,
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

          // Files are deleted but not the database
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

        // Files are deleted but not the database
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
      // PHASE 4: FINALIZATION
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
      // ERROR HANDLING AND ROLLBACK
      // ========================================

      // If files were deleted but not the database
      if (uninstallState.filesDeleted && !uninstallState.dbDeleted) {
        console.warn(
          `[UninstallEngine] ⚠️ État incohérent: fichiers supprimés mais pas la BDD`
        );

        // Try to delete from the database one last time
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

      // Error before file deletion
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
   * Recursively deletes a folder with progress reporting
   */
  async deleteDirectory(dirPath, progressCallback) {
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const totalItems = items.length;
    let processedItems = 0;

    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);

      try {
        if (item.isDirectory()) {
          // Recursive deletion of subfolders
          await this.deleteDirectory(itemPath, () => {}); // No sub-progress
          await fs.promises.rmdir(itemPath);
        } else {
          // Delete the file
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
        // Continue despite the error for individual files
        processedItems++;
      }
    }

    // Delete the root folder
    await fs.promises.rmdir(dirPath);
    console.log(`[UninstallEngine] ✅ Dossier supprimé: ${dirPath}`);
  }

  /**
   * Removes the game from the backend database
   * @returns {boolean} true if successful, false if failed
   */
  async removeFromDatabase(gameId) {
    try {
      console.log(
        `[UninstallEngine] 🗑️ Suppression BDD pour gameId: ${gameId}`
      );

      const url = new URL(
        buildServerUrl(this.serverAddress, `/api/installedGames/removeInstalledGame/${gameId}`)
      );
      const isHttps = url.protocol === "https:";
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.userToken}`,
        },
        ...(isHttps && this.allowSelfSignedCerts ? { rejectUnauthorized: false } : {}),
      };

      return await new Promise((resolve) => {
        const req = (isHttps ? https : http).request(options, (res) => {
          res.resume();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`[UninstallEngine] ✅ Réponse backend: ${res.statusCode}`);
            resolve(true);
          } else {
            console.error(`[UninstallEngine] ❌ Erreur backend: ${res.statusCode}`);
            resolve(false);
          }
        });

        req.on("error", (err) => {
          console.error("[UninstallEngine] ❌ Erreur réseau:", err.message);
          resolve(false);
        });

        req.end();
      });
    } catch (error) {
      console.error(
        `[UninstallEngine] ❌ Erreur suppression base de données:`,
        error
      );
      return false;
    }
  }
}
