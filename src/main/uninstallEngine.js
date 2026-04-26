import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { buildServerUrl } from "./utils/urlHelper.js";
import logger from "./utils/logger.js";

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
      logger.info(`[UninstallEngine] Uninstalling: ${gameId}`);
      logger.info(`[UninstallEngine] Path: ${gamePath}`);

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
        message: "Pre-checks...",
      });

      // Verify that the path exists
      if (!fs.existsSync(gamePath)) {
        logger.warn(`[UninstallEngine] Folder does not exist, removing from database only`);

        // Delete from the database only
        const dbResult = await this.removeFromDatabase(gameId);

        if (dbResult) {
          sendProgress({
            id: gameId,
            stage: "uninstalled",
            progress: 100,
            message:
              "Game removed from database (files already absent)",
          });
          return { success: true, filesDeleted: false, dbDeleted: true };
        } else {
          throw new Error(
            "Could not remove game from database"
          );
        }
      }

      // Check write permissions
      try {
        await fs.promises.access(gamePath, fs.constants.W_OK);
      } catch (err) {
        throw new Error(
          `Insufficient permissions to delete: ${gamePath}`
        );
      }

      // ========================================
      // PHASE 2: FILE DELETION
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 10,
        message: "Preparing deletion...",
      });

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 20,
        message: "Deleting files...",
      });

      try {
        await this.deleteDirectory(gamePath, (progress) => {
          sendProgress({
            id: gameId,
            stage: "uninstalling",
            progress: 20 + Math.floor(progress * 0.6), // 20% → 80%
            message: `Deleting... ${Math.floor(progress)}%`,
          });
        });

        uninstallState.filesDeleted = true;
        logger.info(`[UninstallEngine] Files deleted: ${gamePath}`);
      } catch (filesError) {
        logger.error(`[UninstallEngine] File deletion error:`, filesError);
        uninstallState.error = filesError;

        // Do not continue if files were not deleted
        throw new Error(
          `Failed to delete files: ${filesError.message}`
        );
      }

      // ========================================
      // PHASE 3: DATABASE DELETION
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 90,
        message: "Cleaning up database...",
      });

      try {
        const dbResult = await this.removeFromDatabase(gameId);

        if (dbResult) {
          uninstallState.dbDeleted = true;
          logger.info(`[UninstallEngine] Game removed from database`);
        } else {
          logger.warn(`[UninstallEngine] Database removal failed, but files deleted`);

          // Files are deleted but not the database
          sendProgress({
            id: gameId,
            stage: "uninstalled",
            progress: 100,
            message: "Files deleted, but database error",
            warning: true,
          });

          return {
            success: true,
            filesDeleted: true,
            dbDeleted: false,
            warning: "Files deleted but game remains in database",
          };
        }
      } catch (dbError) {
        logger.error(`[UninstallEngine] Database removal error:`, dbError);

        // Files are deleted but not the database
        sendProgress({
          id: gameId,
          stage: "uninstalled",
          progress: 100,
          message: "Files deleted, but database error",
          warning: true,
        });

        return {
          success: true,
          filesDeleted: true,
          dbDeleted: false,
          warning: "Files deleted but game remains in database",
        };
      }

      // ========================================
      // PHASE 4: FINALIZATION
      // ========================================

      sendProgress({
        id: gameId,
        stage: "uninstalled",
        progress: 100,
        message: "Uninstall complete!",
      });

      return {
        success: true,
        filesDeleted: true,
        dbDeleted: true,
      };
    } catch (error) {
      logger.error(`[UninstallEngine] Critical error:`, error);

      // ========================================
      // ERROR HANDLING AND ROLLBACK
      // ========================================

      // If files were deleted but not the database
      if (uninstallState.filesDeleted && !uninstallState.dbDeleted) {
        logger.warn(`[UninstallEngine] Inconsistent state: files deleted but not database`);

        // Try to delete from the database one last time
        try {
          const retryDb = await this.removeFromDatabase(gameId);
          if (retryDb) {
            logger.info(`[UninstallEngine] Database removal succeeded on retry`);
            return {
              success: true,
              filesDeleted: true,
              dbDeleted: true,
            };
          }
        } catch (retryError) {
          logger.error(`[UninstallEngine] Database removal retry failed`);
        }

        sendProgress({
          id: gameId,
          stage: "failed",
          progress: 0,
          error: "Files deleted but database error",
          warning: true,
        });

        return {
          success: false,
          filesDeleted: true,
          dbDeleted: false,
          error: "Files deleted but game remains in database",
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
        logger.warn(`[UninstallEngine] Error deleting ${itemPath}: ${error.message}`);
        // Continue despite the error for individual files
        processedItems++;
      }
    }

    // Delete the root folder
    await fs.promises.rmdir(dirPath);
    logger.info(`[UninstallEngine] Directory deleted: ${dirPath}`);
  }

  /**
   * Removes the game from the backend database
   * @returns {boolean} true if successful, false if failed
   */
  async removeFromDatabase(gameId) {
    try {
      logger.info(`[UninstallEngine] Removing from database: ${gameId}`);

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
            logger.info(`[UninstallEngine] Backend response: ${res.statusCode}`);
            resolve(true);
          } else {
            logger.error(`[UninstallEngine] Backend error: ${res.statusCode}`);
            resolve(false);
          }
        });

        req.on("error", (err) => {
          logger.error(`[UninstallEngine] Network error: ${err.message}`);
          resolve(false);
        });

        req.end();
      });
    } catch (error) {
      logger.error(`[UninstallEngine] Database removal error:`, error);
      return false;
    }
  }
}
