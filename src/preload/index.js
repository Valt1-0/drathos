import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom APIs for renderer
const api = {
  selectAndCreateFolder: (subfolderName) =>
    ipcRenderer.invoke("dialog:selectAndCreate", subfolderName),
  selectFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  installGame: (game) =>
    ipcRenderer.invoke("installGame", { serverGame: game }),
  onDownloadProgress: (callback) =>
    ipcRenderer.on("downloadProgress", (_event, data) => callback(data)),

  launchGame: (gameData, installedPath) =>
    ipcRenderer.invoke("launchGame", { gameData, installedPath }),
  stopGame: (gameId, force = false) =>
    ipcRenderer.invoke("stopGame", { gameId, force }),
  getActiveGames: () =>
    ipcRenderer.invoke("getActiveGames"),
  onGameStatusChanged: (callback) =>
    ipcRenderer.on("gameStatusChanged", (_event, data) => callback(data)),
  listGameFiles: (gameId) =>
    ipcRenderer.invoke("listGameFiles", gameId),
  configureExecutable: (gameId, config) =>
    ipcRenderer.invoke("configureExecutable", { gameId, config }),
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
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
