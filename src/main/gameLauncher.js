// drathos/src/main/gameLauncher.js

import { spawn, exec } from "child_process";
import fs from "fs";
import path from "path";
import { shell } from "electron";

export class GameLauncher {
  constructor() {
    this.activeProcesses = new Map(); // Tracking des processus actifs
    this.sessionTrackers = new Map(); // Tracking des sessions
  }

  /**
   * Lance un jeu avec configuration complète
   */
  async launchGame(gameConfig, installedGamePath, onStatusChange) {
    const { executable, launchConfig = {}, gameId, gameName } = gameConfig;

    try {
      console.log(`[GameLauncher] Launching ${gameName}...`);

      // Vérifications pré-lancement
      await this.prelaunchChecks(executable, installedGamePath, launchConfig);

      // Construire le chemin complet de l'executable
      const executablePath = path.join(
        installedGamePath,
        executable.relativePath || executable.fileName
      );

      if (!fs.existsSync(executablePath)) {
        throw new Error(`Executable non trouvé: ${executablePath}`);
      }

      // Exécuter les commandes pré-lancement
      if (launchConfig.prelaunchCommands?.length > 0) {
        await this.executeCommands(
          launchConfig.prelaunchCommands,
          installedGamePath
        );
      }

      // Déterminer le répertoire de travail
      const workingDir = executable.workingDirectory
        ? path.join(installedGamePath, executable.workingDirectory)
        : path.dirname(executablePath);

      // Préparer les variables d'environnement
      const env = { ...process.env };
      if (launchConfig.environmentVariables) {
        Object.entries(launchConfig.environmentVariables).forEach(
          ([key, value]) => {
            env[key] = value;
          }
        );
      }

      // Préparer les arguments
      const args = executable.arguments ? executable.arguments.split(" ") : [];

      console.log(`[GameLauncher] Executing: ${executablePath}`);
      console.log(`[GameLauncher] Working dir: ${workingDir}`);
      console.log(`[GameLauncher] Arguments: ${args.join(" ")}`);

      // Lancer le processus
      const gameProcess = spawn(executablePath, args, {
        cwd: workingDir,
        env: env,
        detached: true, // Permet au jeu de continuer même si l'app se ferme
        stdio: ["ignore", "pipe", "pipe"],
      });

      // Tracking du processus
      this.activeProcesses.set(gameId, {
        process: gameProcess,
        startTime: Date.now(),
        gameName: gameName,
        pid: gameProcess.pid,
      });

      // Tracking de session
      this.startSessionTracking(gameId, onStatusChange);

      // Gestion des événements du processus
      gameProcess.on("spawn", () => {
        console.log(
          `[GameLauncher] ${gameName} started successfully (PID: ${gameProcess.pid})`
        );
        onStatusChange({
          gameId,
          status: "running",
          pid: gameProcess.pid,
          startTime: Date.now(),
        });
      });

      gameProcess.on("error", (error) => {
        console.error(`[GameLauncher] Error launching ${gameName}:`, error);
        this.cleanupProcess(gameId);
        onStatusChange({
          gameId,
          status: "failed",
          error: error.message,
        });
      });

      gameProcess.on("exit", async (code, signal) => {
        console.log(
          `[GameLauncher] ${gameName} exited with code ${code}, signal ${signal}`
        );

        const processInfo = this.activeProcesses.get(gameId);
        const sessionDuration = processInfo
          ? Date.now() - processInfo.startTime
          : 0;

        // Exécuter les commandes post-lancement
        if (launchConfig.postlaunchCommands?.length > 0) {
          try {
            await this.executeCommands(
              launchConfig.postlaunchCommands,
              installedGamePath
            );
          } catch (error) {
            console.warn(`[GameLauncher] Post-launch commands failed:`, error);
          }
        }

        this.cleanupProcess(gameId);
        onStatusChange({
          gameId,
          status: "stopped",
          exitCode: code,
          sessionDuration: Math.floor(sessionDuration / 1000),
        });
      });

      // Log de sortie du jeu (optionnel, pour debug)
      gameProcess.stdout?.on("data", (data) => {
        console.log(`[${gameName}] ${data.toString().trim()}`);
      });

      gameProcess.stderr?.on("data", (data) => {
        console.error(`[${gameName}] ERROR: ${data.toString().trim()}`);
      });

      return {
        success: true,
        pid: gameProcess.pid,
        message: `${gameName} lancé avec succès`,
      };
    } catch (error) {
      console.error(`[GameLauncher] Failed to launch ${gameName}:`, error);
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
   * Arrête un jeu en cours
   */
  async stopGame(gameId, force = false) {
    const processInfo = this.activeProcesses.get(gameId);

    if (!processInfo) {
      return { success: false, message: "Aucun processus actif trouvé" };
    }

    try {
      const { process: gameProcess, gameName } = processInfo;

      if (force) {
        // Kill forcé
        gameProcess.kill("SIGKILL");
        console.log(`[GameLauncher] Force killed ${gameName}`);
      } else {
        // Arrêt gracieux
        gameProcess.kill("SIGTERM");
        console.log(`[GameLauncher] Gracefully stopping ${gameName}`);

        // Si pas arrêté après 10 secondes, kill forcé
        setTimeout(() => {
          if (this.activeProcesses.has(gameId)) {
            console.log(
              `[GameLauncher] Force killing ${gameName} after timeout`
            );
            gameProcess.kill("SIGKILL");
          }
        }, 10000);
      }

      return { success: true, message: `${gameName} en cours d'arrêt` };
    } catch (error) {
      console.error(`[GameLauncher] Error stopping game:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtient le statut de tous les jeux actifs
   */
  getActiveGames() {
    const activeGames = [];

    this.activeProcesses.forEach((processInfo, gameId) => {
      activeGames.push({
        gameId,
        gameName: processInfo.gameName,
        pid: processInfo.pid,
        startTime: processInfo.startTime,
        duration: Date.now() - processInfo.startTime,
      });
    });

    return activeGames;
  }

  /**
   * Vérifications pré-lancement
   */
  async prelaunchChecks(executable, gamePath, launchConfig) {
    // Vérifier l'espace disque
    if (launchConfig.minimumDiskSpace) {
      // TODO: Vérifier l'espace disque disponible
    }

    // Vérifier la RAM
    if (launchConfig.minimumRAM) {
      const totalMem = require("os").totalmem();
      const freeMem = require("os").freemem();

      if (freeMem < launchConfig.minimumRAM * 1024 * 1024) {
        console.warn(
          `[GameLauncher] Low memory warning: ${Math.floor(
            freeMem / 1024 / 1024
          )}MB free, ${launchConfig.minimumRAM}MB required`
        );
      }
    }

    // Vérifier que le fichier executable existe et est exécutable
    const execPath = path.join(
      gamePath,
      executable.relativePath || executable.fileName
    );

    if (!fs.existsSync(execPath)) {
      throw new Error(`Executable non trouvé: ${execPath}`);
    }

    const stats = fs.statSync(execPath);
    if (!stats.isFile()) {
      throw new Error(`Le chemin spécifié n'est pas un fichier: ${execPath}`);
    }
  }

  /**
   * Exécute des commandes système
   */
  async executeCommands(commands, workingDir) {
    for (const command of commands) {
      await new Promise((resolve, reject) => {
        exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[GameLauncher] Command failed: ${command}`, error);
            reject(error);
          } else {
            console.log(`[GameLauncher] Command executed: ${command}`);
            if (stdout) console.log(stdout);
            if (stderr) console.warn(stderr);
            resolve();
          }
        });
      });
    }
  }

  /**
   * Tracking de session
   */
  startSessionTracking(gameId, onStatusChange) {
    const interval = setInterval(() => {
      const processInfo = this.activeProcesses.get(gameId);
      if (processInfo) {
        const duration = Date.now() - processInfo.startTime;
        onStatusChange({
          gameId,
          status: "running",
          sessionDuration: Math.floor(duration / 1000),
        });
      } else {
        clearInterval(interval);
        this.sessionTrackers.delete(gameId);
      }
    }, 30000); // Update toutes les 30 secondes

    this.sessionTrackers.set(gameId, interval);
  }

  /**
   * Nettoyage des ressources
   */
  cleanupProcess(gameId) {
    this.activeProcesses.delete(gameId);

    const tracker = this.sessionTrackers.get(gameId);
    if (tracker) {
      clearInterval(tracker);
      this.sessionTrackers.delete(gameId);
    }
  }

  /**
   * Nettoyage global à la fermeture de l'app
   */
  cleanup() {
    console.log("[GameLauncher] Cleaning up all active games...");

    // Arrêter tous les jeux actifs
    this.activeProcesses.forEach((processInfo, gameId) => {
      this.stopGame(gameId, true); // Force stop
    });

    // Nettoyer les trackers
    this.sessionTrackers.forEach((interval) => clearInterval(interval));
    this.sessionTrackers.clear();
  }
}
