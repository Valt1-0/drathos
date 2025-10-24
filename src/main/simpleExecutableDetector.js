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

      // Vérifier l'existence de manière asynchrone
      try {
        await fs.promises.access(gamePath);
      } catch {
        throw new Error(`Dossier non trouvé: ${gamePath}`);
      }

      const executables = await this.findExecutables(gamePath, gamePath);

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
   * Vérifie si un fichier est un exécutable selon la plateforme
   * @param {string} fileName - Nom du fichier
   * @param {object} stats - Stats du fichier
   * @returns {boolean} True si le fichier est un exécutable
   */
  isExecutableFile(fileName, stats) {
    const platform = process.platform;
    const lower = fileName.toLowerCase();

    switch (platform) {
      case 'win32':
        return lower.endsWith('.exe') || lower.endsWith('.bat') || lower.endsWith('.cmd');

      case 'linux':
        // Sur Linux: .sh, .run, .bin, .AppImage, ou fichiers avec permissions exécutables
        const hasExecutableExtension = lower.endsWith('.sh') || lower.endsWith('.run') ||
                                       lower.endsWith('.bin') || lower.endsWith('.appimage');
        const hasExecutablePermission = stats && (stats.mode & 0o111) !== 0;
        return hasExecutableExtension || hasExecutablePermission;

      case 'darwin':
        // Sur macOS: .app (bundle), .command, .sh
        return fileName.endsWith('.app') || lower.endsWith('.command') || lower.endsWith('.sh');

      default:
        return false;
    }
  }

  /**
   * Recherche récursive de tous les exécutables (version asynchrone multiplateforme)
   * @param {string} currentPath - Dossier actuel à scanner
   * @param {string} basePath - Dossier racine pour calculer le chemin relatif
   * @param {number} depth - Profondeur actuelle (limite à 3 niveaux)
   * @returns {Promise<Array>} Liste des exécutables trouvés
   */
  async findExecutables(currentPath, basePath, depth = 0) {
    const executables = [];

    // Limiter la profondeur pour éviter des scans trop longs
    if (depth > 3) {
      return executables;
    }

    try {
      const items = await fs.promises.readdir(currentPath);

      // Traiter les items en parallèle pour de meilleures performances
      await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(currentPath, item);

          try {
            const stats = await fs.promises.stat(itemPath);

            if (stats.isFile() && this.isExecutableFile(item, stats)) {
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
              const subExecutables = await this.findExecutables(
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
        })
      );
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
      const executables = await this.findExecutables(gamePath, gamePath);
      return this.scoreExecutables(executables, gameName);
    } catch (error) {
      console.error("[SimpleDetector] Erreur listage:", error);
      return [];
    }
  }
}
