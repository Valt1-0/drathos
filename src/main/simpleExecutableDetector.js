// drathos/src/main/simpleExecutableDetector.js

import fs from "fs";
import path from "path";

export class SimpleExecutableDetector {
  /**
   * Trouve tous les fichiers .exe dans un dossier et ses sous-dossiers
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu (pour scoring)
   * @returns {Promise<string|null>} Chemin relatif vers le meilleur exécutable
   */
  async getBestExecutable(gamePath, gameName = "") {
    try {
      console.log(`[SimpleDetector] Recherche dans: ${gamePath}`);

      if (!fs.existsSync(gamePath)) {
        throw new Error(`Dossier non trouvé: ${gamePath}`);
      }

      const executables = this.findExecutables(gamePath, gamePath);

      if (executables.length === 0) {
        console.log("[SimpleDetector] Aucun exécutable trouvé");
        return null;
      }

      // Trier par pertinence
      const scored = this.scoreExecutables(executables, gameName);
      const best = scored[0];

      console.log(`[SimpleDetector] Meilleur exécutable: ${best.relativePath}`);
      console.log(
        `[SimpleDetector] Score: ${best.score}, Raisons: ${best.reasons.join(
          ", "
        )}`
      );

      return best.relativePath;
    } catch (error) {
      console.error("[SimpleDetector] Erreur:", error);
      return null;
    }
  }

  /**
   * Recherche récursive de tous les .exe
   * @param {string} currentPath - Dossier actuel à scanner
   * @param {string} basePath - Dossier racine pour calculer le chemin relatif
   * @param {number} depth - Profondeur actuelle (limite à 3 niveaux)
   * @returns {Array} Liste des exécutables trouvés
   */
  findExecutables(currentPath, basePath, depth = 0) {
    const executables = [];

    // Limiter la profondeur pour éviter des scans trop longs
    if (depth > 3) {
      return executables;
    }

    try {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const itemPath = path.join(currentPath, item);

        try {
          const stats = fs.statSync(itemPath);

          if (stats.isFile() && item.toLowerCase().endsWith(".exe")) {
            // Calculer le chemin relatif depuis le dossier de base
            const relativePath = path.relative(basePath, itemPath);

            executables.push({
              fileName: item,
              fullPath: itemPath,
              relativePath: relativePath,
              directory: path.dirname(relativePath),
              size: stats.size,
              depth: depth,
              score: 0,
              reasons: [],
            });

            console.log(`[SimpleDetector] Trouvé: ${relativePath}`);
          } else if (stats.isDirectory() && !this.shouldIgnoreDirectory(item)) {
            // Recherche récursive dans les sous-dossiers
            const subExecutables = this.findExecutables(
              itemPath,
              basePath,
              depth + 1
            );
            executables.push(...subExecutables);
          }
        } catch (statError) {
          // Ignorer les erreurs de fichiers inaccessibles
          console.warn(
            `[SimpleDetector] Impossible d'accéder à ${itemPath}:`,
            statError.message
          );
        }
      }
    } catch (readError) {
      console.warn(
        `[SimpleDetector] Impossible de lire ${currentPath}:`,
        readError.message
      );
    }

    return executables;
  }

  /**
   * Vérifie si un dossier doit être ignoré
   * @param {string} dirName - Nom du dossier
   * @returns {boolean} True si le dossier doit être ignoré
   */
  shouldIgnoreDirectory(dirName) {
    const ignoredDirs = [
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
      "System",
      "Windows",
      "Program Files",
    ];

    return ignoredDirs.some((ignored) =>
      dirName.toLowerCase().includes(ignored.toLowerCase())
    );
  }

  /**
   * Attribue un score de pertinence à chaque exécutable
   * @param {Array} executables - Liste des exécutables
   * @param {string} gameName - Nom du jeu
   * @returns {Array} Exécutables triés par score
   */
  scoreExecutables(executables, gameName) {
    const gameNameClean = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const exec of executables) {
      const fileName = exec.fileName.toLowerCase();
      const fileNameClean = fileName.replace(/[^a-z0-9]/g, "");

      // Reset score
      exec.score = 0;
      exec.reasons = [];

      // Bonus si le nom du fichier correspond au nom du jeu
      if (gameNameClean && fileNameClean.includes(gameNameClean)) {
        exec.score += 100;
        exec.reasons.push("Nom du jeu dans le fichier");
      }

      // Bonus pour les noms d'exécutables courants
      const commonNames = ["game", "main", "launcher", "start", "run", "play"];
      for (const name of commonNames) {
        if (fileNameClean.includes(name)) {
          exec.score += 50;
          exec.reasons.push(`Nom courant: ${name}`);
          break;
        }
      }

      // Bonus pour les gros fichiers (probablement le jeu principal)
      if (exec.size > 50 * 1024 * 1024) {
        // 50MB+
        exec.score += 30;
        exec.reasons.push("Fichier volumineux");
      } else if (exec.size > 5 * 1024 * 1024) {
        // 5MB+
        exec.score += 20;
        exec.reasons.push("Fichier de taille moyenne");
      }

      // Malus pour la profondeur (privilégier les fichiers proches de la racine)
      exec.score -= exec.depth * 5;

      // Bonus pour être à la racine
      if (exec.depth === 0) {
        exec.score += 25;
        exec.reasons.push("Dossier racine");
      }

      // Malus pour certains mots-clés
      const penaltyWords = [
        "uninstall",
        "setup",
        "install",
        "config",
        "tool",
        "util",
        "crash",
      ];
      for (const word of penaltyWords) {
        if (fileName.includes(word)) {
          exec.score -= 30;
          exec.reasons.push(`Malus: ${word}`);
        }
      }
    }

    // Trier par score décroissant
    return executables.sort((a, b) => b.score - a.score);
  }

  /**
   * Liste tous les exécutables trouvés (pour debug)
   * @param {string} gamePath - Chemin vers le dossier du jeu
   * @param {string} gameName - Nom du jeu
   * @returns {Promise<Array>} Liste de tous les exécutables
   */
  async listAllExecutables(gamePath, gameName = "") {
    try {
      const executables = this.findExecutables(gamePath, gamePath);
      return this.scoreExecutables(executables, gameName);
    } catch (error) {
      console.error("[SimpleDetector] Erreur listage:", error);
      return [];
    }
  }
}
