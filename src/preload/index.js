// drathos/src/preload/index.js

import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

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

  onSaveGameStats: (callback) => {
    ipcRenderer.removeAllListeners("save-game-stats");
    ipcRenderer.on("save-game-stats", (event, data) => {
      console.log("[Preload] 📡 Event save-game-stats reçu:", data);
      callback(event, data);
    });
  },

  saveLocalStats: (data) => ipcRenderer.invoke("save-local-stats", data),
  getLocalStats: (data) => ipcRenderer.invoke("get-local-stats", data),

  // Contrôles de fenêtre
  windowMinimize: () => ipcRenderer.send("window-minimize"),
  windowMaximize: () => ipcRenderer.send("window-maximize"),
  windowClose: () => ipcRenderer.send("window-close"),
  windowIsMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  windowToggleDevTools: () => ipcRenderer.send("window-toggle-devtools"),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("store", {
      get: (key) => ipcRenderer.invoke("store-get", key),
      set: (key, value) => ipcRenderer.invoke("store-set", key, value),
      delete: (key) => ipcRenderer.invoke("store-delete", key),
      clear: () => ipcRenderer.invoke("store-clear"),
    });

    console.log("[Preload] APIs exposées avec succès");
    console.log("[Preload] Nouvelles APIs:", [
      "getBestExecutable",
      "detectExecutables",
      "openGameFolder",
    ]);
  } catch (error) {
    console.error("Erreur lors de l'exposition des APIs:", error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
  window.store = {
    get: (key) => ipcRenderer.invoke("store-get", key),
    set: (key, value) => ipcRenderer.invoke("store-set", key, value),
    delete: (key) => ipcRenderer.invoke("store-delete", key),
    clear: () => ipcRenderer.invoke("store-clear"),
  };
}
