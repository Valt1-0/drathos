// Fichier: drathos/src/main/index.js

// Désactiver les warnings de sécurité en développement (unsafe-eval nécessaire pour Vite HMR)
if (process.env.NODE_ENV !== "production") {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  dialog,
  session,
  globalShortcut,
} from "electron";
import path, { join } from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import iconPath from "../../resources/logo2.png?asset";

import { GameLauncher } from "./gameLauncher.js";
import { moduleLoader } from "./utils/moduleLoader.js";
import { memoryManager } from "./utils/memoryManager.js";
import { AutoUpdateManager } from "./autoUpdater.js";
import { SplashWindow } from "./splashWindow.js";
import { extractionEngine } from "./extractionEngine.js";
import store from "./store.js";
import logger from "./utils/logger.js";

// Discord RPC sera chargé dynamiquement selon les besoins
let discordRPC = null;
let autoUpdateManager = null;
let splashWindow = null;

const execAsync = promisify(exec);

const gameLauncher = new GameLauncher();

// Fonction pour obtenir le chemin de l'icône de manière sécurisée
function getIconPath() {
  // Vérifier si le fichier existe
  if (fs.existsSync(iconPath)) {
    return iconPath;
  }

  // Fallback pour Linux (utilise l'icône système si disponible)
  if (process.platform === "linux") {
    const systemIconPath = path.join(__dirname, "../../build/icon.png");
    if (fs.existsSync(systemIconPath)) {
      return systemIconPath;
    }
  }

  // Si aucun chemin ne fonctionne, retourner undefined (Electron utilisera l'icône par défaut)
  console.warn(
    "[Icon] Impossible de trouver l'icône, utilisation de l'icône par défaut"
  );
  return undefined;
}

const icon = getIconPath();

// === UTILITAIRES DE SÉCURITÉ ===

/**
 * Vérifie si un fichier est exécutable selon la plateforme
 * @param {string} fileName - Nom du fichier
 * @returns {boolean} - true si le fichier est un exécutable
 */
function isExecutableFile(fileName) {
  const platform = process.platform;
  const lower = fileName.toLowerCase();

  switch (platform) {
    case "win32":
      return (
        lower.endsWith(".exe") ||
        lower.endsWith(".bat") ||
        lower.endsWith(".cmd")
      );

    case "linux":
      return (
        lower.endsWith(".sh") ||
        lower.endsWith(".run") ||
        lower.endsWith(".bin") ||
        lower.endsWith(".appimage")
      );

    case "darwin":
      return (
        fileName.endsWith(".app") ||
        lower.endsWith(".command") ||
        lower.endsWith(".sh")
      );

    default:
      return false;
  }
}

/**
 * Valide qu'une URL est sûre pour être ouverte avec shell.openExternal
 * @param {string} url - URL à valider
 * @returns {boolean} - true si l'URL est sûre
 */
function isSafeForExternalOpen(url) {
  try {
    const parsedUrl = new URL(url);

    // Liste blanche de protocoles sûrs
    const safeProtocols = ["http:", "https:", "mailto:"];

    if (!safeProtocols.includes(parsedUrl.protocol)) {
      console.warn(`[Security] Protocole non autorisé: ${parsedUrl.protocol}`);
      return false;
    }

    // Bloquer les URLs file:// et autres protocoles dangereux
    if (parsedUrl.protocol === "file:") {
      console.warn(`[Security] Protocole file:// bloqué`);
      return false;
    }

    // Pour http/https, vérifier que ce n'est pas localhost ou IP privée
    // (optionnel selon vos besoins)

    return true;
  } catch (error) {
    console.error(`[Security] URL invalide: ${url}`, error);
    return false;
  }
}

/**
 * Valide que le sender d'un message IPC est légitime
 * @param {Electron.WebFrameMain} frame - Frame qui a envoyé le message
 * @returns {boolean} - true si le sender est autorisé
 */
function isValidSender(frame) {
  // Vérifier que le frame provient de notre application
  // En production, ajoutez des vérifications plus strictes
  try {
    const frameUrl = new URL(frame.url);

    // Autoriser file:// pour notre application locale
    if (frameUrl.protocol === "file:") {
      return true;
    }

    // En développement, autoriser localhost
    if (
      is.dev &&
      (frameUrl.hostname === "localhost" || frameUrl.hostname === "127.0.0.1")
    ) {
      return true;
    }

    console.warn(`[Security] Sender non autorisé: ${frame.url}`);
    return false;
  } catch (error) {
    console.error(`[Security] Erreur validation sender:`, error);
    return false;
  }
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: "Drathos",
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 200,
    show: false, // Ne pas afficher automatiquement, le splash s'en occupera
    frame: false,
    autoHideMenuBar: true,
    icon: icon,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true, // ✅ Sécurisé
      contextIsolation: true, // ✅ Obligatoire pour la sécurité
      nodeIntegration: false, // ✅ Désactiver Node dans le renderer
      nodeIntegrationInWorker: false, // ✅ Pas nécessaire pour vos Worker Threads
      partition: "persist:drathos", // ✅ Permet IndexedDB en mode sandbox
      zoomFactor: 1.0, // Fix scaling Wayland
    },
  });

  // Ne pas afficher automatiquement - géré par le splash screen
  // mainWindow.on("ready-to-show", () => {
  //   mainWindow.show();
  // });

  // Ouvrir les DevTools uniquement en développement
  if (is.dev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // Valider l'URL avant de l'ouvrir
    if (isSafeForExternalOpen(details.url)) {
      setImmediate(() => {
        shell.openExternal(details.url);
      });
    } else {
      console.warn(`[Security] URL bloquée: ${details.url}`);
    }
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    const rendererPath = join(__dirname, "../renderer/index.html");
    mainWindow.loadFile(rendererPath);
  }

  return mainWindow;
}

