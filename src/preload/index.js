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
