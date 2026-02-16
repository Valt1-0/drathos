import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { shell, BrowserWindow } from "electron";
import { wineDetector } from "./utils/wineDetector.js";

const execAsync = promisify(exec);

export class GameLauncher {
  constructor() {
    this.activeProcesses = new Map();
    this.sessionTrackers = new Map();
  }

  /**
   * Lance un jeu
   */
  async launchGame(gameId, gamePath, executableName, onStatusChange = () => {}, store = null) {
    try {
      console.log(`[GameLauncher] Lancement du jeu ${gameId}...`);

      const validationResult = this._validateGameLaunch(gameId, gamePath, executableName);
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
        console.log(`[GameLauncher] Wine détecté: ${version}`);
      }

      const gameProcess = await this._createGameProcess(executablePath, gamePath, needsWine);
      const processInfo = this._createProcessInfo(gameProcess, gameId, gamePath, executableName, store, needsWine);
      this.activeProcesses.set(gameId, processInfo);

      this._setupProcessEvents(gameProcess, processInfo, onStatusChange);

      return {
        success: true,
        pid: gameProcess.pid,
        message: `Jeu ${gameId} lancé avec succès`,
      };
    } catch (error) {
      console.error(`[GameLauncher] Échec du lancement de ${gameId}:`, error);
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
   * Valide le lancement du jeu
   */
  _validateGameLaunch(gameId, gamePath, executableName) {
    const existingProcess = this.activeProcesses.get(gameId);
    if (existingProcess) {
      const isActuallyRunning = existingProcess.process && !existingProcess.process.killed;

      if (isActuallyRunning) {
        console.warn(`[GameLauncher] Jeu ${gameId} déjà en cours (PID: ${existingProcess.pid})`);
        return { success: false, error: "Le jeu est déjà en cours d'exécution" };
      } else {
        console.warn(`[GameLauncher] Processus zombie détecté pour ${gameId}, nettoyage...`);
        this.cleanupProcess(gameId);
      }
    }

    const executablePath = path.join(gamePath, executableName);

    if (!fs.existsSync(executablePath)) {
      return {
        success: false,
        error: `Exécutable non trouvé : ${executablePath}`,
      };
    }

    const stats = fs.statSync(executablePath);
    if (!stats.isFile()) {
      return {
        success: false,
        error: `Le chemin spécifié n'est pas un fichier : ${executablePath}`,
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
   * Configure les événements du processus
   */
  _setupProcessEvents(gameProcess, processInfo, onStatusChange) {
    gameProcess.on("spawn", () => {
      const wineInfo = processInfo.usesWine ? " (via Wine)" : "";
      console.log(`[GameLauncher] Jeu ${processInfo.gameId} démarré${wineInfo} (PID: ${gameProcess.pid})`);
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
      console.error(`[GameLauncher] Erreur ${processInfo.gameId}:`, error);
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

      console.log(`[GameLauncher] Jeu ${processInfo.gameId} fermé (code: ${code}, signal: ${signal})`);

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

      console.log(`[GameLauncher] Nettoyage backup pour ${processInfo.gameId}`);

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
   * Configure la capture des logs du processus
   */
  _setupProcessLogging(gameProcess, gameId) {
    if (gameProcess.stdout) {
      gameProcess.stdout.on("data", (data) => {
        console.log(`[${gameId}] ${data.toString().trim()}`);
      });

      gameProcess.stdout.on("error", (err) => {
        if (err.code !== 'EPIPE') {
          console.warn(`[${gameId}] Erreur stdout:`, err.message);
        }
      });
    }

    if (gameProcess.stderr) {
      gameProcess.stderr.on("data", (data) => {
        console.error(`[${gameId}] ${data.toString().trim()}`);
      });

      gameProcess.stderr.on("error", (err) => {
        if (err.code !== 'EPIPE') {
          console.warn(`[${gameId}] Erreur stderr:`, err.message);
        }
      });
    }
  }

  /**
   * Arrête un jeu
   */
  async stopGame(gameId, force = false) {
    const processInfo = this.activeProcesses.get(gameId);

    if (!processInfo) {
      return {
        success: false,
        message: "Aucun processus actif trouvé pour ce jeu",
      };
    }

    try {
      const { process: gameProcess } = processInfo;
      console.log(`[GameLauncher] Arrêt du jeu ${gameId} (PID: ${gameProcess.pid})`);

      if (process.platform === 'win32') {
        if (force) {
          try {
            gameProcess.kill();
          } catch (err) {
            await execAsync(`taskkill /PID ${gameProcess.pid} /F /T`);
          }
        } else {
          gameProcess.kill();

          setTimeout(async () => {
            if (this.activeProcesses.has(gameId) && !gameProcess.killed) {
              try {
                await execAsync(`taskkill /PID ${gameProcess.pid} /F /T`);
              } catch (err) {
                console.error(`[GameLauncher] Erreur taskkill:`, err.message);
              }
            }
          }, 10000);
        }
      } else {
        if (force) {
          gameProcess.kill("SIGKILL");
        } else {
          gameProcess.kill("SIGTERM");

          setTimeout(() => {
            if (this.activeProcesses.has(gameId) && !gameProcess.killed) {
              gameProcess.kill("SIGKILL");
            }
          }, 10000);
        }
      }

      return {
        success: true,
        message: `Arrêt de ${gameId} en cours`,
      };
    } catch (error) {
      console.error(`[GameLauncher] Erreur lors de l'arrêt de ${gameId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Démarre le tracking de session
   */
  startSessionTracking(gameId, onStatusChange) {
    if (this.sessionTrackers.has(gameId)) {
      clearInterval(this.sessionTrackers.get(gameId));
    }

    const interval = setInterval(() => {
      const processInfo = this.activeProcesses.get(gameId);
      if (processInfo) {
        const duration = Date.now() - processInfo.startTime;
        onStatusChange({
          gameId,
          status: "running",
          sessionDuration: Math.floor(duration / 1000),
          pid: processInfo.pid,
        });
      } else {
        clearInterval(interval);
        this.sessionTrackers.delete(gameId);
      }
    }, 30000);

    this.sessionTrackers.set(gameId, interval);
  }

  /**
   * Envoie les statistiques au renderer
   */
  async sendStatsToBackend(gameId) {
    try {
      const processInfo = this.activeProcesses.get(gameId);

      if (!processInfo) {
        console.error(`[GameLauncher] ProcessInfo non trouvé pour ${gameId}`);
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
      console.error(`[GameLauncher] Erreur envoi stats:`, error);
    }
  }

  /**
   * Nettoie les ressources d'un jeu
   */
  async cleanupProcess(gameId) {
    const processInfo = this.activeProcesses.get(gameId);

    if (processInfo?.usesWine && process.platform !== 'win32') {
      try {
        const winePrefix = path.join(processInfo.gamePath, '.wine');

        await execAsync('wineserver -k', {
          env: {
            ...process.env,
            WINEPREFIX: winePrefix
          }
        }).catch(() => {});
      } catch (error) {
        // Wine cleanup est optionnel
      }
    }

    this.activeProcesses.delete(gameId);

    const tracker = this.sessionTrackers.get(gameId);
    if (tracker) {
      clearInterval(tracker);
      this.sessionTrackers.delete(gameId);
    }
  }

  /**
   * Nettoie toutes les ressources
   */
  cleanup() {
    console.log("[GameLauncher] Nettoyage de tous les jeux actifs...");

    this.activeProcesses.forEach((processInfo, gameId) => {
      this.stopGame(gameId, true);
    });

    this.sessionTrackers.forEach((interval) => clearInterval(interval));
    this.sessionTrackers.clear();

    console.log("[GameLauncher] Nettoyage terminé");
  }

  /**
   * Obtient la liste des jeux actifs
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
   * Vérifie si un jeu est en cours
   */
  isGameRunning(gameId) {
    return this.activeProcesses.has(gameId);
  }

  /**
   * Ouvre le dossier du jeu
   */
  openGameFolder(gamePath) {
    if (fs.existsSync(gamePath)) {
      shell.openPath(gamePath);
      return { success: true };
    } else {
      return { success: false, error: "Dossier non trouvé" };
    }
  }

  /**
   * Obtient les informations d'un processus
   */
  getGameProcess(gameId) {
    return this.activeProcesses.get(gameId) || null;
  }
}
