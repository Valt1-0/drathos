import { spawn, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { shell, BrowserWindow } from "electron";
import { wineDetector } from "./utils/wineDetector.js";
import { validateAndResolvePath } from "./app/validation.js";
import logger from "./utils/logger.js";

const execFileAsync = promisify(execFile);

const SESSION_MAX_MS = 24 * 60 * 60 * 1000; // 24 h hard cap — cleans up if process dies without firing exit

export class GameLauncher {
  constructor() {
    this.activeProcesses = new Map();
    this.sessionTrackers = new Map();
    this.killTimers = new Map(); // force-kill fallback timers, cleared on process exit
  }

  /**
   * Launch a game
   */
  async launchGame(gameId, gamePath, executableName, onStatusChange = () => {}, store = null) {
    try {
      logger.info(`[GameLauncher] Launching game ${gameId}...`);

      const validationResult = await this._validateGameLaunch(gameId, gamePath, executableName);
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }

      const executablePath = validationResult.executablePath;
      const needsWine = wineDetector.isWineRequired(executablePath);

      if (needsWine) {
        const wineCmd = await wineDetector.detectWine();
        if (!wineCmd) {
          const instructions = wineDetector.getWineInstallInstructions();
          throw new Error(`WINE_NOT_INSTALLED:${JSON.stringify(instructions)}`);
        }
        const version = await wineDetector.getWineVersion();
        logger.info(`[GameLauncher] Wine detected: ${version}`);
      }

      const gameProcess = await this._createGameProcess(executablePath, gamePath, needsWine);
      const processInfo = this._createProcessInfo(gameProcess, gameId, gamePath, executableName, store, needsWine);
      this.activeProcesses.set(gameId, processInfo);

      this._setupProcessEvents(gameProcess, processInfo, onStatusChange);

      return {
        success: true,
        pid: gameProcess.pid,
        message: `Game ${gameId} launched successfully`,
      };
    } catch (error) {
      logger.error(`[GameLauncher] Failed to launch ${gameId}`, error);
      this.cleanupProcess(gameId);

      onStatusChange({
        gameId,
        status: "failed",
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate game launch
   */
  async _validateGameLaunch(gameId, gamePath, executableName) {
    const existingProcess = this.activeProcesses.get(gameId);
    if (existingProcess) {
      const isActuallyRunning = existingProcess.process && !existingProcess.process.killed;

      if (isActuallyRunning) {
        logger.warn(`[GameLauncher] Game ${gameId} already running (PID: ${existingProcess.pid})`);
        return { success: false, error: "Game is already running" };
      } else {
        logger.warn(`[GameLauncher] Zombie process detected for ${gameId}, cleaning up...`);
        this.cleanupProcess(gameId);
      }
    }

    let executablePath;
    try {
      executablePath = validateAndResolvePath(gamePath, executableName);
    } catch {
      return { success: false, error: "Invalid executable path or outside game folder" };
    }

    try {
      await fs.promises.access(executablePath);
    } catch {
      return { success: false, error: `Executable not found: ${executablePath}` };
    }

    const stats = await fs.promises.stat(executablePath);
    if (!stats.isFile()) {
      return {
        success: false,
        error: `Specified path is not a file: ${executablePath}`,
      };
    }

    return { success: true, executablePath };
  }

  async _createGameProcess(executablePath, gamePath, needsWine = false) {
    if (needsWine) {
      const wineCmd = await wineDetector.detectWine();
      return spawn(wineCmd, [executablePath], {
        cwd: gamePath,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          WINEPREFIX: path.join(gamePath, '.wine'),
        },
      });
    }

    if (process.platform === 'win32') {
      return spawn(executablePath, [], {
        cwd: gamePath,
        stdio: "ignore",
        env: { ...process.env },
      });
    }

    return spawn(executablePath, [], {
      cwd: gamePath,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
  }

  _createProcessInfo(gameProcess, gameId, gamePath, executableName, store, usesWine = false) {
    return {
      process: gameProcess,
      pid: gameProcess.pid,
      gameId,
      gamePath,
      executableName,
      startTime: Date.now(),
      status: "starting",
      store,
      usesWine,
    };
  }

  /**
   * Configure process events
   */
  _setupProcessEvents(gameProcess, processInfo, onStatusChange) {
    gameProcess.on("spawn", () => {
      const wineInfo = processInfo.usesWine ? " (via Wine)" : "";
      logger.info(`[GameLauncher] Game ${processInfo.gameId} started${wineInfo} (PID: ${gameProcess.pid})`);
      processInfo.status = "running";

      this.startSessionTracking(processInfo.gameId, onStatusChange);

      onStatusChange({
        gameId: processInfo.gameId,
        status: "running",
        pid: gameProcess.pid,
        startTime: processInfo.startTime,
        usesWine: processInfo.usesWine,
      });
    });

    gameProcess.on("error", (error) => {
      logger.error(`[GameLauncher] Process error for ${processInfo.gameId}`, error);
      this.cleanupProcess(processInfo.gameId);

      onStatusChange({
        gameId: processInfo.gameId,
        status: "failed",
        error: error.message,
      });
    });

    gameProcess.on("exit", async (code, signal) => {
      // Guard against double-processing (exit + close can both fire)
      if (!this.activeProcesses.has(processInfo.gameId)) return;

      logger.info(`[GameLauncher] Game ${processInfo.gameId} closed (code: ${code}, signal: ${signal})`);

      const sessionDuration = processInfo.startTime
        ? Math.floor((Date.now() - processInfo.startTime) / 1000)
        : 0;

      onStatusChange({
        gameId: processInfo.gameId,
        status: "stopped",
        exitCode: code,
        signal,
        sessionDuration,
      });

      if (sessionDuration > 0) {
        this.sendStatsToBackend(processInfo.gameId);
      }

      this.cleanupProcess(processInfo.gameId);
    });

    gameProcess.on("close", async (code, signal) => {
      // Backup handler: only runs if exit didn't already clean up
      if (!this.activeProcesses.has(processInfo.gameId)) return;

      logger.info(`[GameLauncher] Backup cleanup for ${processInfo.gameId}`);

      const sessionDuration = processInfo.startTime
        ? Math.floor((Date.now() - processInfo.startTime) / 1000)
        : 0;

      onStatusChange({
        gameId: processInfo.gameId,
        status: "stopped",
        exitCode: code,
        signal,
        sessionDuration,
      });

      if (sessionDuration > 0) {
        this.sendStatsToBackend(processInfo.gameId);
      }

      this.cleanupProcess(processInfo.gameId);
    });

    this._setupProcessLogging(gameProcess, processInfo.gameId);
  }

  /**
   * Configure process log capture
   */
  _setupProcessLogging(gameProcess, gameId) {
    if (gameProcess.stdout) {
      gameProcess.stdout.on("data", (data) => {
        logger.debug(`[${gameId}] ${data.toString().trim()}`);
      });

      gameProcess.stdout.on("error", (err) => {
        if (err.code !== 'EPIPE') {
          logger.warn(`[${gameId}] stdout error: ${err.message}`);
        }
      });
    }

    if (gameProcess.stderr) {
      gameProcess.stderr.on("data", (data) => {
        logger.warn(`[${gameId}] stderr: ${data.toString().trim()}`);
      });

      gameProcess.stderr.on("error", (err) => {
        if (err.code !== 'EPIPE') {
          logger.warn(`[${gameId}] stderr error: ${err.message}`);
        }
      });
    }
  }

  /**
   * Stop a game
   */
  async stopGame(gameId, force = false) {
    const processInfo = this.activeProcesses.get(gameId);

    if (!processInfo) {
      return {
        success: false,
        message: "No active process found for this game",
      };
    }

    try {
      const { process: gameProcess } = processInfo;
      logger.info(`[GameLauncher] Stopping game ${gameId} (PID: ${gameProcess.pid})`);

      if (process.platform === 'win32') {
        if (force) {
          try {
            gameProcess.kill();
          } catch (err) {
            await execFileAsync("taskkill", ["/PID", String(gameProcess.pid), "/F", "/T"]);
          }
        } else {
          gameProcess.kill();

          const timer = setTimeout(async () => {
            this.killTimers.delete(gameId);
            if (this.activeProcesses.has(gameId) && !gameProcess.killed) {
              try {
                await execFileAsync("taskkill", ["/PID", String(gameProcess.pid), "/F", "/T"]);
              } catch (err) {
                logger.error(`[GameLauncher] taskkill error: ${err.message}`);
              }
            }
          }, 10000);
          this.killTimers.set(gameId, timer);
        }
      } else {
        if (force) {
          gameProcess.kill("SIGKILL");
        } else {
          gameProcess.kill("SIGTERM");

          const timer = setTimeout(() => {
            this.killTimers.delete(gameId);
            if (this.activeProcesses.has(gameId) && !gameProcess.killed) {
              gameProcess.kill("SIGKILL");
            }
          }, 10000);
          this.killTimers.set(gameId, timer);
        }
      }

      return {
        success: true,
        message: `Stopping ${gameId}`,
      };
    } catch (error) {
      logger.error(`[GameLauncher] Error stopping ${gameId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Start session tracking
   */
  startSessionTracking(gameId, onStatusChange) {
    if (this.sessionTrackers.has(gameId)) {
      clearInterval(this.sessionTrackers.get(gameId));
    }

    const interval = setInterval(() => {
      const processInfo = this.activeProcesses.get(gameId);
      if (!processInfo) {
        clearInterval(interval);
        this.sessionTrackers.delete(gameId);
        return;
      }
      const duration = Date.now() - processInfo.startTime;
      if (duration > SESSION_MAX_MS) {
        logger.warn(`[GameLauncher] Session for ${gameId} exceeded 24h limit, forcing cleanup`);
        clearInterval(interval);
        this.sessionTrackers.delete(gameId);
        this.cleanupProcess(gameId);
        return;
      }
      onStatusChange({
        gameId,
        status: "running",
        sessionDuration: Math.floor(duration / 1000),
        pid: processInfo.pid,
      });
    }, 30000);

    this.sessionTrackers.set(gameId, interval);
  }

  /**
   * Send statistics to the renderer
   */
  async sendStatsToBackend(gameId) {
    try {
      const processInfo = this.activeProcesses.get(gameId);

      if (!processInfo) {
        logger.error(`[GameLauncher] ProcessInfo not found for ${gameId}`);
        return;
      }

      const sessionDuration = processInfo.startTime
        ? Math.floor((Date.now() - processInfo.startTime) / 1000)
        : 0;

      const windows = BrowserWindow.getAllWindows();

      if (windows.length > 0) {
        windows[0].webContents.send("save-game-stats", {
          gameId,
          sessionData: {
            startTime: processInfo.startTime,
            duration: sessionDuration,
          },
        });
      }
    } catch (error) {
      logger.error(`[GameLauncher] Error sending stats`, error);
    }
  }

  /**
   * Clean up a game's resources
   */
  async cleanupProcess(gameId) {
    const processInfo = this.activeProcesses.get(gameId);

    if (processInfo?.usesWine && process.platform !== 'win32') {
      try {
        const winePrefix = path.join(processInfo.gamePath, '.wine');

        await execFileAsync('wineserver', ['-k'], {
          env: {
            ...process.env,
            WINEPREFIX: winePrefix
          }
        }).catch(() => {});
      } catch (error) {
        // Wine cleanup is optional
      }
    }

    this.activeProcesses.delete(gameId);

    const tracker = this.sessionTrackers.get(gameId);
    if (tracker) {
      clearInterval(tracker);
      this.sessionTrackers.delete(gameId);
    }

    const killTimer = this.killTimers.get(gameId);
    if (killTimer) {
      clearTimeout(killTimer);
      this.killTimers.delete(gameId);
    }
  }

  /**
   * Clean up all resources
   */
  cleanup() {
    logger.info("[GameLauncher] Cleaning up all active games...");

    this.activeProcesses.forEach((processInfo, gameId) => {
      this.stopGame(gameId, true);
    });

    this.sessionTrackers.forEach((interval) => clearInterval(interval));
    this.sessionTrackers.clear();

    this.killTimers.forEach((timer) => clearTimeout(timer));
    this.killTimers.clear();

    logger.info("[GameLauncher] Cleanup complete");
  }

  /**
   * Get the list of active games
   */
  getActiveGames() {
    const activeGames = [];

    this.activeProcesses.forEach((processInfo, gameId) => {
      activeGames.push({
        gameId,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        duration: Date.now() - processInfo.startTime,
        status: processInfo.status,
        executableName: processInfo.executableName,
      });
    });

    return activeGames;
  }

  /**
   * Check if a game is running
   */
  isGameRunning(gameId) {
    return this.activeProcesses.has(gameId);
  }

  /**
   * Open the game folder
   */
  async openGameFolder(gamePath) {
    try {
      await fs.promises.access(gamePath);
      shell.openPath(gamePath);
      return { success: true };
    } catch {
      return { success: false, error: "Folder not found" };
    }
  }

  /**
   * Get information about a process
   */
  getGameProcess(gameId) {
    return this.activeProcesses.get(gameId) || null;
  }
}
