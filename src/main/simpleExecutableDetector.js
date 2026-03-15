// drathos/src/main/simpleExecutableDetector.js

import fs from "fs";
import path from "path";

export class SimpleExecutableDetector {
  /**
   * Finds all .exe files in a folder and its subfolders
   * @param {string} gamePath - Path to the game folder
   * @param {string} gameName - Game name (for scoring)
   * @returns {Promise<string|null>} Relative path to the best executable
   */
  async getBestExecutable(gamePath, gameName = "") {
    try {
      console.log(`[SimpleDetector] Recherche dans: ${gamePath}`);

      // Check existence asynchronously
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

      // Sort by relevance
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
   * Checks if a file is an executable according to the platform
   * @param {string} fileName - File name
   * @param {object} stats - File stats
   * @returns {boolean} True if the file is an executable
   */
  isExecutableFile(fileName, stats) {
    const platform = process.platform;
    const lower = fileName.toLowerCase();

    switch (platform) {
      case 'win32':
        return lower.endsWith('.exe') || lower.endsWith('.bat') || lower.endsWith('.cmd');

      case 'linux':
        // On Linux: .sh, .run, .bin, .AppImage, or files with executable permissions
        const hasExecutableExtension = lower.endsWith('.sh') || lower.endsWith('.run') ||
                                       lower.endsWith('.bin') || lower.endsWith('.appimage');
        const hasExecutablePermission = stats && (stats.mode & 0o111) !== 0;
        return hasExecutableExtension || hasExecutablePermission;

      case 'darwin':
        // On macOS: .app (bundle), .command, .sh
        return fileName.endsWith('.app') || lower.endsWith('.command') || lower.endsWith('.sh');

      default:
        return false;
    }
  }

  /**
   * Recursive search for all executables (async cross-platform version)
   * @param {string} currentPath - Current folder to scan
   * @param {string} basePath - Root folder for calculating relative path
   * @param {number} depth - Current depth (limited to 3 levels)
   * @returns {Promise<Array>} List of executables found
   */
  async findExecutables(currentPath, basePath, depth = 0) {
    const executables = [];

    // Limit depth to avoid overly long scans
    if (depth > 3) {
      return executables;
    }

    try {
      const items = await fs.promises.readdir(currentPath);

      // Process items in parallel for better performance
      await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(currentPath, item);

          try {
            const stats = await fs.promises.stat(itemPath);

            if (stats.isFile() && this.isExecutableFile(item, stats)) {
              // Calculate the relative path from the base folder
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
              // Recursive search in subfolders
              const subExecutables = await this.findExecutables(
                itemPath,
                basePath,
                depth + 1
              );
              executables.push(...subExecutables);
            }
          } catch (statError) {
            // Ignore errors for inaccessible files
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
   * Checks if a folder should be ignored
   * @param {string} dirName - Folder name
   * @returns {boolean} True if the folder should be ignored
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
   * Assigns a relevance score to each executable
   * @param {Array} executables - List of executables
   * @param {string} gameName - Game name
   * @returns {Array} Executables sorted by score
   */
  scoreExecutables(executables, gameName) {
    const gameNameClean = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const exec of executables) {
      const fileName = exec.fileName.toLowerCase();
      const fileNameClean = fileName.replace(/[^a-z0-9]/g, "");

      // Reset score
      exec.score = 0;
      exec.reasons = [];

      // Bonus if the file name matches the game name
      if (gameNameClean && fileNameClean.includes(gameNameClean)) {
        exec.score += 100;
        exec.reasons.push("Nom du jeu dans le fichier");
      }

      // Bonus for common executable names
      const commonNames = ["game", "main", "launcher", "start", "run", "play"];
      for (const name of commonNames) {
        if (fileNameClean.includes(name)) {
          exec.score += 50;
          exec.reasons.push(`Nom courant: ${name}`);
          break;
        }
      }

      // Bonus for large files (likely the main game)
      if (exec.size > 50 * 1024 * 1024) {
        // 50MB+
        exec.score += 30;
        exec.reasons.push("Fichier volumineux");
      } else if (exec.size > 5 * 1024 * 1024) {
        // 5MB+
        exec.score += 20;
        exec.reasons.push("Fichier de taille moyenne");
      }

      // Penalty for depth (prefer files closer to the root)
      exec.score -= exec.depth * 5;

      // Bonus for being at the root
      if (exec.depth === 0) {
        exec.score += 25;
        exec.reasons.push("Dossier racine");
      }

      // Penalty for certain keywords
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

    // Sort by descending score
    return executables.sort((a, b) => b.score - a.score);
  }

  /**
   * Lists all executables found (for debugging)
   * @param {string} gamePath - Path to the game folder
   * @param {string} gameName - Game name
   * @returns {Promise<Array>} List of all executables
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
