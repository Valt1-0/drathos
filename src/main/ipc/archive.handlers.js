/**
 * Archive scanning IPC handlers
 */
import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import Seven from "node-7z";
import sevenBin from "7zip-bin";

const EXECUTABLE_PATTERNS = {
  windows: [".exe", ".bat", ".cmd"],
  linux: [".sh", ".run", ".bin", ".AppImage"],
};

const ALL_EXTENSIONS = Object.values(EXECUTABLE_PATTERNS).flat();
const PLATFORM_MAP = { win32: "windows", linux: "linux" };

const get7zipPath = () => {
  let p = sevenBin.path7za;
  if (p.includes("app.asar") && !p.includes("app.asar.unpacked")) {
    p = p.replace("app.asar", "app.asar.unpacked");
  }
  return p;
};

const detectPlatform = (filePath) => {
  const lower = filePath.toLowerCase();
  for (const [platform, exts] of Object.entries(EXECUTABLE_PATTERNS)) {
    if (exts.some((ext) => lower.endsWith(ext))) return platform;
  }
  return null;
};

const scanArchive = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: "File not found", executables: [] };
  }

  const executables = [];
  const stream = Seven.list(filePath, { $bin: get7zipPath() });

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Scan timeout", executables: [] });
    }, 30000);

    stream.on("data", (data) => {
      if (!data.file || data.file.endsWith("/") || data.file.endsWith("\\")) return;
      const fileName = data.file.split(/[/\\]/).pop();
      if (!ALL_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext))) return;

      const platform = detectPlatform(data.file);
      if (platform) executables.push({ path: data.file, platform, name: fileName, size: data.size || 0 });
    });

    stream.on("end", () => {
      clearTimeout(timeout);
      const currentPlatform = PLATFORM_MAP[process.platform];
      executables.sort((a, b) => {
        if (a.platform === currentPlatform && b.platform !== currentPlatform) return -1;
        if (a.platform !== currentPlatform && b.platform === currentPlatform) return 1;
        return a.path.length - b.path.length;
      });
      resolve({ success: true, executables, count: executables.length });
    });

    stream.on("error", (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message, executables: [] });
    });
  });
};

const getMainWindow = () => BrowserWindow.getAllWindows()[0];

export const registerArchiveHandlers = () => {
  ipcMain.handle("readArchiveFile", async (_, filePath) => {
    try {
      const buffer = await fs.promises.readFile(filePath);
      return { success: true, buffer };
    } catch (error) {
      return { success: false, error: error.code === "ENOENT" ? "File not found" : error.message };
    }
  });

  ipcMain.handle("selectAndScanArchive", async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        properties: ["openFile"],
        filters: [
          { name: "Archives", extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz"] },
          { name: "All files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

      const filePath = result.filePaths[0];
      const scanResult = await scanArchive(filePath);
      const stats = await fs.promises.stat(filePath);

      return { ...scanResult, filePath, fileName: path.basename(filePath), fileSize: stats.size };
    } catch (error) {
      return { success: false, error: error.message, executables: [] };
    }
  });

  ipcMain.handle("listArchiveFiles", async (_, filePath) => scanArchive(filePath));

  ipcMain.handle("selectArchiveFile", async () => {
    try {
      const result = await dialog.showOpenDialog(getMainWindow(), {
        properties: ["openFile"],
        filters: [
          { name: "Archives", extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz"] },
          { name: "All files", extensions: ["*"] },
        ],
      });

      if (result.canceled || !result.filePaths.length) return { success: false, canceled: true };

      const filePath = result.filePaths[0];
      const stats = await fs.promises.stat(filePath);
      return { success: true, filePath, fileName: path.basename(filePath), fileSize: stats.size };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
