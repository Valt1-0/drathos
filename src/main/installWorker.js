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
        message: "Installation complete!",
      });
    } else {
      parentPort.postMessage({
        stage: "Failed",
        progress: 0,
        error: result.error,
      });
    }
  } catch (error) {
    parentPort.postMessage({ type: "log", level: "error", message: `[InstallWorker] Critical error: ${error.message}` });
    parentPort.postMessage({
      stage: "Failed",
      progress: 0,
      error: error.message || "Unknown installation error",
    });
  }
}

// Start the installation
runInstallation();
