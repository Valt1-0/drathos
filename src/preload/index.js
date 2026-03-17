// drathos/src/preload/index.js

import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
  // === EXISTING APIS (unchanged) ===
  selectAndCreateFolder: (subfolderName) =>
    ipcRenderer.invoke("dialog:selectAndCreate", subfolderName),
  selectFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  installGame: (game) =>
    ipcRenderer.invoke("installGame", { serverGame: game }),
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners("downloadProgress");
    ipcRenderer.on("downloadProgress", (_event, data) => callback(data));
  },
  cancelDownload: (gameId) => ipcRenderer.invoke("cancelDownload", { gameId }),
  pauseDownload: (gameId) => ipcRenderer.invoke("pauseDownload", { gameId }),
  resumeDownload: (gameId) => ipcRenderer.invoke("resumeDownload", { gameId }),

  launchGame: (gameData, installedPath) =>
    ipcRenderer.invoke("launchGame", { gameData, installedPath }),
  getActiveGames: () => ipcRenderer.invoke("getActiveGames"),
  onGameStatusChanged: (callback) => {
    ipcRenderer.removeAllListeners("gameStatusChanged");
    ipcRenderer.on("gameStatusChanged", (_event, data) => callback(data));
  },
  listGameFiles: (gameId) => ipcRenderer.invoke("listGameFiles", gameId),
  configureExecutable: (gameId, config) =>
    ipcRenderer.invoke("configureExecutable", { gameId, config }),

  // Detect all executables in a game folder
  detectExecutables: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("detectExecutables", { gamePath, gameName }),
  // Get the best executable for a game
  getBestExecutable: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("getBestExecutable", { gamePath, gameName }),
  // Check if a file is executable
  isFileExecutable: (filePath) =>
    ipcRenderer.invoke("isFileExecutable", filePath),
  // List the contents of a game folder
  listGameDirectory: (gamePath) =>
    ipcRenderer.invoke("listGameDirectory", gamePath),
  // Open a game's folder
  openGameFolder: (gamePath) => ipcRenderer.invoke("openGameFolder", gamePath),
  // List the contents of an archive (zip, 7z, rar, tar, etc.)
  listArchiveFiles: (filePath) => ipcRenderer.invoke("listArchiveFiles", filePath),
  // Select and scan an archive (for games)
  selectAndScanArchive: () => ipcRenderer.invoke("selectAndScanArchive"),
  // Select an archive file (for mods - without scan)
  selectArchiveFile: () => ipcRenderer.invoke("selectArchiveFile"),
  // Read an archive file as a buffer
  readArchiveFile: (filePath) => ipcRenderer.invoke("readArchiveFile", filePath),
  // Get the process info of a game
  getGameProcess: (gameId) => ipcRenderer.invoke("getGameProcess", gameId),
  // Check if a game is currently running
  isGameRunning: (gameId) => ipcRenderer.invoke("isGameRunning", gameId),

  // Stop a game normally
  stopGame: ({ gameId, force = false }) =>
    ipcRenderer.invoke("stopGame", { gameId, force }),

  // Force-stop a game
  forceStopGame: ({ gameId }) =>
    ipcRenderer.invoke("forceStopGame", { gameId }),

  // Uninstall a game
  uninstallGame: ({ gameId, gamePath, gameName }) =>
    ipcRenderer.invoke("uninstallGame", { gameId, gamePath, gameName }),

  // Check if a game can be uninstalled
  canUninstallGame: ({ gameId, gamePath }) =>
    ipcRenderer.invoke("canUninstallGame", { gameId, gamePath }),

  // Listen to uninstall progress
  onUninstallProgress: (callback) => {
    ipcRenderer.removeAllListeners("uninstallProgress");
    ipcRenderer.on("uninstallProgress", (_event, data) => callback(data));
  },

  // Get the size of a game
  getGameSize: ({ gamePath }) =>
    ipcRenderer.invoke("getGameSize", { gamePath }),

  // Get free disk space
  getDiskSpace: () => ipcRenderer.invoke("getDiskSpace"),

  onSaveGameStats: (callback) => {
    ipcRenderer.removeAllListeners("save-game-stats");
    ipcRenderer.on("save-game-stats", (_event, data) => {
      callback(data);
    });
  },

  saveLocalStats: (data) => ipcRenderer.invoke("save-local-stats", data),
  getLocalStats: (data) => ipcRenderer.invoke("get-local-stats", data),

  // Logger & Error Reporting
  logger: {
    log: ({ level, message, data }) =>
      ipcRenderer.invoke("logger:log", { level, message, data }),
    getLogs: ({ lines = 100 }) =>
      ipcRenderer.invoke("logger:getLogs", { lines }),
    getSystemInfo: () =>
      ipcRenderer.invoke("logger:getSystemInfo"),
    exportBugReport: ({ description, userEmail }) =>
      ipcRenderer.invoke("logger:exportBugReport", { description, userEmail }),
    openLogsFolder: () =>
      ipcRenderer.invoke("logger:openLogsFolder"),
  },

  // Crash Reporting (Discord webhook)
  crashReport: {
    send: ({ error, componentStack, context }) =>
      ipcRenderer.invoke("crashReport:send", { error, componentStack, context }),
    sendManual: ({ description, context }) =>
      ipcRenderer.invoke("crashReport:send", { description, context }),
  },

  // Auto Updater
  updater: {
    checkForUpdates: () =>
      ipcRenderer.invoke("updater:checkForUpdates"),
    downloadAndInstall: () =>
      ipcRenderer.invoke("updater:downloadAndInstall"),
    quitAndInstall: () =>
      ipcRenderer.invoke("updater:quitAndInstall"),
    getStatus: () =>
      ipcRenderer.invoke("updater:getStatus"),
    skipVersion: ({ version }) =>
      ipcRenderer.invoke("updater:skipVersion", { version }),
    // Event listeners for update events
    onChecking: (callback) => {
      ipcRenderer.removeAllListeners("updater:checking");
      ipcRenderer.on("updater:checking", (_event) => callback());
    },
    onUpdateAvailable: (callback) => {
      ipcRenderer.removeAllListeners("updater:update-available");
      ipcRenderer.on("updater:update-available", (_event, data) => callback(data));
    },
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.removeAllListeners("updater:update-not-available");
      ipcRenderer.on("updater:update-not-available", (_event, data) => callback(data));
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.removeAllListeners("updater:download-progress");
      ipcRenderer.on("updater:download-progress", (_event, data) => callback(data));
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.removeAllListeners("updater:update-downloaded");
      ipcRenderer.on("updater:update-downloaded", (_event, data) => callback(data));
    },
    onError: (callback) => {
      ipcRenderer.removeAllListeners("updater:error");
      ipcRenderer.on("updater:error", (_event, data) => callback(data));
    },
  },

  // Create a desktop shortcut
  createShortcut: ({ gameName, gamePath, executable }) =>
    ipcRenderer.invoke("createShortcut", { gameName, gamePath, executable }),

  // App-level settings
  app: {
    getLoginItem: () => ipcRenderer.invoke("app:getLoginItem"),
    setLoginItem: (openAtLogin) => ipcRenderer.invoke("app:setLoginItem", openAtLogin),
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  windowToggleDevTools: () => ipcRenderer.send("window-toggle-devtools"),

  // Reload the application completely
  reloadApp: () => ipcRenderer.send("reload-app"),

  // Native notifications
  notification: {
    show: ({ title, body }) =>
      ipcRenderer.invoke("notification:show", { title, body }),
  },

  // Mod management
  mods: {
    downloadMod: ({ modId, gameId }) =>
      ipcRenderer.invoke("mod:download", { modId, gameId }),
    deleteModFile: ({ modId }) =>
      ipcRenderer.invoke("mod:deleteFile", { modId }),
    onDownloadProgress: (callback) => {
      ipcRenderer.removeAllListeners("mod:downloadProgress");
      ipcRenderer.on("mod:downloadProgress", (_event, data) => callback(data));
    },
    removeDownloadProgressListener: () => {
      ipcRenderer.removeAllListeners("mod:downloadProgress");
    },
  },
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("store", {
      get: (key) => ipcRenderer.invoke("store-get", key),
      set: (key, value) => ipcRenderer.invoke("store-set", key, value),
      delete: (key) => ipcRenderer.invoke("store-delete", key),
      clear: () => ipcRenderer.invoke("store-clear"),
    });
    contextBridge.exposeInMainWorld("electron", {
      shell: {
        openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
      },
    });

  } catch (error) {
    console.error("[Preload] Erreur lors de l'exposition des APIs:", error);
  }
} else {
  // Fallback if contextIsolation is disabled
  window.api = api;
  window.store = {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value),
    delete: (key) => ipcRenderer.invoke("store-delete", key),
    clear: () => ipcRenderer.invoke("store-clear"),
  };
  console.warn("[Preload] APIs exposées sans contextIsolation");
}
