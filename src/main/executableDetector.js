// drathos/src/main/executableDetector.js

import fs from "fs";
import path from "path";

export class ExecutableDetector {
  constructor() {
    // Extensions d'exécutables par plateforme
    this.executableExtensions =
      process.platform === "win32"
        ? [".exe", ".bat", ".cmd"]
        : ["", ".sh", ".run"];

    // Noms d'exécutables courants
    this.commonExecutableNames = [
      "game",
      "main",
      "launcher",
      "start",
      "run",
      "play",
      "client",
      "app",
      "application",
      "GameLauncher",
    ];

    // Dossiers à ignorer lors de la recherche
    this.ignoredDirectories = [
      "node_modules",
      ".git",
      "temp",
      "tmp",
      "cache",
      "logs",
      "Uninstall",
      "Redist",
      "DirectX",
      "vcredist",
      "_CommonRedist",
    ];
  }

  /**
   * Détecte automatiquement l'exécutable principal d'un jeu
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu pour aider la détection
   * @returns {Promise<Array>} Liste des exécutables potentiels
   */
  async detectExecutables(gamePath, gameName = "") {
    try {
      if (!fs.existsSync(gamePath)) {
        throw new Error(`Le dossier n'existe pas: ${gamePath}`);
      }

      console.log(
        `[ExecutableDetector] Recherche d'exécutables dans: ${gamePath}`
      );

      const executables = [];
      const gameNameLower = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

      // Recherche dans le dossier principal
      const mainExecs = this.scanDirectory(gamePath, gameName);
      executables.push(...mainExecs);

      // Recherche dans les sous-dossiers (profondeur limitée)
      const subDirs = this.getSubDirectories(gamePath);
      for (const subDir of subDirs) {
        const subExecs = this.scanDirectory(subDir, gameName, 1);
        executables.push(...subExecs);
      }

      // Trier par score de pertinence
      const sortedExecutables = this.scoreExecutables(executables, gameName);

      console.log(
        `[ExecutableDetector] Trouvé ${sortedExecutables.length} exécutable(s):`,
        sortedExecutables.map((e) => e.fileName)
      );

      return sortedExecutables;
    } catch (error) {
      console.error("[ExecutableDetector] Erreur lors de la détection:", error);
      return [];
    }
  }

