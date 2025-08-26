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

import { GameLauncher } from "./gameLauncher.js";
const gameLauncher = new GameLauncher();

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
  gameLauncher.cleanup();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Nettoyage à la fermeture de l'application
app.on("before-quit", () => {
  gameLauncher.cleanup();
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
  console.log(`[Main] 🚀 Installation demandée: ${serverGame.name}`);

  return new Promise((resolve, reject) => {
    // Créer le worker avec le nouveau système simplifié
    const worker = new Worker(workerPath, {
      workerData: {
        serverGame,
        storeData: store.store,
      },
    });

    // Écouter les messages de progression
    worker.on("message", (data) => {
      console.log(
        `[Main] 📊 Progression ${serverGame.name}:`,
        data.stage,
        `${data.progress}%`
      );

      // Envoyer la progression au renderer
      event.sender.send("downloadProgress", {
        id: serverGame._id,
        ...data,
      });

      // Gérer les états finaux
      if (data.stage === "Completed") {
        console.log(`[Main] ✅ Installation terminée: ${serverGame.name}`);
        resolve({ success: true, path: data.finalPath });
      }

      if (data.stage === "Failed") {
        console.error(
          `[Main] ❌ Installation échouée: ${serverGame.name} - ${data.error}`
        );
        reject(new Error(data.error));
      }
    });

    // Gérer les erreurs du worker
    worker.on("error", (err) => {
      console.error(`[Main] 💥 Erreur worker pour ${serverGame.name}:`, err);

      // Notifier le renderer
      event.sender.send("downloadProgress", {
        id: serverGame._id,
        progress: 0,
        stage: "Failed",
        error: err.message,
      });

      reject(err);
    });

    // Gérer la fermeture inattendue du worker
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(
          `[Main] ⚠️ Worker fermé avec code ${code} pour ${serverGame.name}`
        );
        reject(new Error(`Worker process exited with code ${code}`));
      }
    });
  });
});

// === GAME DETECTION ===
import { SimpleExecutableDetector } from "./simpleExecutableDetector.js";

let detectorInstance = null;
const getDetector = () => {
  if (!detectorInstance) {
    detectorInstance = new SimpleExecutableDetector();
  }
  return detectorInstance;
};

ipcMain.handle("getBestExecutable", async (event, { gamePath, gameName }) => {
  console.log(`[Main] Recherche du meilleur exécutable pour ${gameName}`);
  const detector = getDetector();

  try {
    const bestExecutable = await detector.getBestExecutable(gamePath, gameName);

    if (bestExecutable) {
      return {
        success: true,
        executable: bestExecutable,
        message: "Exécutable détecté avec succès",
      };
    } else {
      return {
        success: false,
        error: "Aucun exécutable trouvé",
        executable: null,
      };
    }
  } catch (error) {
    console.error(`[Main] Erreur lors de la détection:`, error);
    return {
      success: false,
      error: error.message,
      executable: null,
    };
  }
});

// === GAME MANAGEMENT - UTILISE UNIQUEMENT GameLauncher ===

/**
 * Lance un jeu - VERSION NETTOYÉE utilisant GameLauncher
 */
