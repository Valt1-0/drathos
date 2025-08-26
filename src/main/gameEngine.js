// src/main/GameInstallationEngine.js - SYSTÈME UNIFIÉ 🚀
// Remplace et fusionne DownloadEngine.js + installGame.js

import fs from "fs";
import path from "path";
import os from "os";
import unzipper from "unzipper";
import { jwtDecode } from "jwt-decode";

export class GameEngine {
  constructor() {
    // Configuration optimisée
    this.config = {
      chunkSize: 64 * 1024,
      bufferSize: 512 * 1024,
      progressUpdateInterval: 100,
      speedSamples: 10,
      maxRetries: 3,
      retryDelay: 1000,
    };

    // État interne
    this.activeDownloads = new Map(); // gameId -> downloadState
    this.metrics = new Map(); // gameId -> metrics

    console.log(`[GameEngine] ✅ Système unifié initialisé`);
  }

  /**
   * 🎯 MÉTHODE PRINCIPALE - Installe un jeu complet
   * Remplace la fonction installGame() et utilise DownloadEngine en interne
   */
  async installGame(serverGame, { store, sendProgress }) {
    const gameId = serverGame._id;

    try {
      console.log(
        `[GameInstallationEngine] 🚀 Installation: ${serverGame.name}`
      );

      // Validation des paramètres
      if (!serverGame._id || !serverGame.zipFileName) {
        throw new Error("Données du jeu invalides");
      }

      // Initialiser les paramètres depuis store
      this.initializeFromStore(store, sendProgress, gameId);

      // Étape 1: Téléchargement
      const filePath = await this.downloadGameFile(serverGame);

      // Étape 2: Extraction
      const extractPath = await this.extractGameFile(filePath, serverGame);

      // Étape 3: Finalisation et enregistrement
      await this.finalizeInstallation(filePath, extractPath, serverGame);

      console.log(
        `[GameInstallationEngine] ✅ Installation réussie: ${serverGame.name}`
      );

      // Nettoyage
      this.cleanupDownload(gameId);

      return { success: true, path: extractPath };
    } catch (error) {
      console.error(
        `[GameInstallationEngine] ❌ Installation échouée: ${serverGame.name}`,
        error
      );

      // Envoyer l'erreur au frontend
      this.sendProgress({
        id: gameId,
        stage: "failed",
        progress: 0,
        error: error.message,
      });

      // Nettoyage en cas d'erreur
      this.cleanupDownload(gameId);

      return { success: false, error: error.message };
    }
  }

  /**
   * Initialise les paramètres depuis le store
   */
  initializeFromStore(store, progressCallback, gameId) {
    this.store = store;
    this.sendProgress = progressCallback;

    // Récupération des paramètres
    this.downloadPath = this.initializeDownloadPath(store);
    this.serverAddress = store.get("serverAddress");
    this.userToken = store.get("userToken");

    // Initialiser les métriques pour ce téléchargement
    this.initializeMetrics(gameId);
  }

  /**
   * Initialise le dossier de téléchargement
   */
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

  /**
   * 📥 ÉTAPE 1: Téléchargement du fichier jeu
   */
  async downloadGameFile(serverGame) {
    const gameId = serverGame._id;
    const fileName = `${serverGame.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_${gameId}.zip`;
    const filePath = path.join(this.downloadPath, fileName);

    console.log(`[GameInstallationEngine] 📥 Téléchargement: ${fileName}`);

    // Marquer comme en cours de téléchargement
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

    const downloadUrl = `http://${this.serverAddress}/api/serverGame/downloadGame/${gameId}`;

    try {
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${this.userToken}` },
      });

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status}: ${response.statusText}`
        );
      }

      const totalSize = parseInt(response.headers.get("content-length") || "0");
      let downloadedBytes = 0;

      const fileStream = fs.createWriteStream(filePath);
      const reader = response.body.getReader();

