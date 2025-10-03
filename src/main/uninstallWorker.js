// src/main/uninstallWorker.js - VERSION FINALE 🚀

import { parentPort, workerData } from "worker_threads";
import { UninstallEngine } from "./uninstallEngine.js";

async function runUninstallation() {
  const uninstallEngine = new UninstallEngine();

  try {
    console.log(`[UninstallWorker] 🗑️ Désinstallation: ${workerData.gameId}`);

    // Lancer la désinstallation complète
    const result = await uninstallEngine.uninstallGame(
      workerData.gameId,
      workerData.gamePath,
      {
        store: {
          get: (key) => workerData.storeData[key],
        },
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

runUninstallation();