// Désactiver le menu par défaut pour améliorer les performances de démarrage
Menu.setApplicationMenu(null);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Initialiser le système de logging
  await logger.initialize();
  logger.info("[App] Starting Drathos...", { version: app.getVersion() });

  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // Créer et afficher le splash screen
  const splash = new SplashWindow(icon);
  splashWindow = splash.create();
  logger.info("[App] Splash screen created");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const serverAddress = store.get("serverAddress", "");

    const buildCSP = () => {
      // En développement ET pour les applications Electron packagées,
      // autoriser toutes les connexions HTTP/HTTPS pour faciliter la configuration
      if (is.dev) {
        return (
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https: http: blob:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' ws: http: https:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self';"
        );
      }

      const igdb = "https://images.igdb.com";

      // Construire dynamiquement les URLs backend autorisées
      // Autoriser HTTP et HTTPS pour supporter les IPs locales et domaines
      const backendHttp = serverAddress
        ? `http://${serverAddress.replace(/^https?:\/\//, "")}`
        : "";
      const backendHttps = serverAddress
        ? `https://${serverAddress.replace(/^https?:\/\//, "")}`
        : "";

      return (
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        `img-src 'self' data: blob: ${igdb} ${backendHttp} ${backendHttps} http: https:; ` +
        "font-src 'self' data:; " +
        `connect-src 'self' ${igdb} ${backendHttp} ${backendHttps} http: https:; ` +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none';"
      );
    };

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [buildCSP()],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "X-XSS-Protection": ["1; mode=block"],
        "Referrer-Policy": ["strict-origin-when-cross-origin"],
      },
    });
  });

  // === SÉCURITÉ: Permission Request Handler ===
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const parsedUrl = new URL(webContents.getURL());

      // Refuser toutes les permissions par défaut sauf pour notre app locale
      if (parsedUrl.protocol === "file:") {
        // Pour les fichiers locaux, n'autoriser que certaines permissions
        const allowedPermissions = ["notifications"];
        callback(allowedPermissions.includes(permission));
      } else {
        // Refuser toutes les permissions pour le contenu distant
        console.warn(
          `[Security] Permission ${permission} refusée pour ${parsedUrl.href}`
        );
        callback(false);
      }
    }
  );

  // === SÉCURITÉ: Limitation de la navigation ===
  app.on("web-contents-created", (event, contents) => {
    contents.on("will-navigate", (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      // Autoriser uniquement file:// et localhost en dev
      if (parsedUrl.protocol !== "file:") {
        if (
          is.dev &&
          (parsedUrl.hostname === "localhost" ||
            parsedUrl.hostname === "127.0.0.1")
        ) {
          // OK en développement
          return;
        }

        console.warn(`[Security] Navigation bloquée vers: ${navigationUrl}`);
        event.preventDefault();
      }
    });

    // Empêcher la création de nouvelles fenêtres non autorisées
    contents.setWindowOpenHandler(({ url }) => {
      if (isSafeForExternalOpen(url)) {
        setImmediate(() => {
          shell.openExternal(url);
        });
      }
      return { action: "deny" };
    });
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Register global shortcuts for app reload
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    console.log("[Shortcut] Ctrl+Shift+R pressed - Hard reloading app...");
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.webContents.reloadIgnoringCache();
    }
  });

  globalShortcut.register("F5", () => {
    console.log("[Shortcut] F5 pressed - Reloading app...");
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.webContents.reload();
    }
  });

  //* IPC test
  //* ipcMain.on("ping", () => console.log("pong"));

  // Gestionnaires pour les contrôles de fenêtre
  ipcMain.on("window-minimize", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.minimize();
  });

  ipcMain.on("window-maximize", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.on("window-close", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.close();
  });

  ipcMain.handle("window-is-maximized", () => {
    const window = BrowserWindow.getFocusedWindow();
    return window ? window.isMaximized() : false;
  });

  ipcMain.on("window-toggle-devtools", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.webContents.toggleDevTools();
  });

  // Recharger l'application complètement
  ipcMain.on("reload-app", () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) window.webContents.reloadIgnoringCache();
  });

  // Créer la fenêtre principale (mais ne pas l'afficher encore)
  const mainWindow = createWindow();

  // Initialiser le gestionnaire de mémoire
  memoryManager.initialize();

  // Initialiser l'auto-updater
  autoUpdateManager = new AutoUpdateManager();
  autoUpdateManager.setMainWindow(mainWindow);
  logger.info("[AutoUpdater] Manager initialized");

  // Attendre pour l'animation du splash
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Fermer le splash et afficher la fenêtre principale
  splash.close();
  splashWindow = null;

  if (!mainWindow.isDestroyed()) {
    mainWindow.show();
  }

  logger.info("[App] Main window shown");

  // Vérifier les mises à jour APRÈS l'affichage de la fenêtre pour ne pas ralentir le démarrage
  setTimeout(async () => {
    try {
      logger.info("[App] Starting initial update check...");
      const updateResult = await autoUpdateManager.checkForUpdates();

      if (updateResult.available) {
        logger.info("[App] Update available:", updateResult.latestVersion);
      } else {
        logger.info("[App] No updates available");
      }
    } catch (error) {
      logger.error("[App] Error checking for updates:", error);
    }
  }, 3000); // Attendre 3 secondes après l'affichage

  // Démarrer les vérifications périodiques toutes les 2 heures
  autoUpdateManager.startPeriodicCheck(120);

  // Charger Discord RPC uniquement si activé (lazy loading)
  const discordRPCEnabled = store.get("discordRPCEnabled", false);

  if (discordRPCEnabled) {
    console.log("[Main] Discord RPC activé, chargement du module...");

    // Charger de manière asynchrone pour ne pas bloquer le démarrage
    moduleLoader
      .loadDiscordRPC(true)
      .then((rpc) => {
        if (rpc) {
          discordRPC = rpc;
          discordRPC.isEnabled = true;

          // Injecter Discord RPC dans gameLauncher
          gameLauncher.setDiscordRPC(discordRPC);

          return discordRPC.initialize(true);
        }
      })
      .then((result) => {
        if (result) {
          console.log("[Discord RPC] Initialisé avec succès");
        }
      })
      .catch((error) => {
        console.error(
          "[Discord RPC] Erreur lors du chargement/initialisation:",
          error
        );
      });
  } else {
    console.log("[Discord RPC] Désactivé dans les settings, module non chargé");
  }

  // Tray icon setup
  const tray = new Tray(icon);
  tray.setToolTip("Drathos");

  const trayMenu = Menu.buildFromTemplate([
    {
      label: "Ouvrir Drathos",
      click: () => {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quitter",
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(trayMenu);

  tray.on("click", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  gameLauncher.cleanup();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Nettoyage à la fermeture de l'application
app.on("before-quit", async () => {
  console.log("[Main] Fermeture de l'application...");

  // Nettoyer le gameLauncher
  gameLauncher.cleanup();

  // Déconnecter Discord RPC proprement s'il est chargé
  if (discordRPC && discordRPC.isConnected) {
    console.log("[Main] Déconnexion de Discord RPC...");
    await discordRPC.disconnect();
  }

  // Nettoyer l'auto-updater
  if (autoUpdateManager) {
    autoUpdateManager.cleanup();
  }

  // Nettoyer le gestionnaire de mémoire
  await memoryManager.cleanup();

  // Décharger tous les modules
  moduleLoader.unloadAll();

  // Unregister global shortcuts
  globalShortcut.unregisterAll();
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

//* Store handlers

ipcMain.handle("store-get", (event, key) => {
  return store.get(key);
});

ipcMain.handle("store-set", (event, key, value) => {
  store.set(key, value);
});

ipcMain.handle("store-delete", (event, key) => {
  store.delete(key);
});

ipcMain.handle("store-clear", () => {
  store.clear();
});

ipcMain.handle("shell:openExternal", async (event, url) => {
  // Valider le sender
  if (!isValidSender(event.senderFrame)) {
    console.error(
      `[Security] shell:openExternal appelé par un sender non autorisé`
    );
    throw new Error("Unauthorized sender");
  }

  // Valider l'URL
  if (!isSafeForExternalOpen(url)) {
    console.error(`[Security] URL non sûre bloquée: ${url}`);
    throw new Error("Unsafe URL blocked");
  }

  console.log(`[Security] Ouverture URL validée: ${url}`);
  await shell.openExternal(url);
});

function validateFilename(filename) {
  if (!filename || typeof filename !== "string") {
    throw new Error("Invalid filename");
  }

  // Remove any path components
  let basename = path.basename(filename);

  // Remove quotes and dangerous characters
  basename = basename.replace(/[<>:"|?*\x00-\x1f]/g, '');

  // Replace multiple spaces with single space
  basename = basename.replace(/\s+/g, ' ').trim();

  // Check for reserved Windows names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reserved.test(basename)) {
    basename = '_' + basename;
  }

  // Limit filename length
  if (basename.length > 255) {
    const ext = path.extname(basename);
    const nameWithoutExt = basename.slice(0, -ext.length);
    basename = nameWithoutExt.slice(0, 255 - ext.length) + ext;
  }

  return basename;
}

function validateAndResolvePath(gameInstallPath, relativeModPath) {
  // Security validations
  if (!relativeModPath || typeof relativeModPath !== "string") {
    throw new Error("Invalid installation path");
  }

  // Normalize the relative path (handles both / and \)
  const normalized = path.normalize(relativeModPath);

  // Check for path traversal attempts
  if (normalized.includes("..")) {
    throw new Error("Path traversal not allowed in installation path");
  }

  // Check for absolute paths
  if (path.isAbsolute(normalized)) {
    throw new Error("Installation path must be relative to game directory");
  }

  // Additional security: check for null bytes
  if (normalized.includes("\0")) {
    throw new Error("Null bytes not allowed in path");
  }

  // Check for dangerous characters in path
  const dangerousChars = /[<>:"|?*\x00-\x1f]/g;
  if (dangerousChars.test(normalized)) {
    throw new Error("Path contains invalid characters");
  }

  // Resolve the full path
  const fullPath = path.resolve(gameInstallPath, normalized);

  // Verify the resolved path is still inside the game directory
  const relativePath = path.relative(gameInstallPath, fullPath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("Installation path must be inside game directory");
  }

  return fullPath;
}

//* Mod management handlers */
ipcMain.handle("mod:download", async (event, { modId, gameId }) => {
  let tempArchivePath = null;

  try {
    const serverAddress = store.get("serverAddress");
    const token = store.get("userToken");

    if (!serverAddress || !token) {
      throw new Error("Server address or token not configured");
    }

    console.log(`[Mods] Downloading mod ${modId} for game ${gameId}`);

    // Verify game is installed and get installation path
    const installedGames = store.get("installedGamesCache") || {};
    const gameData = installedGames[gameId];

    if (!gameData || !gameData.path) {
      throw new Error(
        "Game not installed. Please install the game before installing mods."
      );
    }

    // Fetch mod metadata to get installPath
    const modInfoUrl = `${serverAddress}/api/mods/${modId}`;
    const modInfoResponse = await fetch(modInfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!modInfoResponse.ok) {
      throw new Error(
        `Failed to fetch mod info: ${modInfoResponse.statusText}`
      );
    }

    const modInfo = await modInfoResponse.json();

    if (!modInfo.installPath) {
      throw new Error("Mod does not have an installation path configured");
    }

    // Validate and resolve installation path
    const extractPath = validateAndResolvePath(
      gameData.path,
      modInfo.installPath
    );

    // Create mod directory inside game installation
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    // Download mod from server
    const url = `${serverAddress}/api/mods/download/${modId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download mod: ${response.statusText}`);
    }

    // Log response headers for debugging
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentDisposition = response.headers.get("content-disposition");

    console.log(`[Mods] Response content-type: ${contentType}`);
    console.log(`[Mods] Response content-length: ${contentLength ? (parseInt(contentLength) / (1024 * 1024)).toFixed(2) + ' MB' : 'unknown'}`);
    console.log(`[Mods] Response content-disposition: ${contentDisposition}`);

    // Verify this is a file download, not an error response
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.details || "Server returned an error instead of the file");
    }

    if (!contentDisposition || !contentDisposition.includes("attachment")) {
      throw new Error("Invalid response: expected file download but got different content");
    }

    // Get filename from headers
    let filename = `${modId}.zip`;
    const filenameMatch = contentDisposition.match(/filename="(.+?)"|filename=([^;\s]+)/);
    if (filenameMatch) {
      filename = filenameMatch[1] || filenameMatch[2];
    }

    // Validate and sanitize filename
    filename = validateFilename(filename);

    // Verify file extension is supported
    const ext = extractionEngine.getFileExtension(filename);
    if (!extractionEngine.isSupported(ext)) {
      throw new Error(
        `File extension ${ext} not supported. Supported: ${extractionEngine.getSupportedFormats().join(", ")}`
      );
    }

    // Save to temporary location first
    const tempDir = path.join(app.getPath("temp"), "drathos-mods");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempArchivePath = path.join(tempDir, `${modId}_${Date.now()}_${filename}`);

    // Download file
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[Mods] Downloaded buffer size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB`);

    // Security: Verify file size (max 5GB)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (buffer.length > maxSize) {
      throw new Error(
        `File too large: ${(buffer.length / (1024 * 1024 * 1024)).toFixed(
          2
        )}GB exceeds 5GB limit`
      );
    }

    if (buffer.length === 0) {
      throw new Error("Downloaded file is empty. Server may have returned an error response.");
    }

    // Verify minimum file size (at least 1KB for a valid archive)
    if (buffer.length < 1024) {
      console.warn(`[Mods] Suspiciously small file: ${buffer.length} bytes`);
      console.warn(`[Mods] First 100 bytes: ${buffer.toString('utf8', 0, Math.min(100, buffer.length))}`);
      throw new Error(`Downloaded file is too small (${buffer.length} bytes). This may be an error response. Check server logs.`);
    }

    // Calculate SHA256 hash for integrity verification
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(buffer);
    const fileHash = hash.digest("hex");

    console.log(`[Mods] File hash (SHA256): ${fileHash}`);

    // Verify hash if provided by server
    if (modInfo.fileHash && modInfo.fileHash !== fileHash) {
      throw new Error(
        `File integrity check failed. Expected hash: ${modInfo.fileHash}, got: ${fileHash}`
      );
    }

    // Write temp archive
    fs.writeFileSync(tempArchivePath, buffer);
    console.log(`[Mods] Archive downloaded to temp: ${tempArchivePath}`);

    // Extract archive to game directory
    console.log(`[Mods] Extracting to: ${extractPath}`);
    await extractionEngine.extract(tempArchivePath, extractPath, (progress, extracted, total, file) => {
      console.log(`[Mods] Extraction progress: ${progress}% (${extracted}/${total}) - ${file}`);
    });

    console.log(`[Mods] Extraction complete`);

    // Delete temp archive
    if (fs.existsSync(tempArchivePath)) {
      fs.unlinkSync(tempArchivePath);
      console.log(`[Mods] Temp archive deleted`);
    }

    // Update store
    const installedMods = store.get("installedMods") || {};
    if (!installedMods[gameId]) {
      installedMods[gameId] = {};
    }

    installedMods[gameId][modId] = {
      id: modId,
      path: extractPath,
      installPath: modInfo.installPath,
      enabled: true,
      installedAt: new Date().toISOString(),
      fileHash: fileHash,
      fileSize: buffer.length,
    };

    store.set("installedMods", installedMods);

    console.log(`[Mods] Mod ${modId} installed successfully to ${extractPath}`);

    return {
      success: true,
      path: extractPath,
      hash: fileHash,
    };
  } catch (error) {
    console.error("[Mods] Error downloading mod:", error);

    // Cleanup temp file on error
    if (tempArchivePath && fs.existsSync(tempArchivePath)) {
      try {
        fs.unlinkSync(tempArchivePath);
        console.log(`[Mods] Temp archive cleaned up after error`);
      } catch (cleanupError) {
        console.error("[Mods] Failed to cleanup temp archive:", cleanupError);
      }
    }

    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("mod:deleteFile", async (event, { modId }) => {
  try {
    const installedMods = store.get("installedMods") || {};

    // Trouver le mod dans le store
    let modInfo = null;
    let gameIdToUpdate = null;
    for (const gameId in installedMods) {
      if (installedMods[gameId][modId]) {
        modInfo = installedMods[gameId][modId];
        gameIdToUpdate = gameId;
        break;
      }
    }

    if (!modInfo) {
      console.warn(`[Mods] Mod ${modId} not found in installed mods`);
      return { success: true }; // Déjà supprimé
    }

    // Supprimer le dossier/fichier du mod
    if (fs.existsSync(modInfo.path)) {
      const stats = fs.statSync(modInfo.path);
      if (stats.isDirectory()) {
        // Supprimer récursivement le dossier
        fs.rmSync(modInfo.path, { recursive: true, force: true });
        console.log(`[Mods] Deleted mod directory: ${modInfo.path}`);
      } else {
        // Supprimer le fichier (ancien format)
        fs.unlinkSync(modInfo.path);
        console.log(`[Mods] Deleted mod file: ${modInfo.path}`);
      }
    }

    // Supprimer du store
    if (gameIdToUpdate && installedMods[gameIdToUpdate]) {
      delete installedMods[gameIdToUpdate][modId];
    }

    store.set("installedMods", installedMods);

    return { success: true };
  } catch (error) {
    console.error("[Mods] Error deleting mod:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Verify mod installation by checking if files exist
 */
ipcMain.handle("mod:verifyIntegrity", async (event, { modId, gameId }) => {
  try {
    const installedMods = store.get("installedMods") || {};

    if (!installedMods[gameId] || !installedMods[gameId][modId]) {
      return {
        success: false,
        error: "Mod not found in installed mods",
      };
    }

    const modInfo = installedMods[gameId][modId];

    if (!modInfo.path || !fs.existsSync(modInfo.path)) {
      return {
        success: true,
        integrity: "missing",
        message: "Mod files not found",
      };
    }

    // Check if it's a directory (new format) or file (old format)
    const stats = fs.statSync(modInfo.path);

    if (stats.isDirectory()) {
      // New format: extracted directory
      const files = fs.readdirSync(modInfo.path);

      if (files.length === 0) {
        return {
          success: true,
          integrity: "corrupted",
          message: "Mod directory is empty",
        };
      }

      return {
        success: true,
        integrity: "valid",
        message: `Mod installed (${files.length} files/folders)`,
        fileCount: files.length,
      };
    } else {
      // Old format: archive file - verify hash
      const crypto = require("crypto");
      const fileBuffer = fs.readFileSync(modInfo.path);
      const hash = crypto.createHash("sha256");
      hash.update(fileBuffer);
      const currentHash = hash.digest("hex");

      if (!modInfo.fileHash) {
        return {
          success: true,
          integrity: "unknown",
          message: "No hash stored (old installation)",
        };
      }

      const isValid = currentHash === modInfo.fileHash;

      return {
        success: true,
        integrity: isValid ? "valid" : "corrupted",
        message: isValid ? "Archive integrity verified" : "Archive corrupted",
      };
    }
  } catch (error) {
    console.error("[Mods] Error verifying mod:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

//* Open file dialog */
ipcMain.handle("dialog:selectAndCreate", async () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled || !result.filePaths.length) return null;

  const basePath = result.filePaths[0];
  const subfolder = path.join(basePath, "DrathosGames");

  try {
    await fs.promises.access(subfolder);
  } catch {
    await fs.promises.mkdir(subfolder, { recursive: true });
  }

  return subfolder;
});

ipcMain.handle("dialog:openFolder", async () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

//* Install game */

import workerPath from "./installWorker.js?modulePath";
import { Worker } from "node:worker_threads";

ipcMain.handle("installGame", async (event, { serverGame }) => {
  console.log(`[Main] 🚀 Installation demandée: ${serverGame.name}`);

  return new Promise((resolve, reject) => {
    // Créer le worker avec le nouveau système simplifié
    const worker = new Worker(workerPath, {
      workerData: {
        serverGame,
        storeData: store.store,
      },
    });

    worker.on("message", (data) => {
      if (data.type === "store-set") {
        console.log(`[Main] Store.set: ${data.key}`);
        store.set(data.key, data.value);
        return;
      }

      console.log(
        `[Main] Progression ${serverGame.name}:`,
        data.stage,
        `${data.progress}%`
      );

      event.sender.send("downloadProgress", {
        id: serverGame._id,
        ...data,
      });

      if (data.stage === "Completed" || data.stage === "completed") {
        console.log(`[Main] Installation terminée: ${serverGame.name}`);

        // ✅ FIX: Mise à jour atomique du cache dans le main process (évite race condition)
        if (data.cacheData) {
          try {
            const installedGamesCache = store.get("installedGamesCache") || {};
            installedGamesCache[serverGame._id] = data.cacheData;
            store.set("installedGamesCache", installedGamesCache);
            console.log(`[Main] Cache mis à jour pour ${serverGame.name}`);
          } catch (cacheError) {
            console.error(`[Main] Erreur mise à jour cache:`, cacheError);
          }
        }

        resolve({ success: true, path: data.finalPath });
      }

      if (data.stage === "Failed") {
        console.error(
          `[Main] Installation échouée: ${serverGame.name} - ${data.error}`
        );
        reject(new Error(data.error));
      }
    });

    worker.on("error", (err) => {
      console.error(`[Main] Erreur worker pour ${serverGame.name}:`, err);

      // Notifier le renderer
      event.sender.send("downloadProgress", {
        id: serverGame._id,
        progress: 0,
        stage: "Failed",
        error: err.message,
      });

      reject(err);
    });

    // Gérer la fermeture inattendue du worker
    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(
          `[Main] ⚠️ Worker fermé avec code ${code} pour ${serverGame.name}`
        );
        reject(new Error(`Worker process exited with code ${code}`));
      }
    });
  });
});

// === GAME DETECTION ===
import { SimpleExecutableDetector } from "./simpleExecutableDetector.js";
import Seven from "node-7z";
import sevenBin from "7zip-bin";

let detectorInstance = null;
const getDetector = () => {
  if (!detectorInstance) {
    detectorInstance = new SimpleExecutableDetector();
  }
  return detectorInstance;
};

/**
 * Obtient le chemin correct du binaire 7zip, même quand l'app est packagée
 * En production, les binaires sont dans app.asar.unpacked, pas dans app.asar
 */
const get7zipPath = () => {
  let binPath = sevenBin.path7za;

  // En production, remplacer app.asar par app.asar.unpacked
  if (binPath.includes("app.asar") && !binPath.includes("app.asar.unpacked")) {
    binPath = binPath.replace("app.asar", "app.asar.unpacked");
  }

  return binPath;
};

ipcMain.handle("getBestExecutable", async (event, { gamePath, gameName }) => {
  console.log(`[Main] Recherche du meilleur exécutable pour ${gameName}`);
  const detector = getDetector();

  try {
    const bestExecutable = await detector.getBestExecutable(gamePath, gameName);

    if (bestExecutable) {
      return {
        success: true,
        executable: bestExecutable,
        message: "Exécutable détecté avec succès",
      };
    } else {
      return {
        success: false,
        error: "Aucun exécutable trouvé",
        executable: null,
      };
    }
  } catch (error) {
    console.error(`[Main] Erreur lors de la détection:`, error);
    return {
      success: false,
      error: error.message,
      executable: null,
    };
  }
});

// === GAME MANAGEMENT - UTILISE UNIQUEMENT GameLauncher ===

/**
 * Lance un jeu - VERSION NETTOYÉE utilisant GameLauncher
 */
ipcMain.handle("launchGame", async (event, params) => {
  console.log(`[Main] === DEMANDE DE LANCEMENT ===`);
  console.log(`[Main] Paramètres reçus:`, JSON.stringify(params, null, 2));

  try {
    let gameId, gamePath, executableName, gameName;

    // Extraction flexible des paramètres selon le format
    if (params.gameId && params.gamePath && params.executableName) {
      // Format direct: { gameId, gamePath, executableName, gameName }
      gameId = params.gameId;
      gamePath = params.gamePath;
      executableName = params.executableName;
      gameName = params.gameName;
      console.log(`[Main] Format direct détecté`);
    } else if (params.gameData) {
      // Format avec wrapping gameData
      const data = params.gameData;
      gameId = data.gameId || data._id;
      gamePath = data.gamePath;
      executableName = data.executableName;
      gameName = data.gameName || data.name;
      console.log(`[Main] Format gameData détecté`);
    } else {
      // Essayer d'extraire depuis la racine des params
      gameId = params._id || params.id;
      gamePath = params.installedPath || params.path;
      executableName = params.executableName;
      gameName = params.name || params.title;
      console.log(`[Main] Format racine détecté`);
    }

    // Vérifications des paramètres essentiels
    if (!gameId) {
      throw new Error("gameId manquant dans les paramètres");
    }
    if (!gamePath) {
      throw new Error("gamePath manquant dans les paramètres");
    }

    console.log(`[Main] Jeu: ${gameName || "Nom inconnu"} (ID: ${gameId})`);
    console.log(`[Main] Dossier: ${gamePath}`);
    console.log(
      `[Main] Exécutable spécifié: ${executableName || "Détection automatique"}`
    );

    // Si aucun exécutable spécifié, détecter automatiquement
    if (!executableName) {
      console.log(`[Main] 🔍 Détection automatique de l'exécutable...`);
      const detector = getDetector();
      const bestExecutable = await detector.getBestExecutable(
        gamePath,
        gameName || ""
      );

      if (bestExecutable) {
        executableName = bestExecutable;
        console.log(`[Main] ✅ Exécutable détecté: ${executableName}`);
      } else {
        throw new Error(
          "Impossible de détecter automatiquement l'exécutable du jeu"
        );
      }
    }

    // Utiliser GameLauncher au lieu du code dupliqué
    const result = await gameLauncher.launchGame(
      gameId,
      gamePath,
      executableName,
      (statusData) => {
        event.sender.send("gameStatusChanged", statusData);
      },
      store
    );

    console.log(`[Main] ✅ Résultat du lancement:`, result);
    return result;
  } catch (error) {
    console.error(`[Main] ❌ Erreur lors du lancement:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Obtient la liste des jeux actifs
 */
ipcMain.handle("getActiveGames", () => {
  return gameLauncher.getActiveGames();
});

/**
 * Vérifie si un jeu est en cours d'exécution
 */
ipcMain.handle("isGameRunning", (event, { gameId }) => {
  return gameLauncher.isGameRunning(gameId);
});

/**
 * Ouvre le dossier du jeu
 */
ipcMain.handle("openGameFolder", (event, gamePath) => {
  return gameLauncher.openGameFolder(gamePath);
});

/**
 * Obtient les informations d'un processus
 */
ipcMain.handle("getGameProcess", (event, { gameId }) => {
  return gameLauncher.getGameProcess(gameId);
});

/**
 * Détecte tous les exécutables disponibles pour un jeu
 */
ipcMain.handle("detectExecutables", async (event, { gamePath, gameName }) => {
  console.log(`[Main] Détection de tous les exécutables pour ${gameName}`);
  const detector = getDetector();

  try {
    const executables = await detector.listAllExecutables(gamePath, gameName);

    return {
      success: true,
      executables: executables,
      count: executables.length,
    };
  } catch (error) {
    console.error(`[Main] Erreur lors de la détection:`, error);
    return {
      success: false,
      error: error.message,
      executables: [],
    };
  }
});

/**
 * Liste le contenu d'un dossier de jeu
 */
ipcMain.handle("listGameDirectory", async (event, { gamePath }) => {
  try {
    // Vérifier l'existence de manière asynchrone
    try {
      await fs.promises.access(gamePath);
    } catch {
      return {
        success: false,
        error: "Dossier non trouvé",
      };
    }

    const items = await fs.promises.readdir(gamePath);
    const files = [];
    const directories = [];

    // Traiter tous les items en parallèle pour de meilleures performances
    await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(gamePath, item);
        try {
          const stats = await fs.promises.stat(itemPath);

          if (stats.isFile()) {
            files.push({
              name: item,
              size: stats.size,
              isExecutable: isExecutableFile(item),
            });
          } else if (stats.isDirectory()) {
            directories.push({
              name: item,
              path: itemPath,
            });
          }
        } catch (err) {
          console.warn(`[Main] Impossible de lire ${itemPath}:`, err.message);
        }
      })
    );

    return {
      success: true,
      files,
      directories,
      total: files.length + directories.length,
    };
  } catch (error) {
    console.error(`[Main] Erreur lors du listage:`, error);
    return {
      success: false,
      error: error.message,
    };
  }
});

// === SCAN D'ARCHIVES ===

const EXECUTABLE_PATTERNS = {
  windows: [".exe", ".bat", ".cmd"],
  linux: [".sh", ".run", ".bin", ".AppImage"],
  mac: [".app", ".command"],
};

const detectExecutablePlatform = (filePath) => {
  const lowerPath = filePath.toLowerCase();
  for (const [platform, extensions] of Object.entries(EXECUTABLE_PATTERNS)) {
    if (extensions.some((ext) => lowerPath.endsWith(ext))) return platform;
  }
  return null;
};

const scanArchiveForExecutables = async (filePath) => {
  const sevenZipPath = get7zipPath();

  if (!fs.existsSync(filePath)) {
    return { success: false, error: "Fichier introuvable", executables: [] };
  }

  const allExtensions = Object.values(EXECUTABLE_PATTERNS).flat();
  const executables = [];

  try {
    const stream = Seven.list(filePath, { $bin: sevenZipPath });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: "Timeout lors du scan de l'archive",
          executables: [],
        });
      }, 30000);

      stream.on("data", (data) => {
        if (!data.file || data.file.endsWith("/") || data.file.endsWith("\\"))
          return;

        const fileName = data.file.split(/[/\\]/).pop();
        const isExecutable = allExtensions.some((ext) =>
          fileName.toLowerCase().endsWith(ext)
        );

        if (isExecutable) {
          const platform = detectExecutablePlatform(data.file);
          if (platform) {
            executables.push({
              path: data.file,
              platform,
              name: fileName,
              size: data.size || 0,
            });
          }
        }
      });

      stream.on("end", () => {
        clearTimeout(timeout);

        const currentPlatformMap = {
          win32: "windows",
          linux: "linux",
          darwin: "mac",
        };
        const currentPlatform = currentPlatformMap[process.platform];

        executables.sort((a, b) => {
          if (a.platform === currentPlatform && b.platform !== currentPlatform)
            return -1;
          if (a.platform !== currentPlatform && b.platform === currentPlatform)
            return 1;
          return a.path.length - b.path.length;
        });

        console.log(`[Main] ✅ ${executables.length} exécutable(s) trouvé(s)`);
        resolve({ success: true, executables, count: executables.length });
      });

      stream.on("error", (err) => {
        clearTimeout(timeout);
        console.error(`[Main] ❌ Erreur lecture archive:`, err.message);
        resolve({
          success: false,
          error: err.message || "Erreur inconnue lors du scan",
          executables: [],
        });
      });
    });
  } catch (error) {
    console.error(
      "[Main] ❌ Exception lors de la création du stream:",
      error.message
    );
    return {
      success: false,
      error: error.message || "Erreur lors de la création du stream",
      executables: [],
    };
  }
};

ipcMain.handle("readArchiveFile", async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { success: true, buffer };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { success: false, error: "Fichier introuvable" };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle("selectAndScanArchive", async () => {
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Archives",
          extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz"],
        },
        { name: "Tous les fichiers", extensions: ["*"] },
      ],
      title: "Sélectionner une archive",
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const scanResult = await scanArchiveForExecutables(filePath);
    const stats = fs.statSync(filePath);

    return {
      ...scanResult,
      filePath,
      fileName: path.basename(filePath),
      fileSize: stats.size,
    };
  } catch (error) {
    console.error("[Main] ❌ Erreur dans selectAndScanArchive:", error);
    return { success: false, error: error.message, executables: [] };
  }
});

ipcMain.handle("listArchiveFiles", async (event, filePath) => {
  return await scanArchiveForExecutables(filePath);
});

ipcMain.handle("selectArchiveFile", async () => {
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        {
          name: "Archives",
          extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz"],
        },
        { name: "Tous les fichiers", extensions: ["*"] },
      ],
      title: "Sélectionner une archive",
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);

    return {
      success: true,
      filePath,
      fileName: path.basename(filePath),
      fileSize: stats.size,
    };
  } catch (error) {
    console.error("[Main] Erreur dans selectArchiveFile:", error);
    return { success: false, error: error.message };
  }
});

//------------------------------\\

// === ARRÊT DE JEU - Utilise GameLauncher ===

/**
 * ✅ Arrête un jeu (déjà implémenté dans GameLauncher)
 */
ipcMain.handle("stopGame", async (event, { gameId, force = false }) => {
  console.log(`[Main] 🛑 Arrêt demandé pour ${gameId} (force: ${force})`);
  return await gameLauncher.stopGame(gameId, force);
});

/**
 * ✅ Arrêt forcé d'un jeu
 */
ipcMain.handle("forceStopGame", async (event, { gameId }) => {
  console.log(`[Main] ⚡ Arrêt forcé demandé pour ${gameId}`);
  return await gameLauncher.stopGame(gameId, true); // Force = true
});

//------------------------------\\

//* Désinstallation

import uninstallWorkerPath from "./uninstallWorker.js?modulePath";

// === DÉSINSTALLATION DE JEU - Utilise GameEngine via Worker ===

/**
 * 🗑️ Désinstalle un jeu complètement
 */
ipcMain.handle(
  "uninstallGame",
  async (event, { gameId, gamePath, gameName }) => {
    // Validation de sécurité : opération critique
    if (!isValidSender(event.senderFrame)) {
      console.error(
        `[Security] uninstallGame appelé par un sender non autorisé`
      );
      throw new Error("Unauthorized sender");
    }

    console.log(`[Main] 🗑️ Désinstallation demandée: ${gameName} (${gameId})`);

    // Vérifier si le jeu est en cours d'exécution
    if (gameLauncher.isGameRunning(gameId)) {
      console.log(`[Main] ⚠️ Jeu en cours - arrêt forcé avant désinstallation`);
      await gameLauncher.stopGame(gameId, true);

      // Attendre un peu pour s'assurer que le processus est fermé
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return new Promise((resolve, reject) => {
      // Créer le worker de désinstallation
      const worker = new Worker(uninstallWorkerPath, {
        workerData: {
          gameId,
          gamePath,
          storeData: store.store,
        },
      });

      // Écouter les messages de progression
      worker.on("message", (data) => {
        console.log(
          `[Main] 🗑️ Désinstallation ${gameName}: ${data.stage} (${data.progress}%)`
        );

        // Gérer la fin de la désinstallation
        if (data.stage === "uninstalled") {
          console.log(`[Main] ✅ Désinstallation terminée: ${gameName}`);

          // 🧹 Désinstaller tous les mods associés au jeu
          try {
            const installedMods = store.get("installedMods") || {};
            if (installedMods[gameId] && Object.keys(installedMods[gameId]).length > 0) {
              const modsToDelete = Object.keys(installedMods[gameId]);
              console.log(`[Main] 🗑️ Désinstallation de ${modsToDelete.length} mod(s) pour ${gameName}...`);

              for (const modId of modsToDelete) {
                try {
                  const modInfo = installedMods[gameId][modId];

                  // Supprimer le dossier/fichier du mod
                  if (modInfo && modInfo.path && fs.existsSync(modInfo.path)) {
                    const stats = fs.statSync(modInfo.path);
                    if (stats.isDirectory()) {
                      fs.rmSync(modInfo.path, { recursive: true, force: true });
                      console.log(`[Main] 🗑️ Mod directory deleted: ${modInfo.path}`);
                    } else {
                      fs.unlinkSync(modInfo.path);
                      console.log(`[Main] 🗑️ Mod file deleted: ${modInfo.path}`);
                    }
                  }
                } catch (modError) {
                  console.error(`[Main] ⚠️ Erreur suppression mod ${modId}:`, modError.message);
                }
              }

              // Supprimer tous les mods du jeu du store
              delete installedMods[gameId];
              store.set("installedMods", installedMods);
              console.log(`[Main] ✅ ${modsToDelete.length} mod(s) désinstallé(s)`);
            }
          } catch (modsCleanupError) {
            console.error(`[Main] ⚠️ Erreur nettoyage mods:`, modsCleanupError);
          }

          // 🧹 Nettoyage de installedGamesCache
          try {
            const installedGames = store.get("installedGamesCache", {});
            if (installedGames[gameId]) {
              delete installedGames[gameId];
              store.set("installedGamesCache", installedGames);
              console.log(
                `[Main] 🗑️ Jeu ${gameId} supprimé de installedGamesCache`
              );
            } else {
              console.warn(
                `[Main] ⚠️ Jeu ${gameId} non trouvé dans installedGamesCache`
              );
            }
          } catch (cleanupError) {
            console.error(
              `[Main] ⚠️ Erreur nettoyage installedGamesCache:`,
              cleanupError
            );
          }

          // Notifier le renderer après le nettoyage
          event.sender.send("uninstallProgress", {
            id: gameId,
            ...data,
          });

          resolve({ success: true });
          return;
        }

        // Gérer les échecs
        if (data.stage === "failed") {
          console.error(
            `[Main] ❌ Désinstallation échouée: ${gameName} - ${data.error}`
          );
          event.sender.send("uninstallProgress", {
            id: gameId,
            ...data,
          });
          reject(new Error(data.error));
          return;
        }

        // Envoyer la progression pour tous les autres stages
        event.sender.send("uninstallProgress", {
          id: gameId,
          ...data,
        });
      });

      // Gérer les erreurs du worker
      worker.on("error", (err) => {
        console.error(
          `[Main] 💥 Erreur worker désinstallation pour ${gameName}:`,
          err
        );

        // Notifier le renderer
        event.sender.send("uninstallProgress", {
          id: gameId,
          progress: 0,
          stage: "Failed",
          error: err.message,
        });

        reject(err);
      });

      // Gérer la fermeture inattendue du worker
      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(
            `[Main] ⚠️ Worker désinstallation fermé avec code ${code} pour ${gameName}`
          );
          reject(new Error(`Worker process exited with code ${code}`));
        }
      });
    });
  }
);

// === HANDLERS DE VÉRIFICATION ===

/**
 * 🔍 Vérifie si un jeu peut être désinstallé
 */
ipcMain.handle("canUninstallGame", async (event, { gameId, gamePath }) => {
  try {
    // Vérifier si le dossier existe de manière asynchrone
    try {
      await fs.promises.access(gamePath);
    } catch {
      return {
        canUninstall: false,
        reason: "Dossier du jeu introuvable",
      };
    }

    // Vérifier si le jeu est en cours
    const isRunning = gameLauncher.isGameRunning(gameId);

    return {
      canUninstall: true,
      isRunning,
      warning: isRunning ? "Le jeu sera fermé avant désinstallation" : null,
    };
  } catch (error) {
    console.error(`[Main] Erreur vérification désinstallation:`, error);
    return {
      canUninstall: false,
      reason: error.message,
    };
  }
});

/**
 * 📊 Obtient la taille d'un jeu installé
 */
ipcMain.handle("getGameSize", async (event, { gamePath }) => {
  try {
    // Vérifier l'existence de manière asynchrone
    try {
      await fs.promises.access(gamePath);
    } catch {
      return { success: false, error: "Dossier introuvable" };
    }

    const size = await calculateDirectorySize(gamePath);
    return {
      success: true,
      sizeBytes: size,
      sizeMB: Math.round(size / (1024 * 1024)),
      sizeGB: Math.round((size / (1024 * 1024 * 1024)) * 10) / 10,
    };
  } catch (error) {
    console.error(`[Main] Erreur calcul taille:`, error);
    return { success: false, error: error.message };
  }
});

// === STATISTIQUES LOCALES ===
/**
 * Sauvegarde les statistiques de jeu localement
 */
ipcMain.handle("save-local-stats", async (event, { gameId, sessionData }) => {
  try {
    const installedGames = store.get("installedGamesCache", {});

    if (!installedGames[gameId]) {
      console.warn(`[Stats] Game ${gameId} not found in installedGamesCache`);
      return { success: false, error: "Game not found" };
    }

    // Initialiser les stats si nécessaire
    if (!installedGames[gameId].stats) {
      installedGames[gameId].stats = {
        currentSession: {
          startTime: null,
          isPlaying: false,
        },
        totalPlayTime: 0,
        totalSessions: 0,
        lastPlayed: null,
        firstLaunched: null,
      };
    }

    // Mettre à jour les stats
    installedGames[gameId].stats.totalPlayTime += sessionData.duration;
    installedGames[gameId].stats.totalSessions += 1;
    installedGames[gameId].stats.lastPlayed = Date.now();

    // Si c'est la première session, définir firstLaunched
    if (!installedGames[gameId].stats.firstLaunched) {
      installedGames[gameId].stats.firstLaunched = Date.now();
    }

    store.set("installedGamesCache", installedGames);

    return { success: true, stats: installedGames[gameId].stats };
  } catch (error) {
    console.error("[Stats] Erreur sauvegarde locale:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Récupère les statistiques de jeu localement
 */
ipcMain.handle("get-local-stats", async (event, { gameId }) => {
  try {
    const installedGames = store.get("installedGamesCache", {});
    return installedGames[gameId]?.stats || null;
  } catch (error) {
    console.error("[Stats] Erreur lecture locale:", error);
    return null;
  }
});

/**
 * 💾 Obtient l'espace disque libre
 */
ipcMain.handle("getDiskSpace", async () => {
  try {
    const installPath = store.get("downloadPath");
    if (!installPath) {
      return { success: false, error: "Chemin d'installation non configuré" };
    }

    if (process.platform === "win32") {
      // Windows: utiliser wmic de manière asynchrone
      const driveLetter = installPath.split(":")[0] + ":";
      const { stdout } = await execAsync(
        `wmic logicaldisk where "DeviceID='${driveLetter}'" get FreeSpace,Size /value`
      );

      const freeMatch = stdout.match(/FreeSpace=(\d+)/);
      const sizeMatch = stdout.match(/Size=(\d+)/);

      if (freeMatch && sizeMatch) {
        const freeBytes = parseInt(freeMatch[1]);
        const totalBytes = parseInt(sizeMatch[1]);

        return {
          success: true,
          freeBytes,
          totalBytes,
          freeGB: Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10,
          totalGB: Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10,
          usedGB:
            Math.round(((totalBytes - freeBytes) / (1024 * 1024 * 1024)) * 10) /
            10,
          usedPercent: Math.round(
            ((totalBytes - freeBytes) / totalBytes) * 100
          ),
        };
      }
    } else {
      // Linux/Mac: utiliser df de manière asynchrone
      const { stdout } = await execAsync(`df -k "${installPath}"`);
      const lines = stdout.trim().split("\n");
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        // parts[1] = total, parts[3] = available (en KB)
        const totalBytes = parseInt(parts[1]) * 1024;
        const freeBytes = parseInt(parts[3]) * 1024;

        return {
          success: true,
          freeBytes,
          totalBytes,
          freeGB: Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10,
          totalGB: Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10,
          usedGB:
            Math.round(((totalBytes - freeBytes) / (1024 * 1024 * 1024)) * 10) /
            10,
          usedPercent: Math.round(
            ((totalBytes - freeBytes) / totalBytes) * 100
          ),
        };
      }
    }

    return {
      success: false,
      error: "Impossible d'obtenir l'espace disque",
    };
  } catch (error) {
    console.error("[Main] Erreur getDiskSpace:", error);
    return { success: false, error: error.message };
  }
});

// === DISCORD RICH PRESENCE ===

/**
 * Charge Discord RPC à la demande s'il n'est pas déjà chargé
 * @returns {Promise<DiscordRPCService>}
 */
async function ensureDiscordRPCLoaded() {
  if (discordRPC) {
    return discordRPC;
  }

  console.log("[Discord RPC] Chargement du module à la demande...");
  const rpc = await moduleLoader.loadDiscordRPC(true);

  if (!rpc) {
    throw new Error("Impossible de charger le module Discord RPC");
  }

  discordRPC = rpc;
  return discordRPC;
}

/**
 * Initialise Discord RPC
 */
ipcMain.handle("discord-rpc:initialize", async (event, { enabled }) => {
  try {
    // Charger le module à la demande
    const rpc = await ensureDiscordRPCLoaded();
    rpc.isEnabled = enabled;

    // Injecter dans gameLauncher
    gameLauncher.setDiscordRPC(rpc);

    const result = await rpc.initialize(enabled);

    // Sauvegarder le setting
    store.set("discordRPCEnabled", enabled);

    return result;
  } catch (error) {
    console.error("[Discord RPC] Erreur d'initialisation:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Active/désactive Discord RPC
 */
ipcMain.handle("discord-rpc:setEnabled", async (event, { enabled }) => {
  try {
    // Charger le module à la demande
    const rpc = await ensureDiscordRPCLoaded();

    const result = await rpc.setEnabled(enabled);

    // Sauvegarder le setting
    store.set("discordRPCEnabled", enabled);

    return result;
  } catch (error) {
    console.error("[Discord RPC] Erreur setEnabled:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Obtient le statut actuel de Discord RPC
 */
ipcMain.handle("discord-rpc:getStatus", async () => {
  try {
    // Si Discord RPC n'est pas chargé, retourner un statut désactivé
    if (!discordRPC) {
      return {
        isConnected: false,
        isEnabled: false,
        currentActivity: null,
        clientId: null,
        user: null,
      };
    }

    return discordRPC.getStatus();
  } catch (error) {
    console.error("[Discord RPC] Erreur getStatus:", error);
    return {
      isConnected: false,
      isEnabled: false,
      currentActivity: null,
      clientId: null,
      user: null,
    };
  }
});

/**
 * Déconnecte Discord RPC proprement
 */
ipcMain.handle("discord-rpc:disconnect", async () => {
  try {
    // Si Discord RPC n'est pas chargé, rien à faire
    if (!discordRPC) {
      return { success: true };
    }

    await discordRPC.disconnect();
    return { success: true };
  } catch (error) {
    console.error("[Discord RPC] Erreur disconnect:", error);
    return { success: false, error: error.message };
  }
});

// === LOGGER & ERROR REPORTING ===

/**
 * Log un message depuis le renderer
 */
ipcMain.handle("logger:log", async (event, { level, message, data }) => {
  try {
    switch (level) {
      case "debug":
        logger.debug(message, data);
        break;
      case "info":
        logger.info(message, data);
        break;
      case "warn":
        logger.warn(message, data);
        break;
      case "error":
        logger.error(message, data?.error, data?.context);
        break;
      default:
        logger.info(message, data);
    }
    return { success: true };
  } catch (error) {
    console.error("[Logger] Failed to log from renderer:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Récupère les logs récents
 */
ipcMain.handle("logger:getLogs", async (event, { lines = 100 }) => {
  try {
    const logs = logger.getRecentLogs(lines);
    return { success: true, logs };
  } catch (error) {
    console.error("[Logger] Failed to get logs:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Récupère les informations système
 */
ipcMain.handle("logger:getSystemInfo", async () => {
  try {
    const systemInfo = logger.getSystemInfo();
    return { success: true, systemInfo };
  } catch (error) {
    console.error("[Logger] Failed to get system info:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Exporte un rapport de bug complet
 */
ipcMain.handle(
  "logger:exportBugReport",
  async (event, { description, userEmail }) => {
    try {
      const reportPath = await logger.exportBugReport();

      if (reportPath) {
        // Ajouter les infos utilisateur au rapport
        const fs = require("fs");
        const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
        report.userDescription = description;
        report.userEmail = userEmail;
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

        logger.info("[Logger] Bug report exported with user info", {
          reportPath,
        });

        return {
          success: true,
          reportPath,
          message: "Bug report created successfully",
        };
      }

      return { success: false, error: "Failed to create report" };
    } catch (error) {
      logger.error("[Logger] Failed to export bug report", error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * Ouvre le dossier de logs
 */
ipcMain.handle("logger:openLogsFolder", async () => {
  try {
    const { shell } = require("electron");
    await shell.openPath(logger.logsDir);
    return { success: true };
  } catch (error) {
    logger.error("[Logger] Failed to open logs folder", error);
    return { success: false, error: error.message };
  }
});

// === AUTO UPDATER ===

/**
 * Vérifie les mises à jour disponibles
 */
ipcMain.handle("updater:checkForUpdates", async () => {
  try {
    if (!autoUpdateManager) {
      return { success: false, error: "AutoUpdateManager not initialized" };
    }
    const result = await autoUpdateManager.checkForUpdates();
    return { success: true, ...result };
  } catch (error) {
    logger.error("[AutoUpdater] Error checking for updates", error);
    return { success: false, error: error.message };
  }
});

/**
 * Télécharge et installe la mise à jour
 */
ipcMain.handle("updater:downloadAndInstall", async () => {
  try {
    if (!autoUpdateManager) {
      return { success: false, error: "AutoUpdateManager not initialized" };
    }
    const result = await autoUpdateManager.downloadUpdate();
    return result;
  } catch (error) {
    logger.error("[AutoUpdater] Error downloading update", error);
    return { success: false, error: error.message };
  }
});

/**
 * Quitte et installe la mise à jour
 */
ipcMain.handle("updater:quitAndInstall", async () => {
  try {
    if (!autoUpdateManager) {
      return { success: false, error: "AutoUpdateManager not initialized" };
    }
    const result = autoUpdateManager.quitAndInstall();
    return result;
  } catch (error) {
    logger.error("[AutoUpdater] Error quitting and installing", error);
    return { success: false, error: error.message };
  }
});

/**
 * Obtient le statut de l'auto-updater
 */
ipcMain.handle("updater:getStatus", async () => {
  try {
    if (!autoUpdateManager) {
      return {
        success: false,
        status: "idle",
        currentVersion: app.getVersion(),
      };
    }
    const status = autoUpdateManager.getStatus();
    return { success: true, ...status };
  } catch (error) {
    logger.error("[AutoUpdater] Error getting status", error);
    return { success: false, error: error.message };
  }
});

/**
 * Ignore une version spécifique
 */
ipcMain.handle("updater:skipVersion", async (event, { version }) => {
  try {
    if (!autoUpdateManager) {
      return { success: false, error: "AutoUpdateManager not initialized" };
    }
    const result = autoUpdateManager.skipVersion(version);
    return { success: true, ...result };
  } catch (error) {
    logger.error("[AutoUpdater] Error skipping version", error);
    return { success: false, error: error.message };
  }
});

// === FONCTION UTILITAIRE ===

/**
 * Calcule la taille d'un dossier récursivement
 */
async function calculateDirectorySize(dirPath) {
  let totalSize = 0;

  try {
    const items = await fs.promises.readdir(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.promises.stat(itemPath);

      if (stats.isDirectory()) {
        totalSize += await calculateDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn(`[Main] Erreur calcul taille ${dirPath}:`, error.message);
  }

  return totalSize;
}
