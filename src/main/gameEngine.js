import fs from "fs";
import path from "path";
import http from "http";
import https from "https";
import { jwtDecode } from "jwt-decode";
import { extractionEngine } from "./extractionEngine.js";
import { buildServerUrl } from "./utils/urlHelper.js";
import { isTrustedServerHost } from "./utils/tlsHelper.js";
import { calculateDirSize } from "./utils/dirSize.js";
import { rawRequest } from "./utils/rawRequest.js";
import { sha256File, checksumMatches } from "./app/fileChecksum.js";
import { resolveDownloadDir } from "./app/pathGuard.js";
import logger from "./utils/logger.js";
import { EXTRACTION_TIMEOUT_MS } from "./app/constants.js";

const MKDIR_TIMEOUT_MS = 10_000;

export class GameEngine {
  constructor() {
    this.config = {
      chunkSize: 64 * 1024,
      bufferSize: 512 * 1024,
      progressUpdateInterval: 250,
      speedSamples: 10,
      maxRetries: 3,
      retryDelay: 1000,
    };

    this.activeDownloads = new Map();
    this.metrics = new Map();

    // Cancel/Pause state
    this.cancelled = false;
    this.paused = false;
    this.pausedResolve = null;

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
      logger.info(`[GameEngine] Installation: ${serverGame.name}`);

      if (!serverGame._id || !serverGame.zipFileName) {
        throw new Error("Invalid game data");
      }

      this.initializeFromStore(store, sendProgress, gameId);
      this.downloadPath = await this.ensureDownloadPath(store);

      const filePath = await this.downloadGameFile(serverGame);
      await this.verifyGameFile(filePath, serverGame);
      const extractPath = await this.extractGameFile(filePath, serverGame);
      await this.finalizeInstallation(filePath, extractPath, serverGame);

      logger.info(`[GameEngine] Installation successful: ${serverGame.name}`);

      this.cleanupDownload(gameId);

      return { success: true, path: extractPath };
    } catch (error) {
      logger.error(`[GameEngine] Installation failed: ${serverGame.name}`, error);

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
    this.serverAddress = store.get("serverAddress");
    this.userToken = store.get("userToken");
    this.initializeMetrics(gameId);
  }

