// src/main/DownloadEngine.js - Version Simple et Stable 🚀

import fs from "fs";
import path from "path";
import os from "os";
import unzipper from "unzipper";
import { jwtDecode } from "jwt-decode";

export class DownloadEngine {
  constructor(store, progressCallback) {
    this.store = store;
    this.sendProgress = progressCallback;

    // Configuration simple et efficace
    this.config = {
      chunkSize: 64 * 1024,
      bufferSize: 512 * 1024,
      progressUpdateInterval: 100,
      speedSamples: 10,
      maxRetries: 3,
      retryDelay: 1000,
    };

    // Initialisation
    this.downloadPath = this.initializeDownloadPath(store);
    this.serverAddress = store.get("serverAddress");
    this.userToken = store.get("userToken");

    console.log(`[DownloadEngine] Simple engine initialized`);
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

  async downloadGame(serverGame) {
    const gameId = serverGame._id;
    const filePath = path.join(this.downloadPath, serverGame.zipFileName);

    try {
      // Initialisation simple
      this.initializeMetrics(serverGame);
      this.setState("preparing", "Préparation...");

      // Download
      await this.simpleDownload(serverGame, filePath, gameId);

      // Extraction
      const extractPath = await this.simpleExtraction(
        filePath,
        gameId,
        serverGame
      );

      // Finalisation
      await this.simpleFinalize(filePath, gameId, serverGame, extractPath);

      return { success: true, extractPath };
    } catch (error) {
      console.error(`[DownloadEngine] Error for ${serverGame.name}:`, error);
      this.sendErrorProgress(gameId, error.message);
      return { success: false, error: error.message };
    }
  }

  async simpleDownload(serverGame, filePath, gameId) {
    this.setState("downloading", "Téléchargement...");

    const url = `http://${this.serverAddress}/api/serverGame/downloadGame/${gameId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(
      response.headers.get("content-length") || "0",
      10
    );
    this.metrics.totalBytes = totalSize;

    const writeStream = fs.createWriteStream(filePath, {
      highWaterMark: this.config.bufferSize,
    });

    const reader = response.body.getReader();
    let downloadedBytes = 0;
    let buffer = Buffer.alloc(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer = Buffer.concat([buffer, Buffer.from(value)]);
      downloadedBytes += value.length;

      if (buffer.length >= this.config.chunkSize) {
        writeStream.write(buffer);
        buffer = Buffer.alloc(0);
      }

      // Update progress
      this.updateSimpleMetrics(downloadedBytes, totalSize);

      if (this.shouldUpdateProgress()) {
        this.sendSimpleProgress(gameId);
      }
    }

    if (buffer.length > 0) {
      writeStream.write(buffer);
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    console.log(
      `[DownloadEngine] Download completed: ${downloadedBytes} bytes`
    );
  }

  async simpleExtraction(filePath, gameId, serverGame) {
    this.setState("extracting", "Extraction...");

    const extractPath = path.join(this.downloadPath, gameId);
    await fs.promises.mkdir(extractPath, { recursive: true });

    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension === ".zip") {
      return await this.extractZipSimple(filePath, extractPath, gameId);
    } else if (fileExtension === ".7z") {
      return await this.extract7zFallback(filePath, extractPath, gameId);
    } else {
      throw new Error(`Format non supporté: ${fileExtension}`);
    }
  }

  async extractZipSimple(filePath, extractPath, gameId) {
    console.log(`[DownloadEngine] ZIP extraction: ${filePath}`);

    const directory = await unzipper.Open.file(filePath);
    const totalEntries = directory.files.length;
    let extractedCount = 0;

    for (const entry of directory.files) {
      const outputPath = path.join(extractPath, entry.path);

      if (entry.type === "Directory") {
        await fs.promises.mkdir(outputPath, { recursive: true });
      } else {
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

        await new Promise((resolve, reject) => {
          entry
            .stream()
            .pipe(fs.createWriteStream(outputPath))
            .on("finish", resolve)
            .on("error", reject);
        });
      }

      extractedCount++;

      const progress = Math.round((extractedCount / totalEntries) * 100);
      this.sendProgress({
        id: gameId,
        stage: "extracting",
        progress,
        extractedFiles: extractedCount,
        totalFiles: totalEntries,
        currentFile: entry.path,
      });
    }

    console.log(
      `[DownloadEngine] ZIP extraction completed: ${extractedCount} files`
    );
    return extractPath;
  }

  async extract7zFallback(filePath, extractPath, gameId) {
    console.log(`[DownloadEngine] 7z fallback: manual extraction`);

    const instructionsPath = path.join(
      extractPath,
      "INSTRUCTIONS_EXTRACTION.txt"
    );
    const instructions = `
EXTRACTION MANUELLE REQUISE
===========================

Le fichier 7z doit être extrait manuellement.

Fichier à extraire : ${filePath}
Dossier de destination : ${extractPath}

ÉTAPES :
1. Installez 7-Zip depuis https://7-zip.org/
2. Clic droit sur le fichier 7z → "7-Zip" → "Extract Here"
3. Le jeu sera automatiquement détecté

Le jeu apparaîtra dans votre bibliothèque une fois extrait.
`;

    await fs.promises.writeFile(instructionsPath, instructions);

    this.sendProgress({
      id: gameId,
      stage: "completed",
      progress: 100,
      message: "⚠️ Extraction manuelle requise",
    });

    return extractPath;
  }

  async simpleFinalize(filePath, gameId, serverGame, extractPath) {
    this.setState("finalizing", "Finalisation...");

    // Supprimer fichier temporaire
    try {
      await fs.promises.unlink(filePath);
      console.log(`[DownloadEngine] Temp file deleted: ${filePath}`);
    } catch (err) {
      console.warn(
        `[DownloadEngine] Could not delete temp file: ${err.message}`
      );
    }

    // Enregistrement API
    const decoded = jwtDecode(this.userToken);
    const response = await fetch(
      `http://${this.serverAddress}/api/installedGames/addInstalledGame`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.userToken}`,
        },
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

    console.log(`[DownloadEngine] Game registered successfully`);

    this.sendProgress({
      id: gameId,
      stage: "completed",
      progress: 100,
      totalTime: Date.now() - this.metrics.startTime,
      avgSpeed: this.metrics.avgSpeed,
      finalPath: extractPath,
    });
  }

