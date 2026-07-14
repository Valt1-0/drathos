/**
 * Game management IPC handlers
 */
import { ipcMain, BrowserWindow } from "electron";
import { Worker } from "node:worker_threads";
import fs from "fs";
import path from "path";
import store from "../store.js";
import { resolveDownloadDir, isInside, hasVersionSuffix } from "../app/pathGuard.js";
import { getToken } from "../utils/tokenStore.js";
import { GameLauncher } from "../gameLauncher.js";
import { SimpleExecutableDetector } from "../simpleExecutableDetector.js";
import { isExecutableFile } from "../app/security.js";
import { secureHandle } from "./secureHandle.js";
import workerPath from "../installWorker.js?modulePath";
import logger from "../utils/logger.js";
import uninstallWorkerPath from "../uninstallWorker.js?modulePath";
import { calculateDirSize } from "../utils/dirSize.js";

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

// Workers stay registered from download start until exit — the count covers
// the whole install (download + extraction), which is what quit-confirm needs.
export const getActiveDownloadCount = () => activeWorkers.size;

// Guards the renderer from targeting arbitrary paths: allow the effective
// download dir, or any path the main process itself recorded at install time
// (covers a download folder changed after some games were installed).
const isInsideDownloadDir = (gamePath) => {
  if (!gamePath) return false;
  const resolved = path.resolve(gamePath);
  const downloadDir = resolveDownloadDir(store.get("downloadPath", ""));
  if (isInside(downloadDir, resolved)) return true;

  const cache = store.get("installedGamesCache") || {};
  if (Object.values(cache).some((entry) => entry?.path && isInside(path.resolve(entry.path), resolved))) {
    return true;
  }

  // Games installed under a since-changed/lost download path live outside both
  // checks above. Trust a real directory carrying Drathos's `_v<version>`
  // install marker — on the path itself or an ancestor, so subfolders of an
  // install stay browsable — never a drive root or arbitrary system path.
  for (let dir = resolved; dir !== path.parse(dir).root; dir = path.dirname(dir)) {
    if (hasVersionSuffix(path.basename(dir))) {
      try {
        if (fs.statSync(dir).isDirectory()) return true;
      } catch {
        // not a real directory — keep walking up
      }
    }
  }

  logger.warn(
    `[Security] Path denied — gamePath=${resolved} | downloadDir=${downloadDir} | ` +
    `cachedPaths=${JSON.stringify(Object.values(cache).map((e) => e?.path).filter(Boolean))}`
  );
  return false;
};

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
      // Guard: a Promise can only settle once. The worker may send a terminal message
      // (completed/cancelled/failed) and then still exit with a non-zero code — without
      // this flag the exit handler would call reject() after resolve() already fired,
      // producing an unhandled rejection in error-monitoring tools.
      let settled = false;
      const safeResolve = (v) => { if (settled) return; settled = true; resolve(v); };
      const safeReject  = (e) => { if (settled) return; settled = true; reject(e); };

      const worker = new Worker(workerPath, {
        workerData: {
          serverGame,
          storeData: {
            serverAddress: store.get("serverAddress"),
            userToken: getToken(),
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
          // A worker wedged on a stuck fs op never exits on its own — grace
          // terminate so it can't linger in activeWorkers after a terminal stage
          setTimeout(() => {
            if (activeWorkers.get(serverGame._id) === worker) {
              try { worker.terminate(); } catch { /* ignore */ }
              activeWorkers.delete(serverGame._id);
            }
          }, 3000);
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
          safeResolve({ success: true, path: data.finalPath });
        }
        if (stage === "cancelled") safeResolve({ success: false, error: "CANCELLED" });
        if (stage === "failed") safeReject(new Error(data.error));
      });

      worker.on("error", (err) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("downloadProgress", { id: serverGame._id, progress: 0, stage: "Failed", error: err.message });
        }
        safeReject(err);
      });

      worker.on("exit", (code) => {
        activeWorkers.delete(serverGame._id);
        if (code !== 0) safeReject(new Error(`Worker exited with code ${code}`));
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
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied" };
    try {
      const exe = await getDetector().getBestExecutable(gamePath, gameName);
      return exe ? { success: true, executable: exe } : { success: false, error: "No executable found" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("detectExecutables", async (_event, { gamePath, gameName }) => {
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied", executables: [] };
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
      if (!isInsideDownloadDir(gamePath)) throw new Error("Access denied");

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
  secureHandle("openGameFolder", (_event, gamePath) => {
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied" };
    return gameLauncher.openGameFolder(gamePath);
  });
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
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied" };
    const normalized = path.normalize(gamePath);
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
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied" };

    if (gameLauncher.isGameRunning(gameId)) {
      await gameLauncher.stopGame(gameId, true);
      await new Promise(r => setTimeout(r, 2000));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const safeResolve = (v) => { if (settled) return; settled = true; resolve(v); };
      const safeReject  = (e) => { if (settled) return; settled = true; reject(e); };

      const worker = new Worker(uninstallWorkerPath, {
        workerData: {
          gameId,
          gamePath,
          storeData: {
            serverAddress: store.get("serverAddress"),
            userToken: getToken(),
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
              if (modInfo?.path && isInsideDownloadDir(modInfo.path)) {
                await fs.promises.rm(modInfo.path, { recursive: true, force: true }).catch(() => {});
              }
            }
            delete installedMods[gameId];
            store.set("installedMods", installedMods);
          }

          // Clean cache
          const cache = store.get("installedGamesCache", {});
          if (cache[gameId]) { delete cache[gameId]; store.set("installedGamesCache", cache); }

          safeResolve({ success: true });
        }
        if (data.stage === "failed") safeReject(new Error(data.error));
      });

      worker.on("error", (err) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send("uninstallProgress", { id: gameId, progress: 0, stage: "Failed", error: err.message });
        }
        safeReject(err);
      });

      worker.on("exit", (code) => {
        if (code !== 0) safeReject(new Error(`Worker exited with code ${code}`));
      });
    });
  });

  secureHandle("canUninstallGame", async (_event, { gameId, gamePath }) => {
    if (!isInsideDownloadDir(gamePath)) return { canUninstall: false, reason: "Access denied" };
    try {
      await fs.promises.access(gamePath);
      const isRunning = gameLauncher.isGameRunning(gameId);
      return { canUninstall: true, isRunning, warning: isRunning ? "Game will be closed" : null };
    } catch {
      return { canUninstall: false, reason: "Directory not found" };
    }
  });

  secureHandle("getGameSize", async (_event, { gamePath }) => {
    if (!isInsideDownloadDir(gamePath)) return { success: false, error: "Access denied" };
    try {
      await fs.promises.access(gamePath);
      const counter = { files: 0, truncated: false };
      const size = await calculateDirSize(gamePath, 0, counter);
      if (counter.truncated) logger.warn(`[getGameSize] Size truncated at 50 000 files for ${gamePath}`);
      return { success: true, sizeBytes: size, sizeMB: Math.round(size / (1024 * 1024)),
        sizeGB: Math.round((size / (1024 ** 3)) * 10) / 10, truncated: counter.truncated };
    } catch {
      return { success: false, error: "Directory not found" };
    }
  });
};

