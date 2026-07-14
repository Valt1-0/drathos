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
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("downloadProgress", listener);
    return () => ipcRenderer.removeListener("downloadProgress", listener);
  },
  cancelDownload: (gameId) => ipcRenderer.invoke("cancelDownload", { gameId }),
  pauseDownload: (gameId) => ipcRenderer.invoke("pauseDownload", { gameId }),
  resumeDownload: (gameId) => ipcRenderer.invoke("resumeDownload", { gameId }),

  launchGame: (gameData, installedPath) =>
    ipcRenderer.invoke("launchGame", { gameData, installedPath }),
  getActiveGames: () => ipcRenderer.invoke("getActiveGames"),
  onGameStatusChanged: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("gameStatusChanged", listener);
    return () => ipcRenderer.removeListener("gameStatusChanged", listener);
  },
  // Detect all executables in a game folder
  detectExecutables: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("detectExecutables", { gamePath, gameName }),
  // Get the best executable for a game
  getBestExecutable: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("getBestExecutable", { gamePath, gameName }),
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
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("uninstallProgress", listener);
    return () => ipcRenderer.removeListener("uninstallProgress", listener);
  },

  // Get the size of a game
  getGameSize: ({ gamePath }) =>
    ipcRenderer.invoke("getGameSize", { gamePath }),

  // Get free disk space
  getDiskSpace: (path) => ipcRenderer.invoke("getDiskSpace", path),

  onSaveGameStats: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("save-game-stats", listener);
    return () => ipcRenderer.removeListener("save-game-stats", listener);
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
    // Event listeners for update events — each returns an unsubscribe function
    onChecking: (callback) => {
      const listener = () => callback();
      ipcRenderer.on("updater:checking", listener);
      return () => ipcRenderer.removeListener("updater:checking", listener);
    },
    onUpdateAvailable: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("updater:update-available", listener);
      return () => ipcRenderer.removeListener("updater:update-available", listener);
    },
    onUpdateNotAvailable: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("updater:update-not-available", listener);
      return () => ipcRenderer.removeListener("updater:update-not-available", listener);
    },
    onDownloadProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("updater:download-progress", listener);
      return () => ipcRenderer.removeListener("updater:download-progress", listener);
    },
    onUpdateDownloaded: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("updater:update-downloaded", listener);
      return () => ipcRenderer.removeListener("updater:update-downloaded", listener);
    },
    onError: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("updater:error", listener);
      return () => ipcRenderer.removeListener("updater:error", listener);
    },
  },

  // Create a desktop shortcut
  createShortcut: ({ gameName, gamePath, executable }) =>
    ipcRenderer.invoke("createShortcut", { gameName, gamePath, executable }),

  // App-level settings
  app: {
    getLoginItem: () => ipcRenderer.invoke("app:getLoginItem"),
    setLoginItem: (openAtLogin) => ipcRenderer.invoke("app:setLoginItem", openAtLogin),
    getDefaultDownloadDir: () => ipcRenderer.invoke("app:getDefaultDownloadDir"),
    getDisplays: () => ipcRenderer.invoke("app:getDisplays"),
  },

  // Window controls
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  windowToggleDevTools: () => ipcRenderer.send("window-toggle-devtools"),

  // Reload the application completely
  reloadApp: () => ipcRenderer.send("reload-app"),

  // Copy text to the system clipboard (main-process clipboard module)
  copyToClipboard: (text) => ipcRenderer.invoke("clipboard:writeText", text),

  // Certificate pinning
  security: {
    resetServerTrust: () => ipcRenderer.invoke("security:resetServerTrust"),
    onCertificateChanged: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("security:certificate-changed", listener);
      return () => ipcRenderer.removeListener("security:certificate-changed", listener);
    },
  },

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
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("mod:downloadProgress", listener);
      return () => ipcRenderer.removeListener("mod:downloadProgress", listener);
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
      get: (key, defaultValue) => ipcRenderer.invoke("store-get", key, defaultValue),
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
    console.error("[Preload] Error exposing APIs:", error);
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
  console.warn("[Preload] APIs exposed without contextIsolation");
}