  // Métriques simplifiées
  initializeMetrics(serverGame) {
    this.metrics = {
      startTime: Date.now(),
      lastUpdateTime: 0,
      speedSamples: [],
      totalBytes: 0,
      downloadedBytes: 0,
      instantSpeed: 0,
      avgSpeed: 0,
      eta: 0,
      lastProgressUpdate: 0,
    };
  }

  updateSimpleMetrics(downloadedBytes, totalBytes) {
    const now = Date.now();
    this.metrics.downloadedBytes = downloadedBytes;

    if (this.metrics.lastUpdateTime > 0) {
      const timeDelta = (now - this.metrics.lastUpdateTime) / 1000;
      const bytesDelta =
        downloadedBytes - (this.metrics.lastDownloadedBytes || 0);

      this.metrics.instantSpeed = bytesDelta / timeDelta;

      this.metrics.speedSamples.push(this.metrics.instantSpeed);
      if (this.metrics.speedSamples.length > this.config.speedSamples) {
        this.metrics.speedSamples.shift();
      }

      this.metrics.avgSpeed =
        this.metrics.speedSamples.reduce((a, b) => a + b, 0) /
        this.metrics.speedSamples.length;

      const remainingBytes = totalBytes - downloadedBytes;
      this.metrics.eta =
        this.metrics.avgSpeed > 0 ? remainingBytes / this.metrics.avgSpeed : 0;
    }

    this.metrics.lastUpdateTime = now;
    this.metrics.lastDownloadedBytes = downloadedBytes;
  }

  sendSimpleProgress(gameId) {
    const progress =
      this.metrics.totalBytes > 0
        ? Math.round(
            (this.metrics.downloadedBytes / this.metrics.totalBytes) * 100
          )
        : 0;

    this.sendProgress({
      id: gameId,
      stage: this.state.currentStage,
      progress,
      speed: this.metrics.avgSpeed / (1024 * 1024),
      instantSpeed: this.metrics.instantSpeed / (1024 * 1024),
      sizeDownloaded: this.metrics.downloadedBytes / (1024 * 1024),
      totalSize: this.metrics.totalBytes / (1024 * 1024),
      eta: Math.round(this.metrics.eta),
      elapsedTime: Date.now() - this.metrics.startTime,
    });
  }

  setState(stage, message = "") {
    this.state = this.state || {};
    this.state.currentStage = stage;
    console.log(`[DownloadEngine] ${stage}: ${message}`);
  }

  shouldUpdateProgress() {
    const now = Date.now();
    const shouldUpdate =
      now - (this.metrics.lastProgressUpdate || 0) >=
      this.config.progressUpdateInterval;
    if (shouldUpdate) {
      this.metrics.lastProgressUpdate = now;
    }
    return shouldUpdate;
  }

  sendErrorProgress(gameId, error) {
    this.sendProgress({
      id: gameId,
      stage: "failed",
      progress: 0,
      error,
      elapsedTime: Date.now() - (this.metrics?.startTime || Date.now()),
    });
  }
}
