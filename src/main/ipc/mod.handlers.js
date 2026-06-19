/**
 * Mod management IPC handlers
 */
import { app } from "electron";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import store from "../store.js";
import { getToken } from "../utils/tokenStore.js";
import { extractionEngine } from "../extractionEngine.js";
import { validateFilename, validateAndResolvePath } from "../app/validation.js";
import logger from "../utils/logger.js";
import { apiRequest } from "../utils/httpClient.js";
import { secureHandle } from "./secureHandle.js";
import { MAX_MOD_SIZE, MIN_ARCHIVE_SIZE } from "../app/constants.js";

export const registerModHandlers = () => {
  secureHandle("mod:download", async (_event, { modId, gameId }) => {
    let tempArchivePath = null;

    try {
      const serverAddress = store.get("serverAddress");
      const token = getToken();
      if (!serverAddress || !token) throw new Error("Server not configured");

      const installedGames = store.get("installedGamesCache") || {};
      const gameData = installedGames[gameId];
      if (!gameData?.path) throw new Error("Game not installed");

      // Fetch mod metadata
      const modRes = await apiRequest(`${serverAddress}/api/mods/${modId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!modRes.ok) throw new Error(`Failed to fetch mod info: HTTP ${modRes.status}`);
      const modInfo = await modRes.json();
      if (!modInfo.installPath) throw new Error("Mod has no installation path");

      const extractPath = validateAndResolvePath(gameData.path, modInfo.installPath);
      await fs.promises.mkdir(extractPath, { recursive: true });

      // Download mod
      const response = await apiRequest(`${serverAddress}/api/mods/download/${modId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);

      const contentType = response.headers["content-type"];
      const contentDisposition = response.headers["content-disposition"];

      if (contentType?.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Server returned an error");
      }
      if (!contentDisposition?.includes("attachment")) {
        throw new Error("Invalid response: expected file download");
      }

      // Get filename
      let filename = `${modId}.zip`;
      const match = contentDisposition.match(/filename="(.+?)"|filename=([^;\s]+)/);
      if (match) filename = validateFilename(match[1] || match[2]);

      const ext = extractionEngine.getFileExtension(filename);
      if (!extractionEngine.isSupported(ext)) {
        throw new Error(`Unsupported format: ${ext}`);
      }

      // Save temp file
      const tempDir = path.join(app.getPath("temp"), "drathos-mods");
      await fs.promises.mkdir(tempDir, { recursive: true });
      tempArchivePath = path.join(tempDir, `${modId}_${Date.now()}_${filename}`);

      const buffer = await response.arrayBuffer();
      if (buffer.length > MAX_MOD_SIZE) throw new Error("File exceeds 5GB limit");
      if (buffer.length < MIN_ARCHIVE_SIZE) throw new Error("File too small, may be corrupted");

      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", buffer);
      const fileHash = Buffer.from(hashBuffer).toString("hex");
      if (modInfo.fileHash && modInfo.fileHash !== fileHash) {
        throw new Error("File integrity check failed");
      }

      await fs.promises.writeFile(tempArchivePath, buffer);
      await extractionEngine.extract(tempArchivePath, extractPath);
      await fs.promises.unlink(tempArchivePath).catch(() => {});

      // Update store
      const installedMods = store.get("installedMods") || {};
      installedMods[gameId] = installedMods[gameId] || {};
      installedMods[gameId][modId] = {
        id: modId, path: extractPath, installPath: modInfo.installPath,
        enabled: true, installedAt: new Date().toISOString(), fileHash, fileSize: buffer.length,
      };
      store.set("installedMods", installedMods);

      return { success: true, path: extractPath, hash: fileHash };
    } catch (error) {
      if (tempArchivePath) await fs.promises.unlink(tempArchivePath).catch(() => {});
      logger.error("[Mods] Download error:", error);
      return { success: false, error: error.message };
    }
  });

  secureHandle("mod:deleteFile", async (_event, { modId }) => {
    try {
      const installedMods = store.get("installedMods") || {};
      let gameIdToUpdate = null;
      let modInfo = null;

      for (const [gid, mods] of Object.entries(installedMods)) {
        if (mods[modId]) { modInfo = mods[modId]; gameIdToUpdate = gid; break; }
      }
      if (!modInfo) return { success: true };

      if (fs.existsSync(modInfo.path)) {
        await fs.promises.rm(modInfo.path, { recursive: true, force: true });
      }

      if (gameIdToUpdate) delete installedMods[gameIdToUpdate][modId];
      store.set("installedMods", installedMods);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  secureHandle("mod:verifyIntegrity", async (_event, { modId, gameId }) => {
    try {
      const installedMods = store.get("installedMods") || {};
      const modInfo = installedMods[gameId]?.[modId];
      if (!modInfo) return { success: false, error: "Mod not found" };

      if (!modInfo.path || !fs.existsSync(modInfo.path)) {
        return { success: true, integrity: "missing", message: "Mod files not found" };
      }

      const stats = await fs.promises.stat(modInfo.path);
      if (stats.isDirectory()) {
        const files = await fs.promises.readdir(modInfo.path);
        return files.length === 0
          ? { success: true, integrity: "corrupted", message: "Mod directory is empty" }
          : { success: true, integrity: "valid", message: `Mod installed (${files.length} files)`, fileCount: files.length };
      }

      // Old format: archive file
      if (!modInfo.fileHash) return { success: true, integrity: "unknown", message: "No hash stored" };
      const buffer = await fs.promises.readFile(modInfo.path);
      const currentHash = crypto.createHash("sha256").update(buffer).digest("hex");
      const isValid = currentHash === modInfo.fileHash;
      return { success: true, integrity: isValid ? "valid" : "corrupted", message: isValid ? "Verified" : "Corrupted" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