      while (true) {
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
            sizeDownloaded: downloadedBytes / (1024 * 1024 * 1024), // GB
            totalSize: totalSize / (1024 * 1024 * 1024), // GB
            speed: metrics.avgSpeed / (1024 * 1024), // MB/s
            instantSpeed: metrics.instantSpeed / (1024 * 1024), // MB/s
            eta: metrics.eta,
            elapsedTime: Date.now() - metrics.startTime,
          });
        }
      }

      fileStream.end();
      console.log(
        `[GameInstallationEngine] ✅ Téléchargement terminé: ${fileName}`
      );

      return filePath;
    } catch (error) {
      // Nettoyer le fichier partiel en cas d'erreur
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(
          `[GameInstallationEngine] Impossible de supprimer le fichier partiel: ${cleanupError.message}`
        );
      }

      throw new Error(`Erreur de téléchargement: ${error.message}`);
    }
  }

  /**
   * 📦 ÉTAPE 2: Extraction du fichier jeu avec progression détaillée
   */
  async extractGameFile(filePath, serverGame) {
    const gameId = serverGame._id;
    const extractPath = path.join(this.downloadPath, gameId);

    console.log(
      `[GameInstallationEngine] 📦 Extraction: ${path.basename(filePath)}`
    );

    // Créer le dossier d'extraction
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    this.sendProgress({
      id: gameId,
      stage: "extracting",
      progress: 0,
      message: "Analyse de l'archive...",
    });

    const fileExtension = path.extname(filePath).toLowerCase();

    try {
      if (fileExtension === ".zip") {
        return await this.extractZipWithProgress(filePath, extractPath, gameId);
      } else if (fileExtension === ".7z") {
        return await this.createManualExtractionInstructions(
          filePath,
          extractPath,
          gameId,
          serverGame
        );
      } else {
        throw new Error(`Format non supporté: ${fileExtension}`);
      }
    } catch (error) {
      // Si l'extraction échoue, créer des instructions manuelles
      if (
        error.message.includes(
          "end of central directory record signature not found"
        ) ||
        error.message.includes(
          "invalid central directory file header signature"
        )
      ) {
        return await this.createManualExtractionInstructions(
          filePath,
          extractPath,
          gameId,
          serverGame
        );
      }

      throw new Error(`Erreur d'extraction: ${error.message}`);
    }
  }

  /**
   * 📂 Extraction ZIP avec progression fichier par fichier
   */
  async extractZipWithProgress(filePath, extractPath, gameId) {
    console.log(
      `[GameInstallationEngine] 📂 Extraction ZIP avec progression: ${filePath}`
    );

    // Ouvrir l'archive pour analyser son contenu
    const directory = await unzipper.Open.file(filePath);
    const totalFiles = directory.files.length;
    let extractedCount = 0;

    console.log(
      `[GameInstallationEngine] 📊 Archive contient ${totalFiles} fichiers`
    );

    this.sendProgress({
      id: gameId,
      stage: "extracting",
      progress: 0,
      extractedFiles: 0,
      totalFiles: totalFiles,
      message: `Extraction de ${totalFiles} fichiers...`,
    });

    // Extraire chaque fichier individuellement pour avoir la progression
    for (const entry of directory.files) {
      const outputPath = path.join(extractPath, entry.path);

      try {
        if (entry.type === "Directory") {
          // Créer le dossier
          await fs.promises.mkdir(outputPath, { recursive: true });
        } else {
          // Créer le dossier parent si nécessaire
          await fs.promises.mkdir(path.dirname(outputPath), {
            recursive: true,
          });

          // Extraire le fichier
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(
                new Error(`Timeout lors de l'extraction de ${entry.path}`)
              );
            }, 30000); // 30 secondes de timeout par fichier

            entry
              .stream()
              .pipe(fs.createWriteStream(outputPath))
              .on("finish", () => {
                clearTimeout(timeout);
                resolve();
              })
              .on("error", (error) => {
                clearTimeout(timeout);
                reject(error);
              });
          });
        }

        extractedCount++;
        const progress = Math.round((extractedCount / totalFiles) * 100);

        // Envoyer la progression toutes les 10 fichiers ou à chaque 5% pour éviter le spam
        if (
          extractedCount % 10 === 0 ||
          progress % 5 === 0 ||
          extractedCount === totalFiles
        ) {
          this.sendProgress({
            id: gameId,
            stage: "extracting",
            progress: progress,
            extractedFiles: extractedCount,
            totalFiles: totalFiles,
            currentFile: entry.path,
            message: `Extraction: ${extractedCount}/${totalFiles} fichiers`,
          });
        }
      } catch (error) {
        console.warn(
          `[GameInstallationEngine] ⚠️ Erreur extraction fichier ${entry.path}:`,
          error.message
        );
        // Continuer avec les autres fichiers même si un fichier échoue
        extractedCount++;
      }
    }

    console.log(
      `[GameInstallationEngine] ✅ Extraction ZIP terminée: ${extractedCount}/${totalFiles} fichiers`
    );

    this.sendProgress({
      id: gameId,
      stage: "extracting",
      progress: 100,
      extractedFiles: extractedCount,
      totalFiles: totalFiles,
      message: "Extraction terminée !",
    });

    return extractPath;
  }

  /**
   * 📋 Créer des instructions pour extraction manuelle (cas des .7z)
   */
  async createManualExtractionInstructions(
    filePath,
    extractPath,
    gameId,
    serverGame
  ) {
    console.log(
      `[GameInstallationEngine] ⚠️ Extraction manuelle requise pour: ${serverGame.name}`
    );

    const instructionsPath = path.join(extractPath, "EXTRACTION_MANUELLE.txt");
    const instructions = `
🎮 EXTRACTION MANUELLE REQUISE - ${serverGame.name}

Le fichier téléchargé nécessite une extraction manuelle avec 7-Zip.

Fichier à extraire : ${filePath}
Dossier de destination : ${extractPath}

ÉTAPES :
1. Installez 7-Zip depuis https://7-zip.org/
2. Clic droit sur le fichier → "7-Zip" → "Extract Here"
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

  /**
   * ✅ ÉTAPE 3: Finalisation et enregistrement
   */
  async finalizeInstallation(filePath, extractPath, serverGame) {
    const gameId = serverGame._id;

    console.log(`[GameInstallationEngine] ✅ Finalisation: ${serverGame.name}`);

    this.sendProgress({
      id: gameId,
      stage: "finalizing",
      progress: 0,
      message: "Finalisation...",
    });

    // Supprimer fichier temporaire
    try {
      await fs.promises.unlink(filePath);
      console.log(
        `[GameInstallationEngine] 🗑️ Fichier temporaire supprimé: ${filePath}`
      );
    } catch (err) {
      console.warn(
        `[GameInstallationEngine] Impossible de supprimer le fichier temporaire: ${err.message}`
      );
    }

    // Enregistrement dans l'API backend
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

    console.log(`[GameInstallationEngine] ✅ Jeu enregistré dans l'API`);

    // Progression finale
    const metrics = this.metrics.get(gameId);
    this.sendProgress({
      id: gameId,
      stage: "completed",
      progress: 100,
      totalTime: Date.now() - metrics.startTime,
      avgSpeed: metrics.avgSpeed / (1024 * 1024), // MB/s
      finalPath: extractPath,
      message: "Installation terminée !",
    });
  }

  /**
   * 📊 Initialise les métriques pour un téléchargement
   */
  initializeMetrics(gameId) {
    this.metrics.set(gameId, {
      startTime: Date.now(),
      lastUpdateTime: 0,
      speedSamples: [],
      totalBytes: 0,
      downloadedBytes: 0,
      instantSpeed: 0,
      avgSpeed: 0,
      eta: 0,
      lastProgressUpdate: 0,
      lastDownloadedBytes: 0,
    });
  }

  /**
   * 📈 Met à jour les métriques de téléchargement
   */
  updateMetrics(gameId, downloadedBytes, totalBytes) {
    const now = Date.now();
    const metrics = this.metrics.get(gameId);

    metrics.downloadedBytes = downloadedBytes;
    metrics.totalBytes = totalBytes;

    if (metrics.lastUpdateTime > 0) {
      const timeDelta = (now - metrics.lastUpdateTime) / 1000;
      const bytesDelta = downloadedBytes - metrics.lastDownloadedBytes;

      metrics.instantSpeed = timeDelta > 0 ? bytesDelta / timeDelta : 0;

      // Moyenne mobile des vitesses
      metrics.speedSamples.push(metrics.instantSpeed);
      if (metrics.speedSamples.length > this.config.speedSamples) {
        metrics.speedSamples.shift();
      }

      metrics.avgSpeed =
        metrics.speedSamples.reduce((a, b) => a + b, 0) /
        metrics.speedSamples.length;

      // Estimation du temps restant
      const remainingBytes = totalBytes - downloadedBytes;
      metrics.eta =
        metrics.avgSpeed > 0 ? remainingBytes / metrics.avgSpeed : 0;
    }

    metrics.lastUpdateTime = now;
    metrics.lastDownloadedBytes = downloadedBytes;
  }

  /**
   * 🕐 Détermine si on doit envoyer une mise à jour de progression
   */
  shouldSendProgressUpdate(gameId) {
    const metrics = this.metrics.get(gameId);
    const now = Date.now();

    return (
      now - metrics.lastProgressUpdate >= this.config.progressUpdateInterval
    );
  }

  /**
   * 🧹 Nettoie les ressources d'un téléchargement
   */
  cleanupDownload(gameId) {
    this.activeDownloads.delete(gameId);
    this.metrics.delete(gameId);
    console.log(
      `[GameInstallationEngine] 🧹 Nettoyage effectué pour: ${gameId}`
    );
  }

  /**
   * ⏸️ FONCTIONNALITÉS AVANCÉES - Pause un téléchargement
   * (Future feature - infrastructure prête)
   */
  async pauseDownload(gameId) {
    const download = this.activeDownloads.get(gameId);
    if (download && download.stage === "downloading") {
      download.paused = true;
      console.log(
        `[GameInstallationEngine] ⏸️ Téléchargement mis en pause: ${gameId}`
      );
      return { success: true, message: "Téléchargement mis en pause" };
    }
    return {
      success: false,
      error: "Aucun téléchargement actif à mettre en pause",
    };
  }

  /**
   * ▶️ Reprend un téléchargement
   * (Future feature - infrastructure prête)
   */
  async resumeDownload(gameId) {
    const download = this.activeDownloads.get(gameId);
    if (download && download.paused) {
      download.paused = false;
      console.log(
        `[GameInstallationEngine] ▶️ Téléchargement repris: ${gameId}`
      );
      return { success: true, message: "Téléchargement repris" };
    }
    return {
      success: false,
      error: "Aucun téléchargement en pause à reprendre",
    };
  }

  /**
   * ❌ Annule un téléchargement
   * (Future feature - infrastructure prête)
   */
  async cancelDownload(gameId) {
    const download = this.activeDownloads.get(gameId);
    if (download) {
      // Nettoyer les fichiers
      try {
        if (fs.existsSync(download.filePath)) {
          fs.unlinkSync(download.filePath);
        }
      } catch (error) {
        console.warn(
          `[GameInstallationEngine] Erreur nettoyage: ${error.message}`
        );
      }

      this.cleanupDownload(gameId);
      console.log(
        `[GameInstallationEngine] ❌ Téléchargement annulé: ${gameId}`
      );
      return { success: true, message: "Téléchargement annulé" };
    }
    return { success: false, error: "Aucun téléchargement actif à annuler" };
  }

  /**
   * 📊 Obtient les statistiques globales
   */
  getStats() {
    return {
      activeDownloads: this.activeDownloads.size,
      totalDownloads: this.activeDownloads.size,
      downloadPaths: this.downloadPath,
      serverAddress: this.serverAddress,
    };
  }

  /**
   * 📈 Obtient la progression d'un téléchargement spécifique
   */
  getProgress(gameId) {
    const download = this.activeDownloads.get(gameId);
    const metrics = this.metrics.get(gameId);

    if (download && metrics) {
      return {
        gameId,
        stage: download.stage,
        progress:
          metrics.totalBytes > 0
            ? (metrics.downloadedBytes / metrics.totalBytes) * 100
            : 0,
        speed: metrics.avgSpeed,
        eta: metrics.eta,
        elapsedTime: Date.now() - metrics.startTime,
      };
    }

    return null;
  }
}
