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

// Import du détecteur
import { SimpleExecutableDetector } from "./simpleExecutableDetector.js";

// Instance unique du détecteur
let detectorInstance = null;
const getDetector = () => {
  if (!detectorInstance) {
    detectorInstance = new SimpleExecutableDetector();
  }
  return detectorInstance;
};

// === HANDLERS DE JEUX (VERSION PROPRE) ===

// Handler unique pour obtenir le meilleur exécutable
ipcMain.handle("getBestExecutable", async (event, { gamePath, gameName }) => {
  console.log(`[IPC-Clean] Recherche exécutable pour: ${gameName}`);
  console.log(`[IPC-Clean] Dans le dossier: ${gamePath}`);

  try {
    const detector = getDetector();
    const executable = await detector.getBestExecutable(gamePath, gameName);

    if (executable) {
      console.log(`[IPC-Clean] ✅ Exécutable trouvé: ${executable}`);
    } else {
      console.log(`[IPC-Clean] ❌ Aucun exécutable trouvé`);
    }

    return {
      success: executable !== null,
      executable: executable,
    };
  } catch (error) {
    console.error("[IPC-Clean] ❌ Erreur détection:", error);
    return {
      success: false,
      error: error.message,
      executable: null,
    };
  }
});

// Handler pour détecter tous les exécutables (debug)
ipcMain.handle("detectExecutables", async (event, { gamePath, gameName }) => {
  console.log(`[IPC-Clean] Liste complète des exécutables pour: ${gameName}`);

  try {
    const detector = getDetector();
    const executables = await detector.listAllExecutables(gamePath, gameName);

    console.log(`[IPC-Clean] Trouvé ${executables.length} exécutable(s):`);
    executables.forEach((exe, i) => {
      console.log(`  ${i + 1}. ${exe.relativePath} (score: ${exe.score})`);
    });

    return {
      success: true,
      executables: executables,
    };
  } catch (error) {
    console.error("[IPC-Clean] Erreur liste exécutables:", error);
    return {
      success: false,
      error: error.message,
      executables: [],
    };
  }
});

