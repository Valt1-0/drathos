import fs from "fs";
import path from "path";
import logger from "./utils/logger.js";

export class SimpleExecutableDetector {
  async getBestExecutable(gamePath, gameName = "") {
    try {
      logger.debug(`[SimpleDetector] Searching in: ${gamePath}`);

      try {
        await fs.promises.access(gamePath);
      } catch {
        throw new Error(`Folder not found: ${gamePath}`);
      }

      const executables = await this.findExecutables(gamePath, gamePath);

      if (executables.length === 0) {
        logger.debug("[SimpleDetector] No executable found");
        return null;
      }

      const scored = this.scoreExecutables(executables, gameName);
      const best = scored[0];

      logger.debug(`[SimpleDetector] Best executable: ${best.relativePath}`);
      logger.debug(
        `[SimpleDetector] Score: ${best.score}, Reasons: ${best.reasons.join(", ")}`
      );

      return best.relativePath;
    } catch (error) {
      logger.error("[SimpleDetector] Error:", error);
      return null;
    }
  }

  isExecutableFile(fileName, stats) {
    const platform = process.platform;
    const lower = fileName.toLowerCase();

    switch (platform) {
      case 'win32':
        return lower.endsWith('.exe') || lower.endsWith('.bat') || lower.endsWith('.cmd');

      case 'linux': {
        const hasExecutableExtension = lower.endsWith('.sh') || lower.endsWith('.run') ||
                                       lower.endsWith('.bin') || lower.endsWith('.appimage');
        const hasExecutablePermission = stats && (stats.mode & 0o111) !== 0;
        return hasExecutableExtension || hasExecutablePermission;
      }

      default:
        return false;
    }
  }

  async findExecutables(currentPath, basePath, depth = 0) {
    const executables = [];

    if (depth > 3) {
      return executables;
    }

    try {
      const items = await fs.promises.readdir(currentPath);

      await Promise.all(
        items.map(async (item) => {
          const itemPath = path.join(currentPath, item);

          try {
            const stats = await fs.promises.stat(itemPath);

            if (stats.isFile() && this.isExecutableFile(item, stats)) {
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

              logger.debug(`[SimpleDetector] Found: ${relativePath}`);
            } else if (stats.isDirectory() && !this.shouldIgnoreDirectory(item)) {
              const subExecutables = await this.findExecutables(
                itemPath,
                basePath,
                depth + 1
              );
              executables.push(...subExecutables);
            }
          } catch (statError) {
            logger.warn(`[SimpleDetector] Cannot access ${itemPath}: ${statError.message}`);
          }
        })
      );
    } catch (readError) {
      logger.warn(`[SimpleDetector] Cannot read ${currentPath}: ${readError.message}`);
    }

    return executables;
  }

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

  scoreExecutables(executables, gameName) {
    const gameNameClean = gameName.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const exec of executables) {
      const fileName = exec.fileName.toLowerCase();
      const fileNameClean = fileName.replace(/[^a-z0-9]/g, "");

      exec.score = 0;
      exec.reasons = [];

      if (gameNameClean && fileNameClean.includes(gameNameClean)) {
        exec.score += 100;
        exec.reasons.push("Nom du jeu dans le fichier");
      }

      const commonNames = ["game", "main", "launcher", "start", "run", "play"];
      for (const name of commonNames) {
        if (fileNameClean.includes(name)) {
          exec.score += 50;
          exec.reasons.push(`Nom courant: ${name}`);
          break;
        }
      }

      if (exec.size > 50 * 1024 * 1024) {
        exec.score += 30;
        exec.reasons.push("Fichier volumineux");
      } else if (exec.size > 5 * 1024 * 1024) {
        exec.score += 20;
        exec.reasons.push("Fichier de taille moyenne");
      }

      exec.score -= exec.depth * 5;

      if (exec.depth === 0) {
        exec.score += 25;
        exec.reasons.push("Dossier racine");
      }

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

    return executables.sort((a, b) => b.score - a.score);
  }

  async listAllExecutables(gamePath, gameName = "") {
    try {
      const executables = await this.findExecutables(gamePath, gamePath);
      return this.scoreExecutables(executables, gameName);
    } catch (error) {
      logger.error("[SimpleDetector] Error listing executables:", error);
      return [];
    }
  }
}
