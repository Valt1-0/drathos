// drathos/src/main/gameLauncher.js - VERSION OPTIMISÉE

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { shell } from "electron";

export class GameLauncher {
  constructor() {
    this.activeProcesses = new Map(); // Map<gameId, ProcessInfo>
    this.sessionTrackers = new Map(); // Map<gameId, IntervalId>
  }

  /**
   * Lance un jeu de manière centralisée (supprime tous les doublons)
   * @param {string} gameId - ID du jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} executableName - Nom de l'exécutable
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

      // ✅ Validation préliminaire (évite la duplication de vérifications)
      const validationResult = this._validateGameLaunch(
        gameId,
        gamePath,
        executableName
      );
      if (!validationResult.success) {
        throw new Error(validationResult.error);
      }

      const executablePath = validationResult.executablePath;

      // ✅ Création du processus (centralisé, plus de duplication)
      const gameProcess = this._createGameProcess(executablePath, gamePath);

      // ✅ Stockage unifié des informations
      const processInfo = this._createProcessInfo(
        gameProcess,
        gameId,
        gamePath,
        executableName
      );
      this.activeProcesses.set(gameId, processInfo);

      // ✅ Configuration des événements (une seule fois, pas de doublon)
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
   * ✅ NOUVEAU: Validation centralisée (évite la duplication de vérifications)
   */
  _validateGameLaunch(gameId, gamePath, executableName) {
    // Vérification si le jeu est déjà en cours
    if (this.activeProcesses.has(gameId)) {
      return { success: false, error: "Le jeu est déjà en cours d'exécution" };
    }

    // Construction du chemin complet
    const executablePath = path.join(gamePath, executableName);

    // Vérification de l'existence du fichier
    if (!fs.existsSync(executablePath)) {
      return {
        success: false,
        error: `Exécutable non trouvé : ${executablePath}`,
      };
    }

    // Vérification des permissions
    const stats = fs.statSync(executablePath);
    if (!stats.isFile()) {
      return {
        success: false,
        error: `Le chemin spécifié n'est pas un fichier : ${executablePath}`,
      };
    }

    console.log(
      `[GameLauncher] ✅ Validation OK - Exécution de : ${executablePath}`
    );
    console.log(`[GameLauncher] Répertoire de travail : ${gamePath}`);

    return { success: true, executablePath };
  }

  /**
   * ✅ NOUVEAU: Création centralisée du processus (supprime le doublon spawn)
   */
  _createGameProcess(executablePath, gamePath) {
    return spawn(executablePath, [], {
      cwd: gamePath,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
  }

  /**
   * ✅ NOUVEAU: Création centralisée des infos de processus
   */
  _createProcessInfo(gameProcess, gameId, gamePath, executableName) {
    return {
      process: gameProcess,
      pid: gameProcess.pid,
      gameId,
      gamePath,
      executableName,
      startTime: Date.now(),
      status: "starting",
    };
  }

  /**
   * ✅ NOUVEAU: Configuration centralisée des événements (supprime les doublons d'événements)
   */
  _setupProcessEvents(gameProcess, processInfo, onStatusChange) {
    // Événement de démarrage réussi
    gameProcess.on("spawn", () => {
      console.log(
        `[GameLauncher] ✅ Jeu ${processInfo.gameId} démarré (PID: ${gameProcess.pid})`
      );
      processInfo.status = "running";

      this.startSessionTracking(processInfo.gameId, onStatusChange);

      onStatusChange({
        gameId: processInfo.gameId,
        status: "running",
        pid: gameProcess.pid,
        startTime: processInfo.startTime,
      });
    });

    // Événement d'erreur
    gameProcess.on("error", (error) => {
      console.error(`[GameLauncher] ❌ Erreur ${processInfo.gameId}:`, error);
      this.cleanupProcess(processInfo.gameId);

      onStatusChange({
        gameId: processInfo.gameId,
        status: "failed",
        error: error.message,
      });
    });

    // Événement de fermeture
    gameProcess.on("exit", (code, signal) => {
      console.log(
        `[GameLauncher] 🛑 Jeu ${processInfo.gameId} fermé (code: ${code}, signal: ${signal})`
      );

      const sessionDuration = processInfo.startTime
        ? Math.floor((Date.now() - processInfo.startTime) / 1000)
        : 0;

      this.cleanupProcess(processInfo.gameId);

      onStatusChange({
        gameId: processInfo.gameId,
        status: "stopped",
        exitCode: code,
        signal,
        sessionDuration,
      });
    });

    // ✅ Capture centralisée des logs (plus de duplication)
    this._setupProcessLogging(gameProcess, processInfo.gameId);
  }

  /**
   * ✅ NOUVEAU: Logging centralisé (supprime la duplication de capture de logs)
   */
  _setupProcessLogging(gameProcess, gameId) {
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
  }

  /**
   * Arrête un jeu en cours
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
        gameProcess.kill("SIGKILL");
        console.log(`[GameLauncher] Jeu ${gameId} arrêté de force`);
      } else {
        gameProcess.kill("SIGTERM");
        console.log(`[GameLauncher] Demande d'arrêt gracieux pour ${gameId}`);

        // Timeout pour arrêt forcé si nécessaire
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
    this.activeProcesses.delete(gameId);

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

    this.activeProcesses.forEach((processInfo, gameId) => {
      console.log(`[GameLauncher] Arrêt forcé de ${gameId}`);
      this.stopGame(gameId, true);
    });

    this.sessionTrackers.forEach((interval) => clearInterval(interval));
    this.sessionTrackers.clear();

    console.log("[GameLauncher] ✅ Nettoyage terminé");
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
