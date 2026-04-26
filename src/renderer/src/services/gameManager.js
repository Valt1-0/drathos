// drathos/src/renderer/src/api/gameManager.js
import logger from './logger.js';

/**
 * Simplified API for game management
 */
class GameManager {
  constructor() {
    this.statusListeners = new Map(); // Map<gameId, callback[]>
    this.uninstallListeners = new Map(); // Map<gameId, callback[]>
    this.setupEventListeners();
  }

  /**
   * Configures global event listeners
   */
  setupEventListeners() {
    // Listen for game status changes
    window.api.onGameStatusChanged((status) => {
      logger.debug(`[GameManager] Event received: ${status.gameId} - ${status.status}`);

      // Call listeners for this specific gameId
      const listeners = this.statusListeners.get(status.gameId) || [];
      logger.debug(`[GameManager] Specific listeners for ${status.gameId}: ${listeners.length}`);
      listeners.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          logger.error("Error in status callback", error);
        }
      });

      // Also call global listeners (wildcard "*")
      const globalListeners = this.statusListeners.get("*") || [];
      logger.debug(`[GameManager] Global listeners (*): ${globalListeners.length}`);
      globalListeners.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          logger.error("Error in global status callback", error);
        }
      });
    });

    // NEW - Listen for uninstall progress events
    window.api.onUninstallProgress((progress) => {
      // Call listeners for this specific gameId
      const listeners = this.uninstallListeners.get(progress.id) || [];
      listeners.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          logger.error("Error in uninstall callback", error);
        }
      });

      // Also call global listeners (wildcard "*")
      const globalListeners = this.uninstallListeners.get("*") || [];
      globalListeners.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          logger.error("Error in global uninstall callback", error);
        }
      });
    });
  }

  /**
   * Launches a game with automatic executable detection if needed
   * @param {string} gameId - Unique game ID
   * @param {string} gamePath - Path to the game folder
   * @param {string|null} executableName - Executable name (null for auto-detection)
   * @param {string} gameName - Game name to assist detection
   * @param {Function} onStatusChange - Optional callback for state changes
   */
  async launchGame(
    gameId,
    gamePath,
    executableName = null,
    gameName = "",
    onStatusChange = null
  ) {
    try {
      logger.info(`[GameManager] Launching ${gameId}...`);

      // Automatic executable detection if needed
      let finalExecutableName = executableName;

      if (!finalExecutableName) {
        logger.info(`[GameManager] Auto-detecting executable for ${gameName}...`);

        const detection = await window.api.getBestExecutable({
          gamePath,
          gameName,
        });

        if (!detection.success || !detection.executable) {
          throw new Error("Could not detect game executable");
        }

        finalExecutableName = detection.executable;
        logger.info(`[GameManager] Executable detected: ${finalExecutableName}`);
      }

      // Add the callback if provided
      if (onStatusChange) {
        this.addStatusListener(gameId, onStatusChange);
      }

      // Call the native API with the correct format (no double wrapping)
      const result = await window.api.launchGame({
        gameId,
        gamePath,
        executableName: finalExecutableName,
        gameName,
      });

      logger.info(`[GameManager] Launch result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`[GameManager] Error launching ${gameId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Detects all available executables for a game
   * @param {string} gamePath - Path to the game folder
   * @param {string} gameName - Game name
   */
  async detectExecutables(gamePath, gameName = "") {
    try {
      const result = await window.api.detectExecutables({ gamePath, gameName });
      return result.success ? result.executables : [];
    } catch (error) {
      logger.error("[GameManager] Error detecting executables", error);
      return [];
    }
  }

  /**
   * Gets the best executable for a game
   * @param {string} gamePath - Path to the game folder
   * @param {string} gameName - Game name
   */
  async getBestExecutable(gamePath, gameName = "") {
    try {
      const result = await window.api.getBestExecutable({ gamePath, gameName });
      return result.success ? result.executable : null;
    } catch (error) {
      logger.error("[GameManager] Error detecting best executable", error);
      return null;
    }
  }

  /**
   * Lists the contents of a game folder
   * @param {string} gamePath - Path to the game folder
   */
  async listGameDirectory(gamePath) {
    try {
      const result = await window.api.listGameDirectory(gamePath);
      return result.success ? result.items : [];
    } catch (error) {
      logger.error("[GameManager] Error listing game directory", error);
      return [];
    }
  }

  /**
   * Checks if a game is currently running
   * @param {string} gameId - Game ID
   */
  async isGameRunning(gameId) {
    try {
      return await window.api.isGameRunning(gameId);
    } catch (error) {
      logger.error(`[GameManager] Error checking if game is running: ${gameId}`, error);
      return false;
    }
  }

  /**
   * Gets the list of all active games
   */
  async getActiveGames() {
    try {
      return await window.api.getActiveGames();
    } catch (error) {
      logger.error("[GameManager] Error retrieving active games", error);
      return [];
    }
  }

  /**
   * Opens a game folder in the file explorer
   * @param {string} gamePath - Path to the game folder
   */
  async openGameFolder(gamePath) {
    try {
      return await window.api.openGameFolder(gamePath);
    } catch (error) {
      logger.error("[GameManager] Error opening game folder", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gets the process information for a game
   * @param {string} gameId - Game ID
   */
  async getGameProcess(gameId) {
    try {
      return await window.api.getGameProcess(gameId);
    } catch (error) {
      logger.error(`[GameManager] Error retrieving process for ${gameId}`, error);
      return null;
    }
  }

  /**
   * Adds a listener for game status changes
   * @param {string} gameId - Game ID
   * @param {Function} callback - Function to call on changes
   */
  addStatusListener(gameId, callback) {
    if (!this.statusListeners.has(gameId)) {
      this.statusListeners.set(gameId, []);
    }
    this.statusListeners.get(gameId).push(callback);
  }

  /**
   * Removes a specific listener
   * @param {string} gameId - Game ID
   * @param {Function} callback - Function to remove
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
   * Removes all listeners for a game
   * @param {string} gameId - Game ID
   */
  removeStatusListeners(gameId) {
    this.statusListeners.delete(gameId);
  }

  /**
   * Formats a duration in seconds to a readable format
   * @param {number} seconds - Duration in seconds
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
   * Formats a file size
   * @param {number} sizeInMB - Size in MB
   */
  formatFileSize(sizeInMB) {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  }

  /**
   * 🛑 Stops a running game
   */
  async stopGame(gameId, force = false) {
    try {
      logger.info(`[GameManager] Stopping ${gameId} (force: ${force})`);

      const result = await window.api.stopGame({ gameId, force });

      // Clean up listeners if the game stops successfully
      if (result.success) {
        this.removeStatusListeners(gameId);
      }

      return result;
    } catch (error) {
      logger.error(`[GameManager] Error stopping ${gameId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * ⚡ Force stop a game
   */
  async forceStopGame(gameId) {
    try {
      logger.info(`[GameManager] Force stopping ${gameId}`);

      const result = await window.api.forceStopGame({ gameId });

      if (result.success) {
        this.removeStatusListeners(gameId);
      }

      return result;
    } catch (error) {
      logger.error(`[GameManager] Error force stopping ${gameId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🗑️ Completely uninstalls a game
   */
  async uninstallGame(gameId, gamePath, gameName, onProgress = null) {
    try {
      logger.info(`[GameManager] Uninstalling ${gameName}...`);

      // Add the progress listener if provided
      if (onProgress) {
        this.addUninstallListener(gameId, onProgress);
      }

      const result = await window.api.uninstallGame({
        gameId,
        gamePath,
        gameName,
      });

      logger.info(`[GameManager] Uninstall result: ${JSON.stringify(result)}`);

      // Clean up all listeners for this game
      this.removeStatusListeners(gameId);
      this.removeUninstallListeners(gameId);

      return result;
    } catch (error) {
      logger.error(`[GameManager] Error uninstalling ${gameName}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🔍 Checks if a game can be uninstalled
   */
  async canUninstallGame(gameId, gamePath) {
    try {
      return await window.api.canUninstallGame({ gameId, gamePath });
    } catch (error) {
      logger.error(`[GameManager] Error checking uninstall eligibility`, error);
      return { canUninstall: false, reason: error.message };
    }
  }

  /**
   * 📊 Gets the size of an installed game
   * @param {string} gamePath - Game path
   */
  async getGameSize(gamePath) {
    try {
      return await window.api.getGameSize({ gamePath });
    } catch (error) {
      logger.error(`[GameManager] Error calculating game size`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adds a listener for uninstall events
   * @param {string} gameId - Game ID
   * @param {Function} callback - Function to call
   */
  addUninstallListener(gameId, callback) {
    if (!this.uninstallListeners.has(gameId)) {
      this.uninstallListeners.set(gameId, []);
    }
    this.uninstallListeners.get(gameId).push(callback);
  }

  /**
   * Removes a specific uninstall listener for a game
   * @param {string} gameId - Game ID
   * @param {Function} callback - Function to remove
   */
  removeUninstallListener(gameId, callback) {
    const listeners = this.uninstallListeners.get(gameId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  /**
   * Removes all uninstall listeners for a game
   * @param {string} gameId - Game ID
   */
  removeUninstallListeners(gameId) {
    this.uninstallListeners.delete(gameId);
  }
}

// Singleton instance
const gameManager = new GameManager();

export default gameManager;
