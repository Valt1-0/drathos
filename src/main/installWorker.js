import { parentPort, workerData } from "worker_threads";
import { GameEngine } from "./gameEngine.js";

async function runInstallation() {
  const installationEngine = new GameEngine();

  try {
    console.log(
      `[InstallWorker] 🚀 Démarrage installation: ${workerData.serverGame.name}`
    );

    const result = await installationEngine.installGame(workerData.serverGame, {
      store: {
        get: (key) => workerData.storeData[key],
        set: (key, value) => {
          parentPort.postMessage({
            type: "store-set",
            key: key,
            value: value,
          });
          workerData.storeData[key] = value;
        },
      },
      sendProgress: (progressData) => {
        parentPort.postMessage(progressData);
      },
    });

    // Résultat final
    if (result.success) {
      console.log(
        `[InstallWorker] ✅ Installation réussie: ${workerData.serverGame.name}`
      );
      parentPort.postMessage({
        stage: "Completed",
        progress: 100,
        finalPath: result.path,
        message: "Installation terminée avec succès!",
      });
    } else {
      console.error(`[InstallWorker] ❌ Installation échouée: ${result.error}`);
      parentPort.postMessage({
        stage: "Failed",
        progress: 0,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[InstallWorker] 💥 Erreur critique:", error);

    // Envoyer l'erreur au processus principal
    parentPort.postMessage({
      stage: "Failed",
      progress: 0,
      error: error.message || "Erreur inconnue lors de l'installation",
    });
  }
}

// Démarrer l'installation
runInstallation();
