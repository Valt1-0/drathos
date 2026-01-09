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

    // Agent HTTPS pour les certificats auto-signés (self-hosting support)
    this.httpsAgent = null;
    if (this.config.allowSelfSignedCerts) {
      this.httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });
      console.log(`[GameEngine] ✅ Self-hosting mode: Certificats auto-signés acceptés`);
    }

    console.log(`[GameEngine] Système initialisé`);
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

    console.log(`[GameEngine] Téléchargement: ${fileName}`);
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

    console.log(`[GameEngine] URL de téléchargement: ${downloadUrl}`);
    console.log(`[GameEngine] Server address: ${this.serverAddress}`);

    // Déclarer les ressources à nettoyer en cas d'erreur
    let fileStream = null;
    let reader = null;

    try {
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${this.userToken}` },
        // Utilise l'agent custom seulement si HTTPS + allowSelfSignedCerts activé
        agent: (downloadUrl.startsWith('https:') && this.httpsAgent) ? this.httpsAgent : undefined,
      });

      console.log(`[GameEngine] R\u00e9ponse re\u00e7ue - Status: ${response.status}`);

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      const totalSize = parseInt(response.headers.get("content-length") || "0");
      console.log(`[GameEngine] Taille totale: ${totalSize} octets (${(totalSize / (1024 * 1024)).toFixed(2)} MB)`);

      let downloadedBytes = 0;

      fileStream = fs.createWriteStream(filePath);
      console.log(`[GameEngine] Stream cr\u00e9\u00e9: ${filePath}`);

      reader = response.body.getReader();
      console.log(`[GameEngine] Reader cr\u00e9\u00e9, d\u00e9but lecture...`);

      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`[GameEngine] Lecture termin\u00e9e - ${chunkCount} chunks re\u00e7us`);
          break;
        }

        chunkCount++;
        if (chunkCount === 1) {
          console.log(`[GameEngine] Premier chunk re\u00e7u (${value.length} octets)`);
        }

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

      console.log(`[GameEngine] Téléchargement terminé: ${fileName}`);

      const downloadedSize = fs.statSync(filePath).size;
      if (totalSize > 0 && downloadedSize !== totalSize) {
        throw new Error(
          `Fichier incomplet: ${downloadedSize} octets reçus sur ${totalSize} attendus`
        );
      }

      return filePath;
    } catch (error) {
      console.error(`[GameEngine] Erreur détaillée de fetch:`, error);
      console.error(`[GameEngine] Type d'erreur:`, error.constructor.name);
      console.error(`[GameEngine] Cause:`, error.cause);

      // ✅ FIX: Nettoyer les ressources pour éviter les memory leaks
      try {
        if (reader) {
          await reader.cancel().catch(() => {}); // Cancel le stream HTTP
          console.log(`[GameEngine] Reader nettoyé`);
        }
      } catch (cleanupError) {
        console.warn(`[GameEngine] Erreur cleanup reader: ${cleanupError.message}`);
      }

      try {
        if (fileStream) {
          fileStream.destroy(); // Ferme le file stream
          console.log(`[GameEngine] FileStream nettoyé`);
        }
      } catch (cleanupError) {
        console.warn(`[GameEngine] Erreur cleanup fileStream: ${cleanupError.message}`);
      }

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

    console.log(`[GameEngine] Extraction: ${path.basename(filePath)}`);
    console.log(`[GameEngine] Install path: ${extractPath}`);

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

    console.log(`[GameEngine] Format détecté: ${fileExtension}`);

    try {
      if (extractionEngine.isSupported(fileExtension)) {
        return await extractionEngine.extract(
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
      } else {
        throw new Error(
          `Format non supporté: ${fileExtension}. Formats supportés: ${extractionEngine.getSupportedFormats().join(", ")}`
        );
      }
    } catch (error) {
      console.error(`[GameEngine] ❌ Extraction failed:`, error.message);
      throw new Error(`Erreur d'extraction: ${error.message}`);
    }
  }


  async finalizeInstallation(filePath, extractPath, serverGame) {
    const gameId = serverGame._id;

    console.log(`[GameEngine] Finalisation: ${serverGame.name}`);

    this.sendProgress({
      id: gameId,
      stage: "finalizing",
      progress: 0,
      message: "Finalisation...",
    });

    try {
      await fs.promises.unlink(filePath);
      console.log(`[GameEngine] Fichier temporaire supprimé`);
    } catch (err) {
      console.warn(`[GameEngine] Impossible de supprimer le fichier temporaire: ${err.message}`);
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
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.message || `HTTP ${response.status}`);
    }

    console.log(`[GameEngine] Jeu enregistré dans l'API`);

    // ✅ FIX: Préparer les données du cache mais NE PAS écrire ici (race condition)
    // Le main process fera la mise à jour atomique du cache
    const cacheData = {
      name: serverGame.name,
      summary: serverGame.summary,
      storyline: serverGame.storyline,
      coverUrl: serverGame.coverUrl,
      version: serverGame.version || "1.0.0",
      sizeMB: serverGame.sizeMB,
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

    // Ne PAS mettre à jour le cache ici (race condition)
    console.log(`[GameEngine] Données du cache préparées (seront sauvegardées par le main process)`);

    const metrics = this.metrics.get(gameId);
    this.sendProgress({
      id: gameId,
      stage: "completed",
      progress: 100,
      totalTime: Date.now() - metrics.startTime,
      avgSpeed: metrics.avgSpeed / (1024 * 1024), // MB/s
      finalPath: extractPath,
      cacheData: cacheData, // ✅ Envoyer les données au main process
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

  cleanupDownload(gameId) {
    this.activeDownloads.delete(gameId);
    this.metrics.delete(gameId);
  }
}
