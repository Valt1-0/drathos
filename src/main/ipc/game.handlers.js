/**
 * Game management IPC handlers
 */
import { ipcMain, BrowserWindow } from "electron";
import { Worker } from "node:worker_threads";
import fs from "fs";
import path from "path";
import store from "../store.js";
import { GameLauncher } from "../gameLauncher.js";
import { SimpleExecutableDetector } from "../simpleExecutableDetector.js";
import { isValidSender, isExecutableFile } from "../app/security.js";
import workerPath from "../installWorker.js?modulePath";
import logger from "../utils/logger.js";
import uninstallWorkerPath from "../uninstallWorker.js?modulePath";

const gameLauncher = new GameLauncher();
const activeWorkers = new Map();
const downloadProgressByGame = new Map();
let detector = null;

// Update the taskbar progress bar based on active downloads.
// Shows average progress across all active downloads; clears when none remain.
const syncTaskbarProgress = () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  if (downloadProgressByGame.size === 0) {
    win.setProgressBar(-1);
    return;
  }
  const avg = [...downloadProgressByGame.values()].reduce((a, b) => a + b, 0) / downloadProgressByGame.size;
  win.setProgressBar(avg / 100);
};

const getDetector = () => {
  if (!detector) detector = new SimpleExecutableDetector();
  return detector;
};

export const getGameLauncher = () => gameLauncher;

export const terminateAllWorkers = () => {
  for (const [, worker] of activeWorkers) {
    try { worker.terminate(); } catch {}
  }
  activeWorkers.clear();
};

export const registerGameHandlers = () => {
  // Installation
  ipcMain.handle("installGame", async (event, { serverGame }) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          serverGame,
          storeData: {
            serverAddress: store.get("serverAddress"),
            userToken: store.get("userToken"),
            downloadPath: store.get("downloadPath"),
            allowSelfSignedCerts: store.get("allowSelfSignedCerts"),
          },
        },
      });

      // Store the worker so we can send cancel/pause messages
      activeWorkers.set(serverGame._id, worker);

      worker.on("message", (data) => {
        if (data.type === "store-set") { store.set(data.key, data.value); return; }
        if (data.type === "log") { logger[data.level]?.(`[Worker] ${data.message}`); return; }

        event.sender.send("downloadProgress", { id: serverGame._id, ...data });

        // Taskbar progress bar
        const done = ["completed", "cancelled", "failed"].includes(data.stage?.toLowerCase());
        if (done) {
          downloadProgressByGame.delete(serverGame._id);
        } else if (typeof data.progress === "number") {
          downloadProgressByGame.set(serverGame._id, data.progress);
        }
        syncTaskbarProgress();

        if (data.stage === "Completed" || data.stage === "completed") {
          if (data.cacheData) {
            const cache = store.get("installedGamesCache") || {};
            cache[serverGame._id] = data.cacheData;
            store.set("installedGamesCache", cache);
          }
          resolve({ success: true, path: data.finalPath });
        }
        if (data.stage === "cancelled") {
          resolve({ success: false, error: "CANCELLED" });
        }
        if (data.stage === "Failed" || data.stage === "failed") reject(new Error(data.error));
      });

      worker.on("error", (err) => {
        event.sender.send("downloadProgress", { id: serverGame._id, progress: 0, stage: "Failed", error: err.message });
        reject(err);
      });

      worker.on("exit", (code) => {
        activeWorkers.delete(serverGame._id);
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  // Download controls
  ipcMain.handle("cancelDownload", async (event, { gameId }) => {
    const worker = activeWorkers.get(gameId);
    if (worker) {
      worker.postMessage({ type: "cancel" });
      setTimeout(() => {
        if (activeWorkers.has(gameId)) {
          worker.terminate();
          activeWorkers.delete(gameId);
        }
      }, 3000);
    }
    return { success: true };
  });

  ipcMain.handle("pauseDownload", async (event, { gameId }) => {
    const worker = activeWorkers.get(gameId);
    if (worker) {
      worker.postMessage({ type: "pause" });
    }
    return { success: true };
  });

  ipcMain.handle("resumeDownload", async (event, { gameId }) => {
    const worker = activeWorkers.get(gameId);
    if (worker) {
      worker.postMessage({ type: "resume" });
    }
    return { success: true };
  });

  // Detection
  ipcMain.handle("getBestExecutable", async (_, { gamePath, gameName }) => {
    try {
      const exe = await getDetector().getBestExecutable(gamePath, gameName);
      return exe ? { success: true, executable: exe } : { success: false, error: "No executable found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("detectExecutables", async (_, { gamePath, gameName }) => {
    try {
      const exes = await getDetector().listAllExecutables(gamePath, gameName);
      return { success: true, executables: exes, count: exes.length };
    } catch (error) {
      return { success: false, error: error.message, executables: [] };
    }
  });

  // Launch
  ipcMain.handle("launchGame", async (event, params) => {
    try {
      let { gameId, gamePath, executableName, gameName } = params.gameData || params;
      gameId = gameId || params._id || params.id;
      gamePath = gamePath || params.installedPath || params.path;
      gameName = gameName || params.name || params.title;

      if (!gameId || !gamePath) throw new Error("Missing gameId or gamePath");

      if (!executableName) {
        executableName = await getDetector().getBestExecutable(gamePath, gameName || "");
        if (!executableName) throw new Error("Cannot detect executable");
      }

      return await gameLauncher.launchGame(gameId, gamePath, executableName,
        (status) => event.sender.send("gameStatusChanged", status), store);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("getActiveGames", () => gameLauncher.getActiveGames());
  ipcMain.handle("isGameRunning", (_, { gameId }) => gameLauncher.isGameRunning(gameId));
  ipcMain.handle("openGameFolder", (_, gamePath) => gameLauncher.openGameFolder(gamePath));
  ipcMain.handle("getGameProcess", (_, { gameId }) => gameLauncher.getGameProcess(gameId));

  // Stop
  ipcMain.handle("stopGame", async (_, { gameId, force = false }) => gameLauncher.stopGame(gameId, force));
  ipcMain.handle("forceStopGame", async (_, { gameId }) => gameLauncher.stopGame(gameId, true));

  // Directory listing
  ipcMain.handle("listGameDirectory", async (_, { gamePath }) => {
    try {
      await fs.promises.access(gamePath);
      const items = await fs.promises.readdir(gamePath);
      const files = [], directories = [];

      await Promise.all(items.map(async (item) => {
        try {
          const itemPath = path.join(gamePath, item);
          const stats = await fs.promises.stat(itemPath);
          if (stats.isFile()) files.push({ name: item, size: stats.size, isExecutable: isExecutableFile(item) });
          else if (stats.isDirectory()) directories.push({ name: item, path: itemPath });
        } catch {}
      }));

      return { success: true, files, directories, total: files.length + directories.length };
    } catch {
      return { success: false, error: "Directory not found" };
    }
  });

  // Uninstall
  ipcMain.handle("uninstallGame", async (event, { gameId, gamePath, gameName }) => {
    if (!isValidSender(event.senderFrame)) throw new Error("Unauthorized");

    if (gameLauncher.isGameRunning(gameId)) {
      await gameLauncher.stopGame(gameId, true);
      await new Promise(r => setTimeout(r, 2000));
    }

    return new Promise((resolve, reject) => {
      const worker = new Worker(uninstallWorkerPath, {
        workerData: {
          gameId,
          gamePath,
          storeData: {
            serverAddress: store.get("serverAddress"),
            userToken: store.get("userToken"),
            allowSelfSignedCerts: store.get("allowSelfSignedCerts"),
          },
        },
      });

      worker.on("message", async (data) => {
        if (data.type === "log") { logger[data.level]?.(`[Worker] ${data.message}`); return; }
        event.sender.send("uninstallProgress", { id: gameId, ...data });

        if (data.stage === "uninstalled") {
          // Clean mods
          const installedMods = store.get("installedMods") || {};
          if (installedMods[gameId]) {
            for (const [modId, modInfo] of Object.entries(installedMods[gameId])) {
              if (modInfo?.path) {
                await fs.promises.rm(modInfo.path, { recursive: true, force: true }).catch(() => {});
              }
            }
            delete installedMods[gameId];
            store.set("installedMods", installedMods);
          }

          // Clean cache
          const cache = store.get("installedGamesCache", {});
          if (cache[gameId]) { delete cache[gameId]; store.set("installedGamesCache", cache); }

          resolve({ success: true });
        }
        if (data.stage === "failed") reject(new Error(data.error));
      });

      worker.on("error", (err) => {
        event.sender.send("uninstallProgress", { id: gameId, progress: 0, stage: "Failed", error: err.message });
        reject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  ipcMain.handle("canUninstallGame", async (_, { gameId, gamePath }) => {
    try {
      await fs.promises.access(gamePath);
      const isRunning = gameLauncher.isGameRunning(gameId);
      return { canUninstall: true, isRunning, warning: isRunning ? "Game will be closed" : null };
    } catch {
      return { canUninstall: false, reason: "Directory not found" };
    }
  });

  ipcMain.handle("getGameSize", async (_, { gamePath }) => {
    try {
      await fs.promises.access(gamePath);
      const counter = { files: 0, truncated: false };
      const size = await calculateDirectorySize(gamePath, 0, counter);
      if (counter.truncated) logger.warn(`[getGameSize] Size truncated at ${DIR_SIZE_MAX_FILES} files for ${gamePath}`);
      return { success: true, sizeBytes: size, sizeMB: Math.round(size / (1024 * 1024)),
        sizeGB: Math.round((size / (1024 ** 3)) * 10) / 10, truncated: counter.truncated };
    } catch {
      return { success: false, error: "Directory not found" };
    }
  });
};

const DIR_SIZE_MAX_DEPTH = 12;
const DIR_SIZE_MAX_FILES = 50_000;

async function calculateDirectorySize(dirPath, depth = 0, counter = { files: 0, truncated: false }) {
  if (depth > DIR_SIZE_MAX_DEPTH || counter.files >= DIR_SIZE_MAX_FILES) {
    counter.truncated = true;
    return 0;
  }
  try {
    const items = await fs.promises.readdir(dirPath);
    const sizes = await Promise.all(items.map(async (item) => {
      if (counter.files >= DIR_SIZE_MAX_FILES) {
        counter.truncated = true;
        return 0;
      }
      try {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(itemPath);
        if (stats.isDirectory()) {
          return calculateDirectorySize(itemPath, depth + 1, counter);
        }
        counter.files++;
        return stats.size;
      } catch {
        return 0;
      }
    }));
    return sizes.reduce((sum, s) => sum + s, 0);
  } catch (err) {
    logger.warn(`[getGameSize] Cannot read directory ${dirPath}: ${err.message}`);
    return 0;
  }
}
