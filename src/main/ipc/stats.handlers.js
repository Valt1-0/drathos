/**
 * Statistics and disk space IPC handlers
 */
import { ipcMain } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";
import store from "../store.js";

const execFileAsync = promisify(execFile);

export const registerStatsHandlers = () => {
  ipcMain.handle("save-local-stats", async (_, { gameId, sessionData }) => {
    try {
      const games = store.get("installedGamesCache", {});
      if (!games[gameId]) return { success: false, error: "Game not found" };

      games[gameId].stats = games[gameId].stats || {
        currentSession: { startTime: null, isPlaying: false },
        totalPlayTime: 0, totalSessions: 0, lastPlayed: null, firstLaunched: null,
      };

      const stats = games[gameId].stats;
      stats.totalPlayTime += sessionData.duration;
      stats.totalSessions += 1;
      stats.lastPlayed = Date.now();
      stats.firstLaunched = stats.firstLaunched || Date.now();

      store.set("installedGamesCache", games);
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-local-stats", async (_, { gameId }) => {
    try {
      return store.get("installedGamesCache", {})[gameId]?.stats || null;
    } catch {
      return null;
    }
  });

  ipcMain.handle("getDiskSpace", async (_, path) => {
    try {
      const installPath = path || store.get("downloadPath");
      if (!installPath) return { success: false, notConfigured: true, error: "Install path not configured" };

      let freeBytes, totalBytes;

      if (process.platform === "win32") {
        const driveLetter = installPath.charAt(0);
        if (!/^[a-zA-Z]$/.test(driveLetter)) throw new Error("Invalid drive letter");
        const drive = driveLetter.toUpperCase() + ":";
        const { stdout } = await execFileAsync("wmic", [
          "logicaldisk", "where", `DeviceID='${drive}'`, "get", "FreeSpace,Size", "/value"
        ]);
        const freeMatch = stdout.match(/FreeSpace=(\d+)/);
        const sizeMatch = stdout.match(/Size=(\d+)/);
        if (!freeMatch || !sizeMatch) throw new Error("Cannot parse disk info");
        freeBytes = parseInt(freeMatch[1]);
        totalBytes = parseInt(sizeMatch[1]);
      } else {
        const { stdout } = await execFileAsync("df", ["-k", installPath]);
        const parts = stdout.trim().split("\n")[1]?.split(/\s+/);
        if (!parts) throw new Error("Cannot parse disk info");
        totalBytes = parseInt(parts[1]) * 1024;
        freeBytes = parseInt(parts[3]) * 1024;
      }

      const GB = 1024 ** 3;
      return {
        success: true, freeBytes, totalBytes,
        freeGB: Math.round((freeBytes / GB) * 10) / 10,
        totalGB: Math.round((totalBytes / GB) * 10) / 10,
        usedGB: Math.round(((totalBytes - freeBytes) / GB) * 10) / 10,
        usedPercent: Math.round(((totalBytes - freeBytes) / totalBytes) * 100),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
