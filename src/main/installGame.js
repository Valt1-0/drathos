// Fichier: drathos/src/main/installGame.js

import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { once } from "events";
import { jwtDecode } from "jwt-decode";

import unzipper from "unzipper";

const getExtractFunction = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".zip") {
    return async (inputPath, options) => {
      const directory = await unzipper.Open.file(inputPath);
      const totalEntries = directory.files.length;
      let extractedCount = 0;

      for (const entry of directory.files) {
        const outputPath = path.join(options.dir, entry.path);

        if (entry.type === "Directory") {
          await fs.promises.mkdir(outputPath, { recursive: true });
        } else {
          await fs.promises.mkdir(path.dirname(outputPath), {
            recursive: true,
          });
          await new Promise((resolve, reject) => {
            entry
              .stream()
              .pipe(fs.createWriteStream(outputPath))
              .on("finish", resolve)
              .on("error", reject);
          });
        }

        extractedCount++;
        // Ici on envoie la progression
        options.sendProgress({
          id: options.id,
          stage: "Extracting",
          progress: Math.round((extractedCount / totalEntries) * 100),
          extractedFiles: extractedCount,
          totalFiles: totalEntries,
        });
      }
    };
  }

  throw new Error(`Unsupported file extension: ${ext}`);
};

// // Fonction pour détecter et extraire selon le format
// const getExtractFunction = (filePath) => {
//   const ext = path.extname(filePath).toLowerCase();

//   if (ext === ".zip") {
//     return async (inputPath, options) => {
//       const zip = new AdmZip(inputPath);
//       zip.extractAllTo(options.dir, true);
//     };
//   }

//   if (ext === ".7z") {
//     return async (inputPath, options) => {
//       const stream = Extract(inputPath, options.dir, {
//         $bin: "7z", // suppose que 7z est accessible dans le PATH
//         recursive: true,
//       });

//       stream.on("error", (err) => {
//         throw err;
//       });

//       await once(stream, "end");
//     };
//   }

//   throw new Error(`Unsupported file extension: ${ext}`);
// };

export const installGame = async (serverGame, { store, sendProgress }) => {
  const downloadPath = store.get("downloadPath");
  const serverAddress = store.get("serverAddress");
  const userToken = store.get("userToken");

  const url = `http://${serverAddress}/api/serverGame/downloadGame/${serverGame._id}`;
  const filePath = path.join(downloadPath, serverGame.zipFileName);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const fileStream = fs.createWriteStream(filePath);
    const reader = response.body.getReader();

    let receivedLength = 0;
    const contentLength = parseInt(
      response.headers.get("content-length") || "0",
      10
    );

    let lastTime = Date.now();
    let lastBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileStream.write(value);
      receivedLength += value.length;

      const now = Date.now();
      if (now - lastTime > 500) {
        // update toutes les 0.5s
        const elapsedSeconds = (now - lastTime) / 1000;
        const bytesDiff = receivedLength - lastBytes;
        const speedMBps = bytesDiff / 1024 / 1024 / elapsedSeconds;

        sendProgress({
          id: serverGame._id,
          progress: Math.round((receivedLength / contentLength) * 100),
          stage: "Downloading",
          speed: speedMBps,
          sizeDownloaded: receivedLength / 1024 / 1024, // MB
          totalSize: contentLength / 1024 / 1024, // MB
        });

        lastTime = now;
        lastBytes = receivedLength;
      }
    }

    fileStream.end();
    await new Promise((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });

    const extractPath = path.join(downloadPath, serverGame._id);
    const extractFunction = getExtractFunction(filePath);
    await extractFunction(filePath, { dir: extractPath });
    await fs.promises.unlink(filePath);

    if (!userToken || typeof userToken !== "string") {
      throw new Error("Token utilisateur invalide.");
    }

    const decoded = jwtDecode(userToken);
    const userId = decoded.user.id;

    // 🔗 Appel API pour enregistrer le jeu installé
    const installResponse = await fetch(
      `http://${serverAddress}/api/installedGames/addInstalledGame`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          serverGameId: serverGame._id,
          path: extractPath,
          version: serverGame.version,
        }),
      }
    );

    const installResult = await installResponse.json();
    if (!installResponse.ok || installResult?.error) {
      throw new Error(
        installResult?.message ||
          "Erreur lors de l'enregistrement du jeu installé."
      );
    }

    sendProgress({
      id: serverGame._id,
      progress: 100,
      stage: "Completed",
    });

    return { success: true };
  } catch (error) {
    console.error("Error during game installation:", error);
    sendProgress({
      id: serverGame._id,
      progress: 0,
      stage: "Failed",
      error: error.message,
    });
    return { success: false, error: error.message };
  }
};
