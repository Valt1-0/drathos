// src/main/uninstallWorker.js - Worker pour désinstallation 🗑️

import { parentPort, workerData } from "worker_threads";
import { GameEngine } from "./gameEngine.js";

/**
 * Worker thread pour désinstallation de jeux
 */
async function runUninstallation() {
  const gameEngine = new GameEngine();

  try {
    console.log(`[UninstallWorker] 🗑️ Désinstallation: ${workerData.gameId}`);

    // Lancer la désinstallation complète
    const result = await gameEngine.uninstallGame(
      workerData.gameId,
      workerData.gamePath,
      {
        // Interface store simplifiée
        store: {
          get: (key) => workerData.storeData[key],
        },

        // Callback de progression
        sendProgress: (progressData) => {
          parentPort.postMessage(progressData);
        },
      }
    );

    // Résultat final
    if (result.success) {
      console.log(
        `[UninstallWorker] ✅ Désinstallation réussie: ${workerData.gameId}`
      );
      parentPort.postMessage({
        stage: "Completed",
        progress: 100,
        message: "Désinstallation terminée !",
      });
    } else {
      console.error(
        `[UninstallWorker] ❌ Désinstallation échouée: ${result.error}`
      );
      parentPort.postMessage({
        stage: "Failed",
        progress: 0,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[UninstallWorker] 💥 Erreur critique:", error);

    parentPort.postMessage({
      stage: "Failed",
      progress: 0,
      error: error.message || "Erreur inconnue lors de la désinstallation",
    });
  }
}

// Démarrer la désinstallation
runUninstallation();
