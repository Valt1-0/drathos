// Fichier: drathos/src/main/installWorker.js

import { parentPort, workerData } from 'worker_threads';
import { installGame } from './installGame';

async function run() {
  try {
    await installGame(workerData.serverGame, {
      store: { get: (key) => workerData.storeData[key] },
      sendProgress: (data) => parentPort.postMessage(data),
    });
  } catch (error) {
    parentPort.postMessage({ stage: 'Failed', error: error.message });
  }
}

run();