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
import { isExecutableFile } from "../app/security.js";
import { secureHandle } from "./secureHandle.js";
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
  secureHandle("installGame", async (event, { serverGame }) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          serverGame,
          storeData: {
            serverAddress: store.get("serverAddress"),
            userToken: store.get("userToken"),
            downloadPath: store.get("downloadPath"),
          },
        },
      });

      // Store the worker so we can send cancel/pause messages
      activeWorkers.set(serverGame._id, worker);

      worker.on("message", (data) => {
        if (data.type === "store-set") { store.set(data.key, data.value); return; }
        if (data.type === "log") { logger[data.level]?.(`[Worker] ${data.message}`); return; }

        if (!event.sender.isDestroyed()) {
          event.sender.send("downloadProgress", { id: serverGame._id, ...data });
        }

        // Taskbar progress bar
        const done = ["completed", "cancelled", "failed"].includes(data.stage?.toLowerCase());
        if (done) {
          downloadProgressByGame.delete(serverGame._id);
        } else if (typeof data.progress === "number") {
          downloadProgressByGame.set(serverGame._id, data.progress);
        }
        syncTaskbarProgress();

        const stage = data.stage?.toLowerCase();
        if (stage === "completed") {
          if (data.cacheData) {
            const cache = store.get("installedGamesCache") || {};
            cache[serverGame._id] = data.cacheData;
            store.set("installedGamesCache", cache);
          }
          resolve({ success: true, path: data.finalPath });
        }
        if (stage === "cancelled") {
          resolve({ success: false, error: "CANCELLED" });
        }
        if (stage === "failed") reject(new Error(data.error));
      });

      worker.on("error", (err) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("downloadProgress", { id: serverGame._id, progress: 0, stage: "Failed", error: err.message });
        }
        reject(err);
      });

      worker.on("exit", (code) => {
        activeWorkers.delete(serverGame._id);
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  // Download controls
  secureHandle("cancelDownload", async (_event, { gameId }) => {
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

  secureHandle("pauseDownload", async (_event, { gameId }) => {
    const worker = activeWorkers.get(gameId);
    if (worker) {
      worker.postMessage({ type: "pause" });
    }
    return { success: true };
  });

  secureHandle("resumeDownload", async (_event, { gameId }) => {
    const worker = activeWorkers.get(gameId);
    if (worker) {
      worker.postMessage({ type: "resume" });
    }
    return { success: true };
  });

  // Detection
  secureHandle("getBestExecutable", async (_event, { gamePath, gameName }) => {
    try {
      const exe = await getDetector().getBestExecutable(gamePath, gameName);
      return exe ? { success: true, executable: exe } : { success: false, error: "No executable found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("detectExecutables", async (_event, { gamePath, gameName }) => {
    try {
      const exes = await getDetector().listAllExecutables(gamePath, gameName);
      return { success: true, executables: exes, count: exes.length };
    } catch (error) {
      return { success: false, error: error.message, executables: [] };
    }
  });

  // Launch
  secureHandle("launchGame", async (event, params) => {
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

  secureHandle("getActiveGames", () => gameLauncher.getActiveGames());
  secureHandle("isGameRunning", (_event, { gameId }) => gameLauncher.isGameRunning(gameId));
  secureHandle("openGameFolder", (_event, gamePath) =>
    gameLauncher.openGameFolder(gamePath)
  );
  secureHandle("getGameProcess", (_event, { gameId }) => gameLauncher.getGameProcess(gameId));

  // Stop
  secureHandle("stopGame", (_event, { gameId, force = false }) =>
    gameLauncher.stopGame(gameId, force)
  );
  secureHandle("forceStopGame", (_event, { gameId }) =>
    gameLauncher.stopGame(gameId, true)
  );

  // Directory listing
  secureHandle("listGameDirectory", async (_event, { gamePath }) => {
    const normalized = path.normalize(gamePath);
    // Check for traversal in the original path (normalize resolves '..' so checking
    // normalized is useless — check the original segments instead)
    if (!path.isAbsolute(normalized) || gamePath.split(/[/\\]/).includes('..')) {
      return { success: false, error: "Invalid path" };
    }
    try {
      await fs.promises.access(normalized);
      const items = await fs.promises.readdir(normalized);
      const files = [], directories = [];

      await Promise.all(items.map(async (item) => {
        try {
          const itemPath = path.join(normalized, item);
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
  secureHandle("uninstallGame", async (event, { gameId, gamePath, gameName }) => {

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
          },
        },
      });

      worker.on("message", async (data) => {
        if (data.type === "log") { logger[data.level]?.(`[Worker] ${data.message}`); return; }
        if (!event.sender.isDestroyed()) {
          event.sender.send("uninstallProgress", { id: gameId, ...data });
        }

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
        if (!event.sender.isDestroyed()) {
          event.sender.send("uninstallProgress", { id: gameId, progress: 0, stage: "Failed", error: err.message });
        }
        reject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  secureHandle("canUninstallGame", async (_event, { gameId, gamePath }) => {
    try {
      await fs.promises.access(gamePath);
      const isRunning = gameLauncher.isGameRunning(gameId);
      return { canUninstall: true, isRunning, warning: isRunning ? "Game will be closed" : null };
    } catch {
      return { canUninstall: false, reason: "Directory not found" };
    }
  });

  secureHandle("getGameSize", async (_event, { gamePath }) => {
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