ipcMain.handle("launchGame", async (event, params) => {
  console.log(`[Main] === DEMANDE DE LANCEMENT ===`);
  console.log(`[Main] Paramètres reçus:`, JSON.stringify(params, null, 2));

  try {
    let gameId, gamePath, executableName, gameName;

    // Extraction flexible des paramètres selon le format
    if (params.gameId && params.gamePath && params.executableName) {
      // Format direct: { gameId, gamePath, executableName, gameName }
      gameId = params.gameId;
      gamePath = params.gamePath;
      executableName = params.executableName;
      gameName = params.gameName;
      console.log(`[Main] Format direct détecté`);
    } else if (params.gameData) {
      // Format avec wrapping gameData
      const data = params.gameData;
      gameId = data.gameId || data._id;
      gamePath = data.gamePath;
      executableName = data.executableName;
      gameName = data.gameName || data.name;
      console.log(`[Main] Format gameData détecté`);
    } else {
      // Essayer d'extraire depuis la racine des params
      gameId = params._id || params.id;
      gamePath = params.installedPath || params.path;
      executableName = params.executableName;
      gameName = params.name || params.title;
      console.log(`[Main] Format racine détecté`);
    }

    // Vérifications des paramètres essentiels
    if (!gameId) {
      throw new Error("gameId manquant dans les paramètres");
    }
    if (!gamePath) {
      throw new Error("gamePath manquant dans les paramètres");
    }

    console.log(`[Main] Jeu: ${gameName || "Nom inconnu"} (ID: ${gameId})`);
    console.log(`[Main] Dossier: ${gamePath}`);
    console.log(
      `[Main] Exécutable spécifié: ${executableName || "Détection automatique"}`
    );

    // Si aucun exécutable spécifié, détecter automatiquement
    if (!executableName) {
      console.log(`[Main] 🔍 Détection automatique de l'exécutable...`);
      const detector = getDetector();
      const bestExecutable = await detector.getBestExecutable(
        gamePath,
        gameName || ""
      );

      if (bestExecutable) {
        executableName = bestExecutable;
        console.log(`[Main] ✅ Exécutable détecté: ${executableName}`);
      } else {
        throw new Error(
          "Impossible de détecter automatiquement l'exécutable du jeu"
        );
      }
    }

    // Utiliser GameLauncher au lieu du code dupliqué
    const result = await gameLauncher.launchGame(
      gameId,
      gamePath,
      executableName,
      // Callback pour les changements d'état
      (statusData) => {
        event.sender.send("gameStatusChanged", statusData);
      }
    );

    console.log(`[Main] ✅ Résultat du lancement:`, result);
    return result;
  } catch (error) {
    console.error(`[Main] ❌ Erreur lors du lancement:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Arrête un jeu
 */
ipcMain.handle("stopGame", async (event, { gameId, force = false }) => {
  console.log(`[Main] Arrêt demandé pour ${gameId}`);
  return await gameLauncher.stopGame(gameId, force);
});

/**
 * Obtient la liste des jeux actifs
 */
ipcMain.handle("getActiveGames", () => {
  return gameLauncher.getActiveGames();
});

/**
 * Vérifie si un jeu est en cours d'exécution
 */
ipcMain.handle("isGameRunning", (event, { gameId }) => {
  return gameLauncher.isGameRunning(gameId);
});

/**
 * Ouvre le dossier du jeu
 */
ipcMain.handle("openGameFolder", (event, { gamePath }) => {
  return gameLauncher.openGameFolder(gamePath);
});

/**
 * Obtient les informations d'un processus
 */
ipcMain.handle("getGameProcess", (event, { gameId }) => {
  return gameLauncher.getGameProcess(gameId);
});

/**
 * Détecte tous les exécutables disponibles pour un jeu
 */
ipcMain.handle("detectExecutables", async (event, { gamePath, gameName }) => {
  console.log(`[Main] Détection de tous les exécutables pour ${gameName}`);
  const detector = getDetector();

  try {
    const executables = await detector.listAllExecutables(gamePath, gameName);

    return {
      success: true,
      executables: executables,
      count: executables.length,
    };
  } catch (error) {
    console.error(`[Main] Erreur lors de la détection:`, error);
    return {
      success: false,
      error: error.message,
      executables: [],
    };
  }
});

/**
 * Liste le contenu d'un dossier de jeu
 */
ipcMain.handle("listGameDirectory", async (event, { gamePath }) => {
  try {
    if (!fs.existsSync(gamePath)) {
      return {
        success: false,
        error: "Dossier non trouvé",
      };
    }

    const items = fs.readdirSync(gamePath);
    const files = [];
    const directories = [];

    for (const item of items) {
      const itemPath = path.join(gamePath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isFile()) {
        files.push({
          name: item,
          size: stats.size,
          isExecutable: item.toLowerCase().endsWith(".exe"),
        });
      } else if (stats.isDirectory()) {
        directories.push({
          name: item,
          path: itemPath,
        });
      }
    }

    return {
      success: true,
      files,
      directories,
      total: files.length + directories.length,
    };
  } catch (error) {
    console.error(`[Main] Erreur lors du listage:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});
