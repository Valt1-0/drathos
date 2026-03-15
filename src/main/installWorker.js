import { parentPort, workerData } from "worker_threads";
import { GameEngine } from "./gameEngine.js";

async function runInstallation() {
  const installationEngine = new GameEngine();

  // Listen for control messages from the main process
  parentPort.on("message", (msg) => {
    if (msg.type === "cancel") installationEngine.cancel();
    if (msg.type === "pause") installationEngine.pause();
    if (msg.type === "resume") installationEngine.resume();
  });

  try {
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

    if (result.success) {
      parentPort.postMessage({
        stage: "Completed",
        progress: 100,
        finalPath: result.path,
        message: "Installation terminée avec succès!",
      });
    } else {
      parentPort.postMessage({
        stage: "Failed",
        progress: 0,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[InstallWorker] Erreur critique:", error.message);
    parentPort.postMessage({
      stage: "Failed",
      progress: 0,
      error: error.message || "Erreur inconnue lors de l'installation",
    });
  }
}

// Start the installation
runInstallation();
