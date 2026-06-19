import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import logger from './utils/logger.js';

/**
 * Simple and efficient auto-updater
 */
export class AutoUpdateManager {
  constructor() {
    this.status = 'idle';
    this.updateInfo = null;
    this.downloadProgress = null;
    this.mainWindow = null;
    this.checkInterval = null;

    // app.isPackaged is the canonical production check for Electron.
    // process.env.NODE_ENV is NOT set to "production" by electron-builder.
    this.isProduction = app.isPackaged;

    // Basic configuration
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Always configure events (even in dev for debugging)
    this.setupEvents();

    // electron-builder embeds app-update.yml at build time (from electron-builder.yml publish config).
    // electron-updater reads it automatically — no setFeedURL needed for the default GitHub flow.
    //
    // Fork override: set UPDATE_GITHUB_OWNER + UPDATE_GITHUB_REPO env vars to point
    // auto-update at a different GitHub repository without rebuilding.
    this.hasFeedConfigured = this.isProduction;

    if (this.isProduction) {
      const owner = process.env.UPDATE_GITHUB_OWNER;
      const repo  = process.env.UPDATE_GITHUB_REPO;
      if (owner && repo) {
        try {
          autoUpdater.setFeedURL({ provider: 'github', owner, repo });
          logger.info(`[AutoUpdater] Feed overridden: github/${owner}/${repo}`);
        } catch (error) {
          logger.error('[AutoUpdater] Failed to apply feed override:', error);
          this.hasFeedConfigured = false;
        }
      } else {
        // Default: reads app-update.yml embedded by electron-builder
        logger.info('[AutoUpdater] Using embedded GitHub feed (app-update.yml)');
      }
    } else {
      logger.info('[AutoUpdater] Dev mode — auto-update disabled');
    }
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupEvents() {
    autoUpdater.on('checking-for-update', () => {
      logger.info('[AutoUpdater] Checking...');
      this.status = 'checking';
      this.emit('checking');
    });

    autoUpdater.on('update-available', (info) => {
      logger.info('[AutoUpdater] Update available:', info.version);
      this.status = 'available';
      this.updateInfo = {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseDate: info.releaseDate,
        currentVersion: app.getVersion(),
      };
      this.emit('update-available', this.updateInfo);
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('[AutoUpdater] No update');
      this.status = 'idle';
      this.emit('update-not-available');
    });

    autoUpdater.on('download-progress', (progress) => {
      this.status = 'downloading';
      this.downloadProgress = {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
      };
      this.emit('download-progress', this.downloadProgress);
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('[AutoUpdater] Downloaded:', info.version);
      this.status = 'downloaded';
      this.emit('update-downloaded', { version: info.version });
    });

    autoUpdater.on('error', (error) => {
      // 404 = no releases published yet on GitHub — silent, not a real error for end users
      const is404 = error.message?.includes('404') || error.statusCode === 404;
      if (is404) {
        logger.info('[AutoUpdater] No releases found (404) — skipping update check silently');
        this.status = 'idle';
        return;
      }

      logger.error('[AutoUpdater] Error:', error);
      this.status = 'error';
      this.emit('error', { message: error.message });

      // Reset the status after 10 seconds to allow a new attempt
      setTimeout(() => {
        if (this.status === 'error') {
          logger.info('[AutoUpdater] Resetting error status');
          this.status = 'idle';
          this.updateInfo = null;
        }
      }, 10000);
    });
  }

  emit(event, data = {}) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(`updater:${event}`, data);
    }
  }

  async checkForUpdates() {
    if (!this.isProduction) {
      logger.info('[AutoUpdater] Skipping check in development mode');
      return {
        success: true,
        available: false,
        currentVersion: app.getVersion(),
        reason: 'Development mode',
      };
    }

    if (!this.hasFeedConfigured) {
      logger.warn('[AutoUpdater] No feed URL configured — skipping update check');
      return { success: true, available: false, currentVersion: app.getVersion(), reason: 'No feed configured' };
    }

    try {
      logger.info('[AutoUpdater] Checking for updates...');
      const result = await autoUpdater.checkForUpdates();

      if (!result || !result.updateInfo) {
        logger.warn('[AutoUpdater] No update info returned');
        return {
          success: true,
          available: false,
          currentVersion: app.getVersion(),
        };
      }

      const isNewer = result.updateInfo.version !== app.getVersion();
      logger.info('[AutoUpdater] Check result:', {
        current: app.getVersion(),
        latest: result.updateInfo.version,
        isNewer,
      });

      return {
        success: true,
        available: isNewer,
        currentVersion: app.getVersion(),
        latestVersion: result.updateInfo.version,
      };
    } catch (error) {
      logger.error('[AutoUpdater] Check failed:', error);
      return {
        success: false,
        error: error.message,
        currentVersion: app.getVersion(),
      };
    }
  }

  async downloadUpdate() {
    if (!this.isProduction || this.status !== 'available') {
      return { success: false, error: 'No update available' };
    }

    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      logger.error('[AutoUpdater] Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  quitAndInstall() {
    if (!this.isProduction || this.status !== 'downloaded') {
      return { success: false, error: 'No update downloaded' };
    }

    logger.info('[AutoUpdater] Quitting and installing...');
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  }

  getStatus() {
    return {
      success: true,
      status: this.status,
      currentVersion: app.getVersion(),
      updateInfo: this.updateInfo,
      downloadProgress: this.downloadProgress,
    };
  }

  skipVersion(version) {
    logger.info('[AutoUpdater] Skipping version:', version);
    this.status = 'idle';
    this.updateInfo = null;
    return { success: true, skipped: version };
  }

  /**
   * Starts an automatic periodic update check
   * @param {number} intervalMinutes - Interval in minutes (default: 60)
   */
  startPeriodicCheck(intervalMinutes = 60) {
    if (!this.isProduction) {
      logger.info('[AutoUpdater] Periodic checks disabled in dev mode');
      return;
    }

    // Stop any existing check
    this.stopPeriodicCheck();

    const intervalMs = intervalMinutes * 60 * 1000;
    logger.info(`[AutoUpdater] Starting periodic checks every ${intervalMinutes} minutes`);

    this.checkInterval = setInterval(() => {
      logger.info('[AutoUpdater] Running periodic update check');
      this.checkForUpdates().catch(err => {
        logger.error('[AutoUpdater] Periodic check error:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops the automatic periodic check
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      logger.info('[AutoUpdater] Stopping periodic checks');
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Cleans up resources on shutdown
   */
  cleanup() {
    this.stopPeriodicCheck();
    logger.info('[AutoUpdater] Cleanup complete');
  }
}

export default AutoUpdateManager;