  /**
   * Scanne un dossier pour trouver les exécutables
   * @param {string} dirPath - Chemin du dossier
   * @param {string} gameName - Nom du jeu
   * @param {number} depth - Profondeur actuelle (pour limiter la récursion)
   * @returns {Array} Liste des exécutables trouvés
   */
  scanDirectory(dirPath, gameName, depth = 0) {
    const executables = [];

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && this.isExecutable(file)) {
          const execInfo = this.analyzeExecutable(filePath, gameName, depth);
          if (execInfo) {
            executables.push(execInfo);
          }
        }
      }
    } catch (error) {
      console.warn(
        `[ExecutableDetector] Impossible de scanner ${dirPath}:`,
        error.message
      );
    }

    return executables;
  }

  /**
   * Vérifie si un fichier est un exécutable
   * @param {string} fileName - Nom du fichier
   * @returns {boolean} True si c'est un exécutable
   */
  isExecutable(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    // Sur Windows, vérifier les extensions
    if (process.platform === "win32") {
      return this.executableExtensions.includes(ext);
    }

    // Sur Unix/Linux, vérifier les permissions et extensions
    return this.executableExtensions.includes(ext) || ext === "";
  }

  /**
   * Analyse un exécutable et lui attribue un score
   * @param {string} filePath - Chemin vers l'exécutable
   * @param {string} gameName - Nom du jeu
   * @param {number} depth - Profondeur dans l'arborescence
   * @returns {Object|null} Informations sur l'exécutable
   */
  analyzeExecutable(filePath, gameName, depth) {
    try {
      const fileName = path.basename(filePath);
      const fileNameLower = fileName.toLowerCase();
      const stats = fs.statSync(filePath);

      // Ignorer les fichiers très petits (probablement des utilitaires)
      if (stats.size < 50 * 1024) {
        // 50KB minimum
        return null;
      }

      const execInfo = {
        fileName,
        filePath,
        relativePath: path.relative(path.dirname(filePath), filePath),
        directory: path.dirname(filePath),
        size: stats.size,
        depth,
        score: 0,
        reasons: [],
      };

      // Calculer le score de pertinence
      this.calculateExecutableScore(execInfo, gameName);

      return execInfo;
    } catch (error) {
      console.warn(
        `[ExecutableDetector] Erreur lors de l'analyse de ${filePath}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Calcule le score de pertinence d'un exécutable
   * @param {Object} execInfo - Informations sur l'exécutable
   * @param {string} gameName - Nom du jeu
   */
  calculateExecutableScore(execInfo, gameName) {
    const fileName = execInfo.fileName.toLowerCase();
    const gameNameLower = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Bonus si le nom correspond au jeu
    if (gameNameLower && fileName.includes(gameNameLower)) {
      execInfo.score += 100;
      execInfo.reasons.push("Nom du jeu dans le fichier");
    }

    // Bonus pour les noms d'exécutables courants
    for (const commonName of this.commonExecutableNames) {
      if (fileName.includes(commonName.toLowerCase())) {
        execInfo.score += 50;
        execInfo.reasons.push(`Nom courant: ${commonName}`);
        break;
      }
    }

    // Bonus pour la taille du fichier (les gros fichiers sont souvent le jeu principal)
    if (execInfo.size > 50 * 1024 * 1024) {
      // 50MB+
      execInfo.score += 30;
      execInfo.reasons.push("Fichier volumineux");
    } else if (execInfo.size > 10 * 1024 * 1024) {
      // 10MB+
      execInfo.score += 20;
      execInfo.reasons.push("Fichier de taille moyenne");
    }

    // Malus pour la profondeur (privilégier les fichiers à la racine)
    execInfo.score -= execInfo.depth * 10;

    // Malus pour certains mots-clés (utilitaires, désinstalleurs, etc.)
    const penaltyKeywords = [
      "uninstall",
      "setup",
      "install",
      "config",
      "settings",
      "tool",
      "util",
    ];
    for (const keyword of penaltyKeywords) {
      if (fileName.includes(keyword)) {
        execInfo.score -= 25;
        execInfo.reasons.push(`Malus: ${keyword}`);
      }
    }

    // Bonus pour être dans le dossier racine
    if (execInfo.depth === 0) {
      execInfo.score += 20;
      execInfo.reasons.push("Dossier racine");
    }
  }

  /**
   * Trie les exécutables par score de pertinence
   * @param {Array} executables - Liste des exécutables
   * @param {string} gameName - Nom du jeu
   * @returns {Array} Exécutables triés
   */
  scoreExecutables(executables, gameName) {
    return executables
      .filter((exec) => exec.score > -50) // Éliminer les très mauvais candidats
      .sort((a, b) => b.score - a.score); // Trier par score décroissant
  }

  /**
   * Obtient les sous-dossiers d'un répertoire (en ignorant certains)
   * @param {string} dirPath - Chemin du répertoire
   * @returns {Array} Liste des sous-dossiers
   */
  getSubDirectories(dirPath) {
    const subDirs = [];

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);

        if (fs.statSync(itemPath).isDirectory()) {
          // Ignorer certains dossiers
          if (!this.ignoredDirectories.includes(item)) {
            subDirs.push(itemPath);
          }
        }
      }
    } catch (error) {
      console.warn(
        `[ExecutableDetector] Impossible de lire les sous-dossiers de ${dirPath}:`,
        error.message
      );
    }

    return subDirs;
  }

  /**
   * Retourne le meilleur exécutable détecté
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu
   * @returns {Promise<string|null>} Nom du fichier exécutable ou null
   */
  async getBestExecutable(gamePath, gameName = "") {
    const executables = await this.detectExecutables(gamePath, gameName);

    if (executables.length === 0) {
      return null;
    }

    const best = executables[0];
    console.log(
      `[ExecutableDetector] Meilleur exécutable: ${best.fileName} (score: ${best.score})`
    );
    console.log(`[ExecutableDetector] Raisons: ${best.reasons.join(", ")}`);

    return best.fileName;
  }
}