  // Directory creation on cloud-managed folders (OneDrive Documents…) can
  // block forever — race it against a timeout so the install fails with a
  // visible error instead of hanging at 0%.
  async ensureDownloadPath(store) {
    const downloadPath = resolveDownloadDir(store.get("downloadPath"));
    await Promise.race([
      fs.promises.mkdir(downloadPath, { recursive: true }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Download folder unreachable: ${downloadPath}`)),
          MKDIR_TIMEOUT_MS
        )
      ),
    ]);
    return downloadPath;
  }

  async downloadGameFile(serverGame) {
    const gameId = serverGame._id;

    const zipLower = serverGame.zipFileName.toLowerCase();
    const compoundExts = [".tar.gz", ".tar.bz2", ".tar.xz", ".tar.zst"];
    const originalExtension =
      compoundExts.find((ext) => zipLower.endsWith(ext)) ||
      path.extname(zipLower) ||
      ".zip";
    const fileName = `${serverGame.name.replace(/[^a-zA-Z0-9]/g, "_")}_${gameId}${originalExtension}`;
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
      message: "Connecting to server...",
    });

    const downloadUrl = buildServerUrl(this.serverAddress, `/api/serverGame/downloadGame/${gameId}`);

    let fileStream = null;
    let downloadedBytes = 0;
    let totalSize = 0;
    let totalSizeIsExact = false; // true only when totalSize comes from HTTP headers

    try {
      // Check if we have a partial file to resume from
      if (fs.existsSync(filePath)) {
        downloadedBytes = fs.statSync(filePath).size;
      }

      let reqHeaders = { Authorization: `Bearer ${this.userToken}` };
      if (downloadedBytes > 0) {
        reqHeaders["Range"] = `bytes=${downloadedBytes}-`;
      }

      // rawRequest.js cannot be used here: the download requires a streaming IncomingMessage
      // (piped directly to disk) rather than a buffered response. Progress tracking and
      // Range-resume also need direct access to the underlying http/https response object.
      const parsedUrl = new URL(downloadUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const transport = isHttps ? https : http;

      const makeRequest = (headers) => new Promise((resolve, reject) => {
        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + (parsedUrl.search || ""),
          method: "GET",
          headers,
        };
        if (isHttps) options.rejectUnauthorized = !isTrustedServerHost(parsedUrl.hostname, this.serverAddress);
        const req = transport.request(options, resolve);
        req.on("error", reject);
        req.end();
      });

      let response = await makeRequest(reqHeaders);

      // 416 = Range Not Satisfiable → delete partial file and retry from scratch
      if (response.statusCode === 416) {
        response.destroy();
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
        downloadedBytes = 0;
        reqHeaders = { Authorization: `Bearer ${this.userToken}` };
        response = await makeRequest(reqHeaders);
      }

      if (response.statusCode !== 200 && response.statusCode !== 206) {
        response.destroy();
        throw new Error(`HTTP error ${response.statusCode}`);
      }

      if (response.statusCode === 206) {
        const contentRange = response.headers["content-range"];
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)$/);
          if (match) { totalSize = parseInt(match[1], 10); totalSizeIsExact = true; }
        }
      } else {
        const cl = parseInt(response.headers["content-length"] || "0", 10);
        if (cl > 0) { totalSize = cl; totalSizeIsExact = true; }
        downloadedBytes = 0;
      }

      if (totalSize === 0 && serverGame.sizeMB > 0) {
        // Approximate fallback — not used for integrity check
        totalSize = Math.round(serverGame.sizeMB * 1024 * 1024);
      }

      fileStream = fs.createWriteStream(filePath, {
        flags: downloadedBytes > 0 ? "a" : "w",
        highWaterMark: 4 * 1024 * 1024, // 4MB write buffer
      });

      // Download with native stream events for maximum throughput
      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (err) => {
          if (settled) return;
          settled = true;
          response.destroy();
          if (err) reject(err); else resolve();
        };

        response.on("data", (chunk) => {
          if (this.cancelled) { finish(new Error("CANCELLED")); return; }

          // Write chunk with backpressure support
          const ok = fileStream.write(chunk);
          downloadedBytes += chunk.length;

          this.updateMetrics(gameId, downloadedBytes, totalSize);

          if (this.shouldSendProgressUpdate(gameId)) {
            const metrics = this.metrics.get(gameId);
            this.sendProgress({
              id: gameId,
              stage: "downloading",
              progress: totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0,
              sizeDownloaded: downloadedBytes / (1024 * 1024),
              totalSize: totalSize / (1024 * 1024),
              speed: metrics.avgSpeed / (1024 * 1024),
              instantSpeed: metrics.instantSpeed / (1024 * 1024),
              eta: metrics.eta,
              elapsedTime: Date.now() - metrics.startTime,
            });
          }

          // Backpressure: pause network until disk catches up
          if (!ok) {
            response.pause();
            fileStream.once("drain", () => {
              if (!this.cancelled && !this.paused) response.resume();
            });
          }

          // Pause download if requested (after writing current chunk)
          if (this.paused) {
            response.pause();
            this.sendProgress({
              id: gameId,
              stage: "paused",
              progress: totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0,
              sizeDownloaded: downloadedBytes / (1024 * 1024),
              totalSize: totalSize / (1024 * 1024),
            });
            // pausedResolve is called by GameEngine.resume() / cancel()
            this.pausedResolve = () => {
              if (this.cancelled) {
                finish(new Error("CANCELLED"));
              } else {
                response.resume();
                this.sendProgress({
                  id: gameId,
                  stage: "downloading",
                  progress: totalSize > 0 ? Math.round((downloadedBytes / totalSize) * 100) : 0,
                  sizeDownloaded: downloadedBytes / (1024 * 1024),
                  totalSize: totalSize / (1024 * 1024),
                  message: "Download resumed",
                });
              }
            };
          }
        });

        response.on("end", () => finish(null));
        response.on("error", (err) => finish(this.cancelled ? new Error("CANCELLED") : err));
        fileStream.on("error", finish);
      });

      fileStream.end();

      await new Promise((resolve, reject) => {
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });

      // Integrity check — only when totalSize is exact (from HTTP headers, not sizeMB fallback)
      if (totalSizeIsExact && totalSize > 0) {
        const downloadedSize = fs.statSync(filePath).size;
        if (downloadedSize !== totalSize) {
          throw new Error(
            `Incomplete file: ${downloadedSize} bytes received out of ${totalSize} expected`
          );
        }
      }

      return filePath;
    } catch (error) {
      if (error.message === "CANCELLED") throw error;

      logger.error(`[GameEngine] Download error: ${error.message}`);

      try { if (fileStream) fileStream.destroy(); } catch {}

      // Keep partial file for resume unless download never started
      if (downloadedBytes === 0) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
      }

      throw new Error(`Download error: ${error.message}`);
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

  // Verify the downloaded archive against the server-provided SHA-256. Skipped
  // when the server has no checksum yet (older games, backfilled lazily).
  async verifyGameFile(filePath, serverGame) {
    const expected = serverGame.sha256;
    if (!expected) return;

    this.sendProgress({
      id: serverGame._id,
      stage: "verifying",
      progress: 0,
      message: "Verifying file integrity...",
    });

    const actual = await sha256File(filePath);
    if (!checksumMatches(actual, expected)) {
      try { fs.unlinkSync(filePath); } catch {}
      logger.error(`[GameEngine] Checksum mismatch for ${serverGame.name}: expected ${expected}, got ${actual}`);
      throw new Error("CHECKSUM_MISMATCH");
    }
    logger.info(`[GameEngine] Checksum verified for ${serverGame.name}`);
  }

  async extractGameFile(filePath, serverGame) {
    const gameId = serverGame._id;
    const sanitizedName = this.sanitizeGameName(serverGame.name);
    const sanitizedVersion = (serverGame.version || "1.0.0").replace(/[^a-zA-Z0-9._-]/g, "_");
    const extractPath = path.join(this.downloadPath, `${sanitizedName}_v${sanitizedVersion}`);

    // Check cancel before starting extraction
    if (this.cancelled) {
      this.cleanupFiles(filePath, null);
      throw new Error("CANCELLED");
    }

    logger.info(`[GameEngine] Extracting to: ${extractPath}`);

    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    this.sendProgress({
      id: gameId,
      stage: "extracting",
      progress: 0,
      message: "Analyzing archive...",
    });

    const fileExtension = extractionEngine.getFileExtension(filePath);

    try {
      if (extractionEngine.isSupported(fileExtension)) {
        const extractionTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Extraction timeout")), EXTRACTION_TIMEOUT_MS)
        );
        const result = await Promise.race([
          extractionEngine.extract(
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
                message: `Extracting: ${extractedFiles}/${totalFiles} files`,
              });
            }
          ),
          extractionTimeout,
        ]);

        // Check cancel after extraction completes
        if (this.cancelled) {
          this.cleanupFiles(filePath, extractPath);
          throw new Error("CANCELLED");
        }

        return result;
      } else {
        throw new Error(
          `Unsupported format: ${fileExtension}. Supported formats: ${extractionEngine.getSupportedFormats().join(", ")}`
        );
      }
    } catch (error) {
      if (error.message === "CANCELLED") {
        this.cleanupFiles(filePath, extractPath);
        throw error;
      }
      logger.error(`[GameEngine] Extraction failed: ${error.message}`);
      throw new Error(`Extraction error: ${error.message}`);
    }
  }


  async finalizeInstallation(filePath, extractPath, serverGame) {
    const gameId = serverGame._id;

    // Check cancel before finalizing
    if (this.cancelled) {
      this.cleanupFiles(filePath, extractPath);
      throw new Error("CANCELLED");
    }

    logger.info(`[GameEngine] Finalizing: ${serverGame.name}...`);

    this.sendProgress({
      id: gameId,
      stage: "finalizing",
      progress: 0,
      message: "Finalizing...",
    });

    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      logger.warn(`[GameEngine] Could not delete temp file: ${err.message}`);
    }

    // Calculate the installed size (in MB)
    let installSizeMB = 0;
    try {
      const sizeBytes = await calculateDirSize(extractPath);
      installSizeMB = Math.round(sizeBytes / (1024 * 1024));
      logger.info(`[GameEngine] Installed size: ${installSizeMB} MB`);
    } catch (err) {
      logger.warn(`[GameEngine] Could not calculate installed size: ${err.message}`);
    }

    let userId;
    try {
      const decoded = jwtDecode(this.userToken);
      userId = decoded?.user?.id;
    } catch {
      // malformed token — decoded value unusable
    }
    if (!userId) throw new Error("Invalid authentication token");

    const url = buildServerUrl(this.serverAddress, '/api/installedGames/addInstalledGame');
    const body = JSON.stringify({
      userId,
      serverGameId: gameId,
      path: extractPath,
      version: serverGame.version,
      installSize: installSizeMB,
    });

    const apiResponse = await rawRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.userToken}`,
      },
      body,
      serverAddress: this.serverAddress,
    });
    const status = apiResponse.status;
    const responseBody = apiResponse.text();

    if (status < 200 || status >= 300) {
      let errorMsg = `HTTP ${status}`;
      try { errorMsg = JSON.parse(responseBody)?.message || errorMsg; } catch {}
      throw new Error(errorMsg);
    }

    // Prepare cache data (the main process will perform the atomic update)
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
      igdbId: serverGame.igdbId || null,
      multiplayer: serverGame.multiplayer || null,
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
      message: "Installation complete!",
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
    const timeDelta = (now - metrics.lastUpdateTime) / 1000; // seconds

    if (timeDelta > 0) {
      const bytesDelta = downloadedBytes - metrics.lastBytes;
      const instantSpeed = bytesDelta / timeDelta; // bytes/s

      // Add to speed history
      metrics.speeds.push(instantSpeed);
      if (metrics.speeds.length > this.config.speedSamples) {
        metrics.speeds.shift();
      }

      // Calculate average speed
      const avgSpeed =
        metrics.speeds.reduce((a, b) => a + b, 0) / metrics.speeds.length;

      // Calculate ETA
      const remainingBytes = totalSize - downloadedBytes;
      const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

      // Update metrics
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
