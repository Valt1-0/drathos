import { app } from "electron";
import logger from "../utils/logger.js";
import { secureHandle } from "./secureHandle.js";

let autoUpdateManager = null;

export const setAutoUpdateManager = (manager) => {
  autoUpdateManager = manager;
};

export const getAutoUpdateManager = () => autoUpdateManager;

export const registerUpdaterHandlers = () => {
  secureHandle("updater:checkForUpdates", async () => {
    try {
      if (!autoUpdateManager) return { success: false, error: "AutoUpdateManager not initialized" };
      const result = await autoUpdateManager.checkForUpdates();
      return { success: true, ...result };
    } catch (error) {
      logger.error("[AutoUpdater] Check error", error);
      return { success: false, error: error.message };
    }
  });

  secureHandle("updater:downloadAndInstall", async () => {
    try {
      if (!autoUpdateManager) return { success: false, error: "AutoUpdateManager not initialized" };
      return await autoUpdateManager.downloadUpdate();
    } catch (error) {
      logger.error("[AutoUpdater] Download error", error);
      return { success: false, error: error.message };
    }
  });

  secureHandle("updater:quitAndInstall", async () => {
    try {
      if (!autoUpdateManager) return { success: false, error: "AutoUpdateManager not initialized" };
      return autoUpdateManager.quitAndInstall();
    } catch (error) {
      logger.error("[AutoUpdater] Install error", error);
      return { success: false, error: error.message };
    }
  });

  secureHandle("updater:getStatus", async () => {
    try {
      if (!autoUpdateManager) return { success: false, status: "idle", currentVersion: app.getVersion() };
      return { success: true, ...autoUpdateManager.getStatus() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("updater:skipVersion", async (_, { version }) => {
    try {
      if (!autoUpdateManager) return { success: false, error: "AutoUpdateManager not initialized" };
      return { success: true, ...autoUpdateManager.skipVersion(version) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
