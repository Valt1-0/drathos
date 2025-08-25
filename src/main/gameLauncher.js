// drathos/src/main/gameLauncher.js

import { spawn, exec } from "child_process";
import fs from "fs";
import path from "path";
import { shell } from "electron";

export class GameLauncher {
  constructor() {
    this.activeProcesses = new Map(); // Map<gameId, ProcessInfo>
    this.sessionTrackers = new Map(); // Map<gameId, IntervalId>
  }

  /**
   * Lance un jeu de manière simplifiée
   * @param {string} gameId - ID du jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} executableName - Nom de l'exécutable (ex: "game.exe")
   * @param {Function} onStatusChange - Callback pour les changements d'état
   */
  async launchGame(
    gameId,
    gamePath,
    executableName,
    onStatusChange = () => {}
  ) {
    try {
      console.log(`[GameLauncher] Lancement du jeu ${gameId}...`);

      // Vérification si le jeu est déjà en cours
      if (this.activeProcesses.has(gameId)) {
        throw new Error("Le jeu est déjà en cours d'exécution");
      }

      // Construction du chemin complet vers l'exécutable
      const executablePath = path.join(gamePath, executableName);

      // Vérification de l'existence du fichier
      if (!fs.existsSync(executablePath)) {
        throw new Error(`Exécutable non trouvé : ${executablePath}`);
      }

      // Vérification des permissions
      const stats = fs.statSync(executablePath);
      if (!stats.isFile()) {
        throw new Error(
          `Le chemin spécifié n'est pas un fichier : ${executablePath}`
        );
      }

      console.log(`[GameLauncher] Exécution de : ${executablePath}`);
      console.log(`[GameLauncher] Répertoire de travail : ${gamePath}`);

      // Lancement du processus
      const gameProcess = spawn(executablePath, [], {
        cwd: gamePath, // Répertoire de travail
        detached: true, // Permet au processus de continuer après fermeture de l'app
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin, capture stdout/stderr
        env: { ...process.env }, // Hérite des variables d'environnement
      });

      // Stockage des informations du processus
      const processInfo = {
        process: gameProcess,
        pid: gameProcess.pid,
        gameId,
        gamePath,
        executableName,
        startTime: Date.now(),
        status: "starting",
      };

      this.activeProcesses.set(gameId, processInfo);

      // Gestion des événements du processus
      gameProcess.on("spawn", () => {
        console.log(
          `[GameLauncher] Jeu ${gameId} démarré avec succès (PID: ${gameProcess.pid})`
        );
        processInfo.status = "running";

        // Démarrer le tracking de session
        this.startSessionTracking(gameId, onStatusChange);

        onStatusChange({
          gameId,
          status: "running",
          pid: gameProcess.pid,
          startTime: processInfo.startTime,
        });
      });

      gameProcess.on("error", (error) => {
        console.error(
          `[GameLauncher] Erreur lors du lancement de ${gameId}:`,
          error
        );
        this.cleanupProcess(gameId);

        onStatusChange({
          gameId,
          status: "failed",
          error: error.message,
        });
      });

      gameProcess.on("exit", (code, signal) => {
        console.log(
          `[GameLauncher] Jeu ${gameId} fermé (code: ${code}, signal: ${signal})`
        );

        const sessionDuration = processInfo.startTime
          ? Math.floor((Date.now() - processInfo.startTime) / 1000)
          : 0;

        this.cleanupProcess(gameId);

        onStatusChange({
          gameId,
          status: "stopped",
          exitCode: code,
          signal,
          sessionDuration,
        });
      });

      // Capture des logs (optionnel, pour debug)
      if (gameProcess.stdout) {
        gameProcess.stdout.on("data", (data) => {
          console.log(`[${gameId}] STDOUT: ${data.toString().trim()}`);
        });
      }

      if (gameProcess.stderr) {
        gameProcess.stderr.on("data", (data) => {
          console.log(`[${gameId}] STDERR: ${data.toString().trim()}`);
        });
      }

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
   * Arrête un jeu en cours
   * @param {string} gameId - ID du jeu à arrêter
   * @param {boolean} force - Forcer l'arrêt (SIGKILL au lieu de SIGTERM)
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

      console.log(
        `[GameLauncher] Arrêt du jeu ${gameId} (PID: ${gameProcess.pid})`
      );

      if (force) {
        // Arrêt forcé immédiat
        gameProcess.kill("SIGKILL");
        console.log(`[GameLauncher] Jeu ${gameId} arrêté de force`);
      } else {
        // Arrêt gracieux
        gameProcess.kill("SIGTERM");
        console.log(`[GameLauncher] Demande d'arrêt gracieux pour ${gameId}`);

        // Si le processus ne répond pas après 10 secondes, forcer l'arrêt
        setTimeout(() => {
          if (this.activeProcesses.has(gameId)) {
            console.log(
              `[GameLauncher] Timeout atteint, arrêt forcé de ${gameId}`
            );
            gameProcess.kill("SIGKILL");
          }
        }, 10000);
      }

      return {
        success: true,
        message: `Arrêt de ${gameId} en cours`,
      };
    } catch (error) {
      console.error(
        `[GameLauncher] Erreur lors de l'arrêt de ${gameId}:`,
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
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
   * Vérifie si un jeu est en cours d'exécution
   */
  isGameRunning(gameId) {
    return this.activeProcesses.has(gameId);
  }

  /**
   * Démarre le tracking de session pour un jeu
   */
  startSessionTracking(gameId, onStatusChange) {
    // Nettoyer un éventuel tracker existant
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
        // Le processus n'existe plus, arrêter le tracking
        clearInterval(interval);
        this.sessionTrackers.delete(gameId);
      }
    }, 30000); // Mise à jour toutes les 30 secondes

    this.sessionTrackers.set(gameId, interval);
  }

  /**
   * Nettoie les ressources pour un jeu spécifique
   */
  cleanupProcess(gameId) {
    // Supprimer le processus de la liste
    this.activeProcesses.delete(gameId);

    // Arrêter le tracking de session
    const tracker = this.sessionTrackers.get(gameId);
    if (tracker) {
      clearInterval(tracker);
      this.sessionTrackers.delete(gameId);
    }

    console.log(`[GameLauncher] Ressources nettoyées pour ${gameId}`);
  }

  /**
   * Nettoie toutes les ressources lors de la fermeture de l'application
   */
  cleanup() {
    console.log("[GameLauncher] Nettoyage de tous les jeux actifs...");

    // Arrêter tous les jeux en cours
    this.activeProcesses.forEach((processInfo, gameId) => {
      console.log(`[GameLauncher] Arrêt forcé de ${gameId}`);
      this.stopGame(gameId, true); // Arrêt forcé
    });

    // Nettoyer tous les trackers
    this.sessionTrackers.forEach((interval) => clearInterval(interval));
    this.sessionTrackers.clear();

    console.log("[GameLauncher] Nettoyage terminé");
  }

  /**
   * Ouvre le dossier du jeu dans l'explorateur
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
   * Obtient les informations d'un processus actif
   */
  getGameProcess(gameId) {
    return this.activeProcesses.get(gameId) || null;
  }
}
