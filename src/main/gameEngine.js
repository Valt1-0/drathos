// src/main/gameEngine.js - SYSTÈME UNIFIÉ 🚀
// Installation et Désinstallation de jeux

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

  // ========================================
  // INSTALLATION DE JEUX
  // ========================================

  /**
   * 🎯 MÉTHODE PRINCIPALE - Installe un jeu complet
   */
  async installGame(serverGame, { store, sendProgress }) {
    const gameId = serverGame._id;

    try {
      console.log(`[GameEngine] 🚀 Installation: ${serverGame.name}`);

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

      console.log(`[GameEngine] ✅ Installation réussie: ${serverGame.name}`);

      // Nettoyage
      this.cleanupDownload(gameId);

      return { success: true, path: extractPath };
    } catch (error) {
      console.error(
        `[GameEngine] ❌ Installation échouée: ${serverGame.name}`,
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

    console.log(`[GameEngine] 📥 Téléchargement: ${fileName}`);

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
      console.log(`[GameEngine] ✅ Téléchargement terminé: ${fileName}`);

      return filePath;
    } catch (error) {
      // Nettoyer le fichier partiel en cas d'erreur
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

  /**
   * 📦 ÉTAPE 2: Extraction du fichier jeu avec progression détaillée
   */
  async extractGameFile(filePath, serverGame) {
    const gameId = serverGame._id;
    const extractPath = path.join(this.downloadPath, gameId);

    console.log(`[GameEngine] 📦 Extraction: ${path.basename(filePath)}`);

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
    console.log(`[GameEngine] 📂 Extraction ZIP avec progression: ${filePath}`);

    // Ouvrir l'archive pour analyser son contenu
    const directory = await unzipper.Open.file(filePath);
    const totalFiles = directory.files.length;
    let extractedCount = 0;

    console.log(`[GameEngine] 📊 Archive contient ${totalFiles} fichiers`);

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

        // Envoyer la progression toutes les 10 fichiers ou à chaque 5%
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
          `[GameEngine] ⚠️ Erreur extraction fichier ${entry.path}:`,
          error.message
        );
        // Continuer avec les autres fichiers même si un fichier échoue
        extractedCount++;
      }
    }

    console.log(
      `[GameEngine] ✅ Extraction ZIP terminée: ${extractedCount}/${totalFiles} fichiers`
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
      `[GameEngine] ⚠️ Extraction manuelle requise pour: ${serverGame.name}`
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

    console.log(`[GameEngine] ✅ Finalisation: ${serverGame.name}`);

    this.sendProgress({
      id: gameId,
      stage: "finalizing",
      progress: 0,
      message: "Finalisation...",
    });

    // Supprimer fichier temporaire
    try {
      await fs.promises.unlink(filePath);
      console.log(`[GameEngine] 🗑️ Fichier temporaire supprimé: ${filePath}`);
    } catch (err) {
      console.warn(
        `[GameEngine] Impossible de supprimer le fichier temporaire: ${err.message}`
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

    console.log(`[GameEngine] ✅ Jeu enregistré dans l'API`);

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

  // ========================================
  // DÉSINSTALLATION DE JEUX
  // ========================================

  /**
   * 🗑️ MÉTHODE PRINCIPALE - Désinstalle complètement un jeu
   */
  async uninstallGame(gameId, gamePath, { store, sendProgress }) {
    try {
      console.log(`[GameEngine] 🗑️ Désinstallation: ${gameId}`);
      console.log(`[GameEngine] Chemin: ${gamePath}`);

      // Initialiser les paramètres
      this.store = store;
      this.sendProgress = sendProgress;
      this.serverAddress = store.get("serverAddress");
      this.userToken = store.get("userToken");

      // Vérifier que le chemin existe
      if (!fs.existsSync(gamePath)) {
        throw new Error(`Le dossier du jeu n'existe pas: ${gamePath}`);
      }

      // Étape 1: Progression initiale
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 10,
        message: "Préparation de la désinstallation...",
      });

      // Étape 2: Supprimer les fichiers du jeu
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 30,
        message: "Suppression des fichiers...",
      });

      await this.deleteDirectory(gamePath, (progress) => {
        sendProgress({
          id: gameId,
          stage: "uninstalling",
          progress: 30 + Math.floor(progress * 0.5), // 30% -> 80%
          message: `Suppression en cours... ${Math.floor(progress)}%`,
        });
      });

      console.log(`[GameEngine] ✅ Fichiers supprimés: ${gamePath}`);

      // Étape 3: Supprimer de la base de données
      sendProgress({
        id: gameId,
        stage: "uninstalling",
        progress: 85,
        message: "Nettoyage de la base de données...",
      });

      await this.removeFromDatabase(gameId);

      console.log(`[GameEngine] ✅ Jeu supprimé de la base de données`);

      // Étape 4: Finalisation
      sendProgress({
        id: gameId,
        stage: "uninstalled",
        progress: 100,
        message: "Désinstallation terminée !",
      });

      return { success: true };
    } catch (error) {
      console.error(`[GameEngine] ❌ Erreur désinstallation:`, error);

      sendProgress({
        id: gameId,
        stage: "failed",
        progress: 0,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 🗑️ Supprime récursivement un dossier avec progression
   */
  async deleteDirectory(dirPath, onProgress) {
    // Compter d'abord tous les fichiers
    const totalItems = await this.countFilesInDirectory(dirPath);
    let deletedItems = 0;

    console.log(`[GameEngine] Suppression de ${totalItems} éléments...`);

    const deleteRecursive = async (currentPath) => {
      const stats = await fs.promises.stat(currentPath);

      if (stats.isDirectory()) {
        const items = await fs.promises.readdir(currentPath);

        // Supprimer tout le contenu du dossier
        for (const item of items) {
          const itemPath = path.join(currentPath, item);
          await deleteRecursive(itemPath);
        }

        // Supprimer le dossier vide
        await fs.promises.rmdir(currentPath);
        deletedItems++;

        if (onProgress) {
          onProgress((deletedItems / totalItems) * 100);
        }
      } else {
        // Supprimer le fichier
        await fs.promises.unlink(currentPath);
        deletedItems++;

        if (onProgress && deletedItems % 10 === 0) {
          // Mettre à jour tous les 10 fichiers pour éviter trop d'appels
          onProgress((deletedItems / totalItems) * 100);
        }
      }
    };

    await deleteRecursive(dirPath);

    // S'assurer que la progression finale est à 100%
    if (onProgress) {
      onProgress(100);
    }
  }

  /**
   * 📊 Compte récursivement tous les fichiers et dossiers
   */
  async countFilesInDirectory(dirPath) {
    let count = 1; // Le dossier lui-même

    try {
      const stats = await fs.promises.stat(dirPath);

      if (stats.isDirectory()) {
        const items = await fs.promises.readdir(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          count += await this.countFilesInDirectory(itemPath);
        }
      }

      return count;
    } catch (error) {
      console.warn(`[GameEngine] Erreur comptage ${dirPath}:`, error.message);
      return count;
    }
  }

  /**
   * 🗄️ Supprime le jeu de la base de données backend
   */
  async removeFromDatabase(gameId) {
    try {
      const decoded = jwtDecode(this.userToken);
      const userId = decoded.user.id;

      const response = await fetch(
        `http://${this.serverAddress}/api/installedGames/removeInstalledGame`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.userToken}`,
          },
          body: JSON.stringify({
            userId,
            serverGameId: gameId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || `HTTP ${response.status}`);
      }

      console.log(`[GameEngine] ✅ Jeu supprimé de la base de données`);
      return true;
    } catch (error) {
      console.error(
        `[GameEngine] ❌ Erreur suppression base de données:`,
        error
      );
      // Ne pas faire échouer toute la désinstallation si la suppression DB échoue
      console.warn(
        `[GameEngine] ⚠️ La désinstallation continue malgré l'erreur DB`
      );
      return false;
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  /**
   * Initialise les métriques pour un téléchargement
   */
  initializeMetrics(gameId) {
    this.metrics.set(gameId, {
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      lastBytes: 0,
      speeds: [],
      avgSpeed: 0,
      instantSpeed: 0,
      eta: 0,
    });
  }

  /**
   * Met à jour les métriques de téléchargement
   */
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

  /**
   * Détermine si on doit envoyer une mise à jour de progression
   */
  shouldSendProgressUpdate(gameId) {
    const metrics = this.metrics.get(gameId);
    if (!metrics) return false;

    const now = Date.now();
    const timeSinceLastUpdate = now - metrics.lastUpdateTime;

    return timeSinceLastUpdate >= this.config.progressUpdateInterval;
  }

  /**
   * Nettoyage des données de téléchargement
   */
  cleanupDownload(gameId) {
    this.activeDownloads.delete(gameId);
    this.metrics.delete(gameId);
    console.log(`[GameEngine] 🧹 Nettoyage effectué pour ${gameId}`);
  }
}
