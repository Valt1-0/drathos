// drathos/src/preload/index.js

import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
  // === APIS EXISTANTES (inchangées) ===
  selectAndCreateFolder: (subfolderName) =>
    ipcRenderer.invoke("dialog:selectAndCreate", subfolderName),
  selectFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  installGame: (game) =>
    ipcRenderer.invoke("installGame", { serverGame: game }),
  onDownloadProgress: (callback) =>
    ipcRenderer.on("downloadProgress", (_event, data) => callback(data)),

  launchGame: (gameData, installedPath) =>
    ipcRenderer.invoke("launchGame", { gameData, installedPath }),
  getActiveGames: () => ipcRenderer.invoke("getActiveGames"),
  onGameStatusChanged: (callback) =>
    ipcRenderer.on("gameStatusChanged", (_event, data) => callback(data)),
  listGameFiles: (gameId) => ipcRenderer.invoke("listGameFiles", gameId),
  configureExecutable: (gameId, config) =>
    ipcRenderer.invoke("configureExecutable", { gameId, config }),

  // Détecter tous les exécutables dans un dossier de jeu
  detectExecutables: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("detectExecutables", { gamePath, gameName }),
  // Obtenir le meilleur exécutable pour un jeu
  getBestExecutable: ({ gamePath, gameName }) =>
    ipcRenderer.invoke("getBestExecutable", { gamePath, gameName }),
  // Vérifier si un fichier est exécutable
  isFileExecutable: (filePath) =>
    ipcRenderer.invoke("isFileExecutable", filePath),
  // Lister le contenu d'un dossier de jeu
  listGameDirectory: (gamePath) =>
    ipcRenderer.invoke("listGameDirectory", gamePath),
  // Ouvrir le dossier d'un jeu
  openGameFolder: (gamePath) => ipcRenderer.invoke("openGameFolder", gamePath),
  // Lister le contenu d'une archive (zip, 7z, rar, tar, etc.)
  listArchiveFiles: (filePath) => ipcRenderer.invoke("listArchiveFiles", filePath),
  // Sélectionner et scanner une archive (pour les jeux)
  selectAndScanArchive: () => ipcRenderer.invoke("selectAndScanArchive"),
  // Sélectionner un fichier archive (pour les mods - sans scan)
  selectArchiveFile: () => ipcRenderer.invoke("selectArchiveFile"),
  // Lire un fichier archive en tant que buffer
  readArchiveFile: (filePath) => ipcRenderer.invoke("readArchiveFile", filePath),
  // Obtenir les infos d'un processus de jeu
  getGameProcess: (gameId) => ipcRenderer.invoke("getGameProcess", gameId),
  // Vérifier si un jeu est en cours
  isGameRunning: (gameId) => ipcRenderer.invoke("isGameRunning", gameId),

  // Arrêter un jeu normalement
  stopGame: ({ gameId, force = false }) =>
    ipcRenderer.invoke("stopGame", { gameId, force }),

  // Arrêter un jeu de force
  forceStopGame: ({ gameId }) =>
    ipcRenderer.invoke("forceStopGame", { gameId }),

  // Désinstaller un jeu
  uninstallGame: ({ gameId, gamePath, gameName }) =>
    ipcRenderer.invoke("uninstallGame", { gameId, gamePath, gameName }),

  // Vérifier si un jeu peut être désinstallé
  canUninstallGame: ({ gameId, gamePath }) =>
    ipcRenderer.invoke("canUninstallGame", { gameId, gamePath }),

  // Écouter la progression de désinstallation
  onUninstallProgress: (callback) =>
    ipcRenderer.on("uninstallProgress", (_event, data) => callback(data)),

  // Obtenir la taille d'un jeu
  getGameSize: ({ gamePath }) =>
    ipcRenderer.invoke("getGameSize", { gamePath }),

  // Obtenir l'espace disque libre
  getDiskSpace: () => ipcRenderer.invoke("getDiskSpace"),

  onSaveGameStats: (callback) => {
    ipcRenderer.removeAllListeners("save-game-stats");
    ipcRenderer.on("save-game-stats", (_event, data) => {
      console.log("[Preload] 📡 Event save-game-stats reçu:", data);
      // Ne jamais passer l'objet event au renderer pour éviter l'exposition de ipcRenderer
      callback(data);
    });
  },

  saveLocalStats: (data) => ipcRenderer.invoke("save-local-stats", data),
  getLocalStats: (data) => ipcRenderer.invoke("get-local-stats", data),

  // Discord Rich Presence
  discordRPC: {
    initialize: ({ enabled }) =>
      ipcRenderer.invoke("discord-rpc:initialize", { enabled }),
    setEnabled: ({ enabled }) =>
      ipcRenderer.invoke("discord-rpc:setEnabled", { enabled }),
    getStatus: () => ipcRenderer.invoke("discord-rpc:getStatus"),
    disconnect: () => ipcRenderer.invoke("discord-rpc:disconnect"),
  },

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

  // Contrôles de fenêtre
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  windowToggleDevTools: () => ipcRenderer.send("window-toggle-devtools"),

  // Recharger l'application complètement
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

    console.log("[Preload] ✅ APIs exposées avec succès (sandbox mode)");
    console.log("[Preload] APIs disponibles:", [
      "window.api (game management)",
      "window.store (local storage)",
    ]);
  } catch (error) {
    console.error("❌ Erreur lors de l'exposition des APIs:", error);
  }
} else {
  // Fallback si contextIsolation est désactivé
  window.api = api;
  window.store = {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value),
    delete: (key) => ipcRenderer.invoke("store-delete", key),
    clear: () => ipcRenderer.invoke("store-clear"),
  };
  console.log("[Preload] ⚠️ APIs exposées sans contextIsolation");
}
