import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import { jwtDecode } from "jwt-decode";
import { extractionEngine } from "./extractionEngine.js";
import { buildServerUrl } from "./utils/urlHelper.js";

export class GameEngine {
  constructor() {
    this.config = {
      chunkSize: 64 * 1024,
      bufferSize: 512 * 1024,
      progressUpdateInterval: 100,
      speedSamples: 10,
      maxRetries: 3,
      retryDelay: 1000,
      // ⚠️ Mettre à false en production si certificat valide (Let's Encrypt)
      allowSelfSignedCerts: true, // Pour dev/serveurs avec certificats auto-signés
    };

    this.activeDownloads = new Map();
    this.metrics = new Map();

    // Cancel/Pause state
    this.cancelled = false;
    this.paused = false;
    this.pausedResolve = null;

    // Agent HTTPS pour les certificats auto-signés (self-hosting support)
    this.httpsAgent = null;
    if (this.config.allowSelfSignedCerts) {
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
    }
  }

  cancel() {
    this.cancelled = true;
    // If paused, unblock the pause so it can exit
    if (this.pausedResolve) {
      this.pausedResolve();
      this.pausedResolve = null;
    }
  }

  pause() {
    if (this.paused) {
      // Already paused, treat as resume
      this.resume();
      return;
    }
    this.paused = true;
  }

  resume() {
    this.paused = false;
    if (this.pausedResolve) {
      this.pausedResolve();
      this.pausedResolve = null;
    }
  }

  async installGame(serverGame, { store, sendProgress }) {
    const gameId = serverGame._id;

    try {
      console.log(`[GameEngine] Installation: ${serverGame.name}`);

      if (!serverGame._id || !serverGame.zipFileName) {
        throw new Error("Données du jeu invalides");
      }

      this.initializeFromStore(store, sendProgress, gameId);

      const filePath = await this.downloadGameFile(serverGame);
      const extractPath = await this.extractGameFile(filePath, serverGame);
      await this.finalizeInstallation(filePath, extractPath, serverGame);

      console.log(`[GameEngine] Installation réussie: ${serverGame.name}`);

      this.cleanupDownload(gameId);

      return { success: true, path: extractPath };
    } catch (error) {
      console.error(
        `[GameEngine] Installation échouée: ${serverGame.name}`,
        error
      );

      if (error.message === "CANCELLED") {
        this.sendProgress({
          id: gameId,
          stage: "cancelled",
          progress: 0,
          message: "Download cancelled by user",
        });
        this.cleanupDownload(gameId);
        return { success: false, error: "CANCELLED" };
      }

      this.sendProgress({
        id: gameId,
        stage: "failed",
        progress: 0,
        error: error.message,
      });

      this.cleanupDownload(gameId);

      return { success: false, error: error.message };
    }
  }
  initializeFromStore(store, progressCallback, gameId) {
    this.store = store;
    this.sendProgress = progressCallback;
    this.downloadPath = this.initializeDownloadPath(store);
    this.serverAddress = store.get("serverAddress");
    this.userToken = store.get("userToken");
    this.initializeMetrics(gameId);
  }
  initializeDownloadPath(store) {
    let downloadPath = store.get("downloadPath");

    if (
      downloadPath &&
      typeof downloadPath === "string" &&
      downloadPath.trim() !== ""
    ) {
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }
      return downloadPath;
    }

    const defaultPath = path.join(
      os.homedir(),
      "Documents",
      "Drathos",
      "Downloads"
    );
    if (!fs.existsSync(defaultPath)) {
      fs.mkdirSync(defaultPath, { recursive: true });
    }

