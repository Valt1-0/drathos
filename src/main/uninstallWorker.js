// src/main/uninstallWorker.js

import { parentPort, workerData } from "worker_threads";
import { UninstallEngine } from "./uninstallEngine.js";

async function runUninstallation() {
  const uninstallEngine = new UninstallEngine();

  const log = (level, message) => parentPort.postMessage({ type: "log", level, message });

  try {
    log("info", `[UninstallWorker] Uninstalling: ${workerData.gameId}`);

    // Start the full uninstallation
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

    // Final result
    if (result.success) {
      log("info", `[UninstallWorker] Uninstall successful: ${workerData.gameId}`);
    } else {
      log("error", `[UninstallWorker] Uninstall failed: ${result.error}`);
      parentPort.postMessage({
        stage: "failed",
        progress: 0,
        error: result.error,
      });
    }
  } catch (error) {
    log("error", `[UninstallWorker] Critical error: ${error.message}`);

    parentPort.postMessage({
      stage: "failed",
      progress: 0,
      error: error.message || "Unknown uninstallation error",
    });
  }
}

runUninstallation();
