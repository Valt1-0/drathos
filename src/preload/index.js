import { contextBridge } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
import { loadData, saveData, clearData } from "../main/storage.js";

// Custom APIs for renderer
const api = {};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("secureStorage", {
      get: (key) => {
        const data = loadData();
        return data[key];
      },
      set: (key, value) => {
        const data = loadData();
        data[key] = value;
        saveData(data);
      },
      delete: (key) => {
        const data = loadData();
        delete data[key];
        saveData(data);
      },
      clear: () => {
        clearData();
      },
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
