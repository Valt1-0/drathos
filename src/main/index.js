// Fichier: drathos/src/main/index.js

import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  dialog,
} from "electron";
import path, { join } from "path";
import fs from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/logo2.png?asset";

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "Drathos",
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    show: false,
    frames: true,
    autoHideMenuBar: false,
    icon: icon,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      nodeIntegrationInWorker: true,
    },

    titleBarStyle: "",
    titleBarOverlay: {
      color: "#2f3241",
      symbolColor: "#74b1be",
      height: 20,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  //* IPC test
  //* ipcMain.on("ping", () => console.log("pong"));

  createWindow();

  // Create a tray icon
  let tray = null;
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Item1", type: "radio" },
    { label: "Item2", type: "radio" },
    { label: "Item3", type: "radio", checked: true },
    { label: "Item4", type: "radio" },
  ]);
  tray.setToolTip("Drathos");
  tray.setContextMenu(contextMenu);

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

//* Store
import store from "./store";

ipcMain.handle("store-get", (event, key) => {
  return store.get(key);
});

ipcMain.handle("store-set", (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle("store-delete", (event, key) => {
  store.delete(key);
});

ipcMain.handle("store-clear", () => {
  store.clear();
});

//* Open file dialog */
ipcMain.handle("dialog:selectAndCreate", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled || !result.filePaths.length) return null;

  const basePath = result.filePaths[0];
  const subfolder = path.join(basePath, "DrathosGames");

  if (!fs.existsSync(subfolder)) {
    fs.mkdirSync(subfolder);
  }

  return subfolder;
});

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

//* Install game */

import workerPath from "./installWorker.js?modulePath";
import { Worker } from "node:worker_threads";

ipcMain.handle("installGame", async (event, { serverGame }) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { serverGame, storeData: store.store },
    });

    worker.on("message", (data) => {
      event.sender.send("downloadProgress", { id: serverGame._id, ...data });

      if (data.stage === "Completed") resolve({ success: true });
      if (data.stage === "Failed") reject(new Error(data.error));
    });

    worker.on("error", (err) => {
      event.sender.send("downloadProgress", {
        id: serverGame._id,
        progress: 0,
        stage: "Failed",
        error: err.message,
      });
      reject(err);
    });
  });
});

import { GameLauncher } from "./gameLauncher.js";

// Instance globale du lanceur
const gameLauncher = new GameLauncher();

// Handler pour lancer un jeu
ipcMain.handle("launchGame", async (event, gameConfig) => {
  return await gameLauncher.launchGame(
    gameConfig.gameData,
    gameConfig.installedPath,
    (status) => {
      // Envoyer les mises à jour de statut au renderer
      event.sender.send("gameStatusChanged", status);
    }
  );
});

// Handler pour arrêter un jeu
ipcMain.handle("stopGame", async (event, { gameId, force = false }) => {
  return await gameLauncher.stopGame(gameId, force);
});

// Handler pour obtenir les jeux actifs
ipcMain.handle("getActiveGames", () => {
  return gameLauncher.getActiveGames();
});

// Nettoyage à la fermeture
app.on("before-quit", () => {
  gameLauncher.cleanup();
});
