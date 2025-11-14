import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import logger from './utils/logger.js';

/**
 * Auto-updater simple et efficace
 */
export class AutoUpdateManager {
  constructor() {
    this.status = 'idle';
    this.updateInfo = null;
    this.downloadProgress = null;
    this.mainWindow = null;
    this.checkInterval = null;

    // Déterminer si on est en production
    this.isProduction = app.isPackaged && process.env.NODE_ENV === 'production';

    // Configuration de base
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Toujours configurer les événements (même en dev pour le débogage)
    this.setupEvents();

    // Configuration du feed GitHub uniquement en production
    if (this.isProduction) {
      try {
        autoUpdater.setFeedURL({
          provider: 'github',
          owner: 'Valt1-0',
          repo: 'drathos',
          private: false,
        });
        logger.info('[AutoUpdater] GitHub feed configured');
      } catch (error) {
        logger.error('[AutoUpdater] Failed to configure feed:', error);
      }
    } else {
      logger.info('[AutoUpdater] Dev mode - updates disabled');
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
      logger.error('[AutoUpdater] Error:', error);
      this.status = 'error';
      this.emit('error', { message: error.message });

      // Reset le statut après 10 secondes pour permettre une nouvelle tentative
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
   * Démarre une vérification automatique périodique des mises à jour
   * @param {number} intervalMinutes - Intervalle en minutes (par défaut: 60)
   */
  startPeriodicCheck(intervalMinutes = 60) {
    if (!this.isProduction) {
      logger.info('[AutoUpdater] Periodic checks disabled in dev mode');
      return;
    }

    // Arrêter toute vérification existante
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
   * Arrête la vérification automatique périodique
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      logger.info('[AutoUpdater] Stopping periodic checks');
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Nettoie les ressources lors de la fermeture
   */
  cleanup() {
    this.stopPeriodicCheck();
    logger.info('[AutoUpdater] Cleanup complete');
  }
}

export default AutoUpdateManager;