    return defaultPath;
  }

  async downloadGameFile(serverGame) {
    const gameId = serverGame._id;

    const originalExtension = path.extname(serverGame.zipFileName).toLowerCase();
    const fileName = `${serverGame.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${gameId}${originalExtension || ".zip"}`;
    const filePath = path.join(this.downloadPath, fileName);

    this.activeDownloads.set(gameId, {
      stage: "downloading",
      filePath,
      startTime: Date.now(),
    });

    this.sendProgress({
      id: gameId,
      stage: "downloading",
      progress: 0,
      message: "Connexion au serveur...",
    });

    const downloadUrl = buildServerUrl(this.serverAddress, `/api/serverGame/downloadGame/${gameId}`);

    // Déclarer les ressources à nettoyer en cas d'erreur
    let fileStream = null;
    let reader = null;

    // Track bytes for resume support
    let downloadedBytes = 0;
    let totalSize = 0;

    try {
      // Check if we have a partial file to resume from
      if (fs.existsSync(filePath)) {
        downloadedBytes = fs.statSync(filePath).size;
      }

      let fetchHeaders = { Authorization: `Bearer ${this.userToken}` };
      if (downloadedBytes > 0) {
        fetchHeaders["Range"] = `bytes=${downloadedBytes}-`;
      }

      let response = await fetch(downloadUrl, {
        headers: fetchHeaders,
        agent: (downloadUrl.startsWith('https:') && this.httpsAgent) ? this.httpsAgent : undefined,
      });

      // 416 = Range Not Satisfiable → delete partial file and retry from scratch
      if (response.status === 416) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
        downloadedBytes = 0;
        fetchHeaders = { Authorization: `Bearer ${this.userToken}` };
        response = await fetch(downloadUrl, {
          headers: fetchHeaders,
          agent: (downloadUrl.startsWith('https:') && this.httpsAgent) ? this.httpsAgent : undefined,
        });
      }

      if (!response.ok && response.status !== 206) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (response.status === 206) {
        // Partial content - extract total size from Content-Range header
        const contentRange = response.headers.get("content-range");
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) totalSize = parseInt(match[1], 10);
        }
      } else {
        totalSize = parseInt(response.headers.get("content-length") || "0");
        // Full response means server didn't support range or fresh download, reset
        downloadedBytes = 0;
      }

      // Append mode if resuming, otherwise overwrite
      fileStream = fs.createWriteStream(filePath, {
        flags: downloadedBytes > 0 ? "a" : "w",
      });

      reader = response.body.getReader();

      while (true) {
        // Check cancel flag
        if (this.cancelled) {
          await reader.cancel().catch(() => {});
          fileStream.destroy();
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (e) {
            console.warn(`[GameEngine] Could not delete partial file: ${e.message}`);
          }
          throw new Error("CANCELLED");
        }

        // Check pause flag
        if (this.paused) {
          this.sendProgress({
            id: gameId,
            stage: "paused",
            progress: totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0,
            sizeDownloaded: downloadedBytes / (1024 * 1024),
            totalSize: totalSize / (1024 * 1024),
            message: "Download paused",
          });
          // Wait until resume or cancel
          await new Promise(resolve => { this.pausedResolve = resolve; });
          // After resume, check if cancelled during pause
          if (this.cancelled) {
            await reader.cancel().catch(() => {});
            fileStream.destroy();
            try {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (e) {
              console.warn(`[GameEngine] Could not delete partial file: ${e.message}`);
            }
            throw new Error("CANCELLED");
          }
          this.sendProgress({
            id: gameId,
            stage: "downloading",
            progress: totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0,
            sizeDownloaded: downloadedBytes / (1024 * 1024),
            totalSize: totalSize / (1024 * 1024),
            message: "Download resumed",
          });
        }

        const { done, value } = await reader.read();

        if (done) break;

        fileStream.write(value);
        downloadedBytes += value.length;

        // Mise à jour des métriques et progression
        this.updateMetrics(gameId, downloadedBytes, totalSize);

        if (this.shouldSendProgressUpdate(gameId)) {
          const metrics = this.metrics.get(gameId);
          this.sendProgress({
            id: gameId,
            stage: "downloading",
            progress: Math.round((downloadedBytes / totalSize) * 100),
            sizeDownloaded: downloadedBytes / (1024 * 1024), // MB
            totalSize: totalSize / (1024 * 1024), // MB
            speed: metrics.avgSpeed / (1024 * 1024), // MB/s
            instantSpeed: metrics.instantSpeed / (1024 * 1024), // MB/s
            eta: metrics.eta,
            elapsedTime: Date.now() - metrics.startTime,
          });
        }
      }

      fileStream.end();

      await new Promise((resolve, reject) => {
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });

      const downloadedSize = fs.statSync(filePath).size;
      if (totalSize > 0 && downloadedSize !== totalSize) {
        throw new Error(
          `Fichier incomplet: ${downloadedSize} octets reçus sur ${totalSize} attendus`
        );
      }

      return filePath;
    } catch (error) {
      // Propagate CANCELLED without wrapping
      if (error.message === "CANCELLED") throw error;

      console.error(`[GameEngine] Erreur de téléchargement:`, error.message);

      // Nettoyer les ressources pour éviter les memory leaks
      try {
        if (reader) await reader.cancel().catch(() => {});
      } catch (cleanupError) { /* ignore */ }

      try {
        if (fileStream) fileStream.destroy();
      } catch (cleanupError) { /* ignore */ }

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(
          `[GameEngine] Impossible de supprimer le fichier partiel: ${cleanupError.message}`
        );
      }

      throw new Error(`Erreur de téléchargement: ${error.message}`);
    }
  }

  sanitizeGameName(gameName) {
    // Remove or replace filesystem-unsafe characters: / \ : * ? " < > |
    // Also remove leading/trailing spaces and dots (Windows restrictions)
    return gameName
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\.+|\.+$/g, '');
  }

  async extractGameFile(filePath, serverGame) {
    const gameId = serverGame._id;
    const sanitizedName = this.sanitizeGameName(serverGame.name);
    const extractPath = path.join(this.downloadPath, sanitizedName);

    // Check cancel before starting extraction
    if (this.cancelled) {
      this.cleanupFiles(filePath, null);
      throw new Error("CANCELLED");
    }

    console.log(`[GameEngine] Extraction vers: ${extractPath}`);

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    this.sendProgress({
      id: gameId,
      stage: "extracting",
      progress: 0,
      message: "Analyse de l'archive...",
    });

    const fileExtension = extractionEngine.getFileExtension(filePath);

    try {
      if (extractionEngine.isSupported(fileExtension)) {
        const result = await extractionEngine.extract(
          filePath,
          extractPath,
          (progress, extractedFiles, totalFiles, currentFile) => {
            this.sendProgress({
              id: gameId,
              stage: "extracting",
              progress: progress,
              extractedFiles: extractedFiles,
              totalFiles: totalFiles,
              currentFile: currentFile,
              message: `Extraction: ${extractedFiles}/${totalFiles} fichiers`,
            });
          }
        );

        // Check cancel after extraction completes
        if (this.cancelled) {
          this.cleanupFiles(filePath, extractPath);
          throw new Error("CANCELLED");
        }

        return result;
      } else {
        throw new Error(
          `Format non supporté: ${fileExtension}. Formats supportés: ${extractionEngine.getSupportedFormats().join(", ")}`
        );
      }
    } catch (error) {
      if (error.message === "CANCELLED") {
        this.cleanupFiles(filePath, extractPath);
        throw error;
      }
      console.error(`[GameEngine] Extraction failed:`, error.message);
      throw new Error(`Erreur d'extraction: ${error.message}`);
    }
  }


  async finalizeInstallation(filePath, extractPath, serverGame) {
    const gameId = serverGame._id;

    // Check cancel before finalizing
    if (this.cancelled) {
      this.cleanupFiles(filePath, extractPath);
      throw new Error("CANCELLED");
    }

    console.log(`[GameEngine] Finalisation: ${serverGame.name}...`);

    this.sendProgress({
      id: gameId,
      stage: "finalizing",
      progress: 0,
      message: "Finalisation...",
    });

    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      console.warn(`[GameEngine] Impossible de supprimer le fichier temporaire: ${err.message}`);
    }

    // Calculer la taille installée (en MB)
    let installSizeMB = 0;
    try {
      const sizeBytes = await this.calculateDirSize(extractPath);
      installSizeMB = Math.round(sizeBytes / (1024 * 1024));
      console.log(`[GameEngine] Taille installée: ${installSizeMB} MB`);
    } catch (err) {
      console.warn(`[GameEngine] Impossible de calculer la taille installée: ${err.message}`);
    }

    const decoded = jwtDecode(this.userToken);
    const url = buildServerUrl(this.serverAddress, '/api/installedGames/addInstalledGame');
    const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.userToken}`,
        },
        agent: (url.startsWith('https:') && this.httpsAgent) ? this.httpsAgent : undefined,
        body: JSON.stringify({
          userId: decoded.user.id,
          serverGameId: gameId,
          path: extractPath,
          version: serverGame.version,
          installSize: installSizeMB,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.message || `HTTP ${response.status}`);
    }

    // Préparer les données du cache (le main process fera la mise à jour atomique)
    const cacheData = {
      name: serverGame.name,
      summary: serverGame.summary,
      storyline: serverGame.storyline,
      coverUrl: serverGame.coverUrl,
      version: serverGame.version || "1.0.0",
      sizeMB: serverGame.sizeMB,
      installSize: installSizeMB,
      executable: serverGame.executableName || null,
      platforms: serverGame.platforms || [],
      genres: (serverGame.genres || []).map(g => ({
        name: g.name,
        slug: g.slug
      })),
      rating: serverGame.rating || 0,
      aggregatedRating: serverGame.aggregatedRating || 0,
      releaseDate: serverGame.releaseDate,
      developer: serverGame.developer,
      publisher: serverGame.publisher,
      path: extractPath,
      installedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      stats: {
        currentSession: {
          startTime: null,
          isPlaying: false,
        },
        totalPlayTime: 0,
        totalSessions: 0,
        lastPlayed: null,
        firstLaunched: null,
      },
    };

    const metrics = this.metrics.get(gameId);
    this.sendProgress({
      id: gameId,
      stage: "completed",
      progress: 100,
      totalTime: Date.now() - metrics.startTime,
      avgSpeed: metrics.avgSpeed / (1024 * 1024), // MB/s
      finalPath: extractPath,
      cacheData,
      message: "Installation terminée !",
    });
  }

  initializeMetrics(gameId) {
    this.metrics.set(gameId, {
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      lastProgressSent: Date.now(),
      lastBytes: 0,
      speeds: [],
      avgSpeed: 0,
      instantSpeed: 0,
      eta: 0,
    });
  }

  updateMetrics(gameId, downloadedBytes, totalSize) {
    const metrics = this.metrics.get(gameId);
    if (!metrics) return;

    const now = Date.now();
    const timeDelta = (now - metrics.lastUpdateTime) / 1000; // secondes

    if (timeDelta > 0) {
      const bytesDelta = downloadedBytes - metrics.lastBytes;
      const instantSpeed = bytesDelta / timeDelta; // bytes/s

      // Ajouter à l'historique des vitesses
      metrics.speeds.push(instantSpeed);
      if (metrics.speeds.length > this.config.speedSamples) {
        metrics.speeds.shift();
      }

      // Calculer la vitesse moyenne
      const avgSpeed =
        metrics.speeds.reduce((a, b) => a + b, 0) / metrics.speeds.length;

      // Calculer l'ETA
      const remainingBytes = totalSize - downloadedBytes;
      const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

      // Mettre à jour les métriques
      metrics.lastUpdateTime = now;
      metrics.lastBytes = downloadedBytes;
      metrics.instantSpeed = instantSpeed;
      metrics.avgSpeed = avgSpeed;
      metrics.eta = eta;
    }
  }

  shouldSendProgressUpdate(gameId) {
    const metrics = this.metrics.get(gameId);
    if (!metrics) return false;

    const now = Date.now();
    const timeSinceLastProgress = now - metrics.lastProgressSent;

    if (timeSinceLastProgress >= this.config.progressUpdateInterval) {
      metrics.lastProgressSent = now;
      return true;
    }

    return false;
  }

  async calculateDirSize(dirPath) {
    const items = await fs.promises.readdir(dirPath);
    const sizes = await Promise.all(items.map(async (item) => {
      try {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(itemPath);
        return stats.isDirectory() ? await this.calculateDirSize(itemPath) : stats.size;
      } catch {
        return 0;
      }
    }));
    return sizes.reduce((sum, s) => sum + s, 0);
  }

  cleanupFiles(filePath, extractPath) {
    try {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) { /* ignore */ }
    try {
      if (extractPath && fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
    } catch (e) { /* ignore */ }
  }

  cleanupDownload(gameId) {
    this.activeDownloads.delete(gameId);
    this.metrics.delete(gameId);
  }
}