// Handler principal pour lancer un jeu
ipcMain.handle("launchGame", async (event, params) => {
  console.log("\n[IPC-Clean] === DEMANDE DE LANCEMENT ===");
  console.log("[IPC-Clean] Paramètres reçus:", JSON.stringify(params, null, 2));

  try {
    let gameId, gamePath, executableName, gameName;

    console.log("[IPC-Clean] Analyse des paramètres...");

    if (params.gameData) {
      console.log("[IPC-Clean] Structure avec gameData détectée");

      // Cas 1: Double wrapping gameData.gameData
      if (params.gameData.gameData) {
        console.log(
          "[IPC-Clean] Double wrapping détecté - extraction niveau 2"
        );
        const data = params.gameData.gameData;
        gameId = data.gameId || data._id;
        gamePath = data.gamePath;
        executableName = data.executableName;
        gameName = data.gameName || data.name;
      }
      // Cas 2: Simple wrapping gameData
      else {
        console.log(
          "[IPC-Clean] Simple wrapping détecté - extraction niveau 1"
        );
        const data = params.gameData;
        gameId = data.gameId || data._id;
        gamePath = data.gamePath || params.installedPath;
        executableName =
          data.executableName || (data.executable && data.executable.fileName);
        gameName = data.gameName || data.name;
      }
    }
    // Cas 3: Format direct à la racine
    else {
      console.log("[IPC-Clean] Format direct détecté");
      gameId = params.gameId;
      gamePath = params.gamePath;
      executableName = params.executableName;
      gameName = params.gameName;
    }

    // Vérifications des paramètres essentiels
    if (!gameId) {
      throw new Error("gameId manquant dans les paramètres");
    }

    if (!gamePath) {
      throw new Error("gamePath manquant dans les paramètres");
    }

    console.log(
      `[IPC-Clean] Jeu: ${gameName || "Nom inconnu"} (ID: ${gameId})`
    );
    console.log(`[IPC-Clean] Dossier: ${gamePath}`);
    console.log(`[IPC-Clean] Exécutable spécifié: ${executableName || "NON"}`);

    // Si aucun exécutable spécifié, détecter automatiquement
    if (!executableName) {
      console.log("[IPC-Clean] 🔍 Détection automatique de l'exécutable...");
      const detector = getDetector();
      executableName = await detector.getBestExecutable(
        gamePath,
        gameName || ""
      );

      if (executableName) {
        console.log(`[IPC-Clean] ✅ Exécutable détecté: ${executableName}`);
      } else {
        throw new Error(
          "Impossible de détecter automatiquement l'exécutable du jeu"
        );
      }
    }

    // Construire le chemin complet vers l'exécutable
    const executablePath = path.join(gamePath, executableName);
    console.log(`[IPC-Clean] Chemin complet: ${executablePath}`);

    // Vérifier que le fichier existe
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Fichier exécutable introuvable: ${executablePath}`);
    }

    // Déterminer le répertoire de travail (dossier de l'exe)
    const workingDirectory = path.dirname(executablePath);
    console.log(`[IPC-Clean] Répertoire de travail: ${workingDirectory}`);

    // Lancer le processus
    console.log("[IPC-Clean] 🚀 Lancement du processus...");
    const { spawn } = require("child_process");

    const gameProcess = spawn(executablePath, [], {
      cwd: workingDirectory,
      detached: true, // Le processus continue même si l'app se ferme
      stdio: ["ignore", "pipe", "pipe"], // Capturer stdout/stderr pour debug
    });

    // Gestion des événements du processus
    gameProcess.on("spawn", () => {
      console.log(
        `[IPC-Clean] ✅ Processus lancé avec PID: ${gameProcess.pid}`
      );

      // Notifier le renderer
      event.sender.send("gameStatusChanged", {
        gameId,
        status: "running",
        pid: gameProcess.pid,
        startTime: Date.now(),
      });
    });

    gameProcess.on("error", (error) => {
      console.error(`[IPC-Clean] ❌ Erreur du processus:`, error);

      event.sender.send("gameStatusChanged", {
        gameId,
        status: "failed",
        error: error.message,
      });
    });

    gameProcess.on("exit", (code, signal) => {
      console.log(
        `[IPC-Clean] 🛑 Processus terminé (code: ${code}, signal: ${signal})`
      );

      event.sender.send("gameStatusChanged", {
        gameId,
        status: "stopped",
        exitCode: code,
        signal: signal,
      });
    });

    // Capturer les logs du jeu (pour debug)
    gameProcess.stdout?.on("data", (data) => {
      console.log(`[Game-${gameId}] ${data.toString().trim()}`);
    });

    gameProcess.stderr?.on("data", (data) => {
      console.log(`[Game-${gameId}] ERROR: ${data.toString().trim()}`);
    });

    // Détacher le processus pour qu'il survive à la fermeture de l'app
    gameProcess.unref();

    console.log("[IPC-Clean] ✅ Lancement initié avec succès");
    console.log("[IPC-Clean] === FIN LANCEMENT ===\n");

    return {
      success: true,
      pid: gameProcess.pid,
      message: `Jeu ${gameName || gameId} lancé avec succès`,
    };
  } catch (error) {
    console.error("[IPC-Clean] ❌ ERREUR LANCEMENT:", error.message);
    console.error("[IPC-Clean] Stack:", error.stack);

    // Notifier le renderer de l'échec
    const gameId =
      params.gameId ||
      (params.gameData && (params.gameData.gameId || params.gameData._id));
    if (gameId) {
      event.sender.send("gameStatusChanged", {
        gameId,
        status: "failed",
        error: error.message,
      });
    }

    return {
      success: false,
      error: error.message,
    };
  }
});

// Handlers pour les autres fonctionnalités (stubs pour l'instant)
ipcMain.handle("stopGame", async (event, { gameId, force = false }) => {
  console.log(`[IPC-Clean] Demande d'arrêt pour ${gameId} (force: ${force})`);
  // TODO: Implémenter l'arrêt des jeux
  return { success: false, message: "Arrêt pas encore implémenté" };
});

ipcMain.handle("getActiveGames", () => {
  // TODO: Retourner la liste des jeux actifs
  return [];
});

ipcMain.handle("isGameRunning", (event, gameId) => {
  // TODO: Vérifier si un jeu est en cours
  return false;
});

ipcMain.handle("openGameFolder", (event, gamePath) => {
  try {
    shell.openPath(gamePath);
    console.log(`[IPC-Clean] Dossier ouvert: ${gamePath}`);
    return { success: true };
  } catch (error) {
    console.error(`[IPC-Clean] Erreur ouverture dossier:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("getGameProcess", (event, gameId) => {
  // TODO: Retourner les infos du processus
  return null;
});
