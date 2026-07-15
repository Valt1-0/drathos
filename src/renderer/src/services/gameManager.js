import logger from './logger.js';

class GameManager {
  constructor() {
    this.statusListeners = new Map();
    this.uninstallListeners = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.api.onGameStatusChanged((status) => {
      logger.debug(`[GameManager] Event received: ${status.gameId} - ${status.status}`);

      const listeners = this.statusListeners.get(status.gameId) || [];
      logger.debug(`[GameManager] Specific listeners for ${status.gameId}: ${listeners.length}`);
      listeners.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          logger.error("Error in status callback", error);
        }
      });

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

    window.api.onUninstallProgress((progress) => {
      const listeners = this.uninstallListeners.get(progress.id) || [];
      listeners.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          logger.error("Error in uninstall callback", error);
        }
      });

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

  async launchGame(
    gameId,
    gamePath,
    executableName = null,
    gameName = "",
    onStatusChange = null
  ) {
    try {
      logger.info(`[GameManager] Launching ${gameId}...`);

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

      if (onStatusChange) {
        this.addStatusListener(gameId, onStatusChange);
      }

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

  async detectExecutables(gamePath, gameName = "") {
    try {
      const result = await window.api.detectExecutables({ gamePath, gameName });
      return result.success ? result.executables : [];
    } catch (error) {
      logger.error("[GameManager] Error detecting executables", error);
      return [];
    }
  }

  async getBestExecutable(gamePath, gameName = "") {
    try {
      const result = await window.api.getBestExecutable({ gamePath, gameName });
      return result.success ? result.executable : null;
    } catch (error) {
      logger.error("[GameManager] Error detecting best executable", error);
      return null;
    }
  }

  async listGameDirectory(gamePath) {
    try {
      const result = await window.api.listGameDirectory(gamePath);
      return result.success ? result.items : [];
    } catch (error) {
      logger.error("[GameManager] Error listing game directory", error);
      return [];
    }
  }

  async isGameRunning(gameId) {
    try {
      return await window.api.isGameRunning(gameId);
    } catch (error) {
      logger.error(`[GameManager] Error checking if game is running: ${gameId}`, error);
      return false;
    }
  }

  async getActiveGames() {
    try {
      return await window.api.getActiveGames();
    } catch (error) {
      logger.error("[GameManager] Error retrieving active games", error);
      return [];
    }
  }

  async openGameFolder(gamePath) {
    try {
      return await window.api.openGameFolder(gamePath);
    } catch (error) {
      logger.error("[GameManager] Error opening game folder", error);
      return { success: false, error: error.message };
    }
  }

  async getGameProcess(gameId) {
    try {
      return await window.api.getGameProcess(gameId);
    } catch (error) {
      logger.error(`[GameManager] Error retrieving process for ${gameId}`, error);
      return null;
    }
  }

  addStatusListener(gameId, callback) {
    if (!this.statusListeners.has(gameId)) {
      this.statusListeners.set(gameId, []);
    }
    this.statusListeners.get(gameId).push(callback);
  }

  removeStatusListener(gameId, callback) {
    const listeners = this.statusListeners.get(gameId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  removeStatusListeners(gameId) {
    this.statusListeners.delete(gameId);
  }

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

  formatFileSize(sizeInMB) {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  }

  async stopGame(gameId, force = false) {
    try {
      logger.info(`[GameManager] Stopping ${gameId} (force: ${force})`);

      const result = await window.api.stopGame({ gameId, force });

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

  async uninstallGame(gameId, gamePath, gameName, onProgress = null) {
    try {
      logger.info(`[GameManager] Uninstalling ${gameName}...`);

      if (onProgress) {
        this.addUninstallListener(gameId, onProgress);
      }

      const result = await window.api.uninstallGame({
        gameId,
        gamePath,
        gameName,
      });

      logger.info(`[GameManager] Uninstall result: ${JSON.stringify(result)}`);

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

  async canUninstallGame(gameId, gamePath) {
    try {
      return await window.api.canUninstallGame({ gameId, gamePath });
    } catch (error) {
      logger.error(`[GameManager] Error checking uninstall eligibility`, error);
      return { canUninstall: false, reason: error.message };
    }
  }

  async getGameSize(gamePath) {
    try {
      return await window.api.getGameSize({ gamePath });
    } catch (error) {
      logger.error(`[GameManager] Error calculating game size`, error);
      return { success: false, error: error.message };
    }
  }

  addUninstallListener(gameId, callback) {
    if (!this.uninstallListeners.has(gameId)) {
      this.uninstallListeners.set(gameId, []);
    }
    this.uninstallListeners.get(gameId).push(callback);
  }

  removeUninstallListener(gameId, callback) {
    const listeners = this.uninstallListeners.get(gameId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    }
  }

  removeUninstallListeners(gameId) {
    this.uninstallListeners.delete(gameId);
  }
}

const gameManager = new GameManager();

export default gameManager;
