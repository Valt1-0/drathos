// Fichier: drathos/src/main/index.js

import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  dialog,
  session,
} from "electron";
import path, { join } from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/logo2.png?asset";

import { GameLauncher } from "./gameLauncher.js";
import { discordRPC } from "./utils/discordRPC.js";
import store from "./store.js";

const execAsync = promisify(exec);

const gameLauncher = new GameLauncher();

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
    case 'win32':
      return lower.endsWith('.exe') || lower.endsWith('.bat') || lower.endsWith('.cmd');

    case 'linux':
      return lower.endsWith('.sh') || lower.endsWith('.run') ||
             lower.endsWith('.bin') || lower.endsWith('.appimage');

    case 'darwin':
      return fileName.endsWith('.app') || lower.endsWith('.command') || lower.endsWith('.sh');

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
    const safeProtocols = ['http:', 'https:', 'mailto:'];

    if (!safeProtocols.includes(parsedUrl.protocol)) {
      console.warn(`[Security] Protocole non autorisé: ${parsedUrl.protocol}`);
      return false;
    }

    // Bloquer les URLs file:// et autres protocoles dangereux
    if (parsedUrl.protocol === 'file:') {
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
    if (frameUrl.protocol === 'file:') {
      return true;
    }

    // En développement, autoriser localhost
    if (is.dev && (frameUrl.hostname === 'localhost' || frameUrl.hostname === '127.0.0.1')) {
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
    minWidth: 1280,
    minHeight: 800,
    show: false,
    frame: false, // Désactive la barre de titre native
    autoHideMenuBar: true,
    icon: icon,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true, // ✅ Sécurisé
      contextIsolation: true, // ✅ Obligatoire pour la sécurité
      nodeIntegration: false, // ✅ Désactiver Node dans le renderer
      nodeIntegrationInWorker: false, // ✅ Pas nécessaire pour vos Worker Threads
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  // Ouvrir les DevTools en production pour débugger
  if (!is.dev) {
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
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
}

// Désactiver le menu par défaut pour améliorer les performances de démarrage
Menu.setApplicationMenu(null);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron");

  // === SÉCURITÉ: Content Security Policy ===
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Récupérer l'adresse du serveur backend configurée
    const serverAddress = store.get("serverAddress", "");

    // IGDB pour les images et métadonnées de jeux
    const igdbDomains = "https://*.igdb.com https://images.igdb.com https://api.igdb.com";

    // CSP adaptée selon l'environnement
    const csp = is.dev
      ? // Développement : autoriser Vite HMR + backend local + réseau local
        "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        `img-src 'self' data: https: http: blob: ${igdbDomains}; ` +
        "font-src 'self' data:; " +
        "connect-src 'self' ws: http: https:;" // Tout autoriser en dev
      : // Production : autoriser réseau local + backend configuré + IGDB
        (() => {
          // Autoriser le backend configuré
          const backendUrl = serverAddress ? ` ${serverAddress}` : "";

          // Autoriser toutes les IP locales/privées (RFC 1918)
          // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, localhost
          const localNetworks = " http://10.*.*.* http://172.16.*.* http://172.17.*.* http://172.18.*.* " +
                               "http://172.19.*.* http://172.20.*.* http://172.21.*.* http://172.22.*.* " +
                               "http://172.23.*.* http://172.24.*.* http://172.25.*.* http://172.26.*.* " +
                               "http://172.27.*.* http://172.28.*.* http://172.29.*.* http://172.30.*.* " +
                               "http://172.31.*.* http://192.168.*.* http://localhost:* http://127.0.0.1:* " +
                               "https://10.*.*.* https://172.16.*.* https://172.17.*.* https://172.18.*.* " +
                               "https://172.19.*.* https://172.20.*.* https://172.21.*.* https://172.22.*.* " +
                               "https://172.23.*.* https://172.24.*.* https://172.25.*.* https://172.26.*.* " +
                               "https://172.27.*.* https://172.28.*.* https://172.29.*.* https://172.30.*.* " +
                               "https://172.31.*.* https://192.168.*.* https://localhost:* https://127.0.0.1:*";

          return "default-src 'self'; " +
                 "script-src 'self' 'unsafe-inline'; " + // Ajout de 'unsafe-inline' pour les scripts Vite
                 "style-src 'self' 'unsafe-inline'; " +
                 `img-src 'self' data: blob: ${igdbDomains}${localNetworks}${backendUrl}; ` +
                 "font-src 'self' data:; " +
                 `connect-src 'self' ${igdbDomains}${localNetworks}${backendUrl};`;
        })();

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // === SÉCURITÉ: Permission Request Handler ===
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const parsedUrl = new URL(webContents.getURL());

    // Refuser toutes les permissions par défaut sauf pour notre app locale
    if (parsedUrl.protocol === 'file:') {
      // Pour les fichiers locaux, n'autoriser que certaines permissions
      const allowedPermissions = ['notifications'];
      callback(allowedPermissions.includes(permission));
    } else {
      // Refuser toutes les permissions pour le contenu distant
      console.warn(`[Security] Permission ${permission} refusée pour ${parsedUrl.href}`);
      callback(false);
    }
  });

  // === SÉCURITÉ: Limitation de la navigation ===
  app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);

      // Autoriser uniquement file:// et localhost en dev
      if (parsedUrl.protocol !== 'file:') {
        if (is.dev && (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
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
      return { action: 'deny' };
    });
  });

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
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

  const mainWindow = createWindow();

  // Discord RPC sera initialisé au premier lancement de jeu pour optimiser le démarrage

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
  gameLauncher.cleanup();

  // Déconnecter Discord RPC proprement
  if (discordRPC.isConnected) {
    console.log("[Main] Déconnexion de Discord RPC...");
    await discordRPC.disconnect();
  }
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
    console.error(`[Security] shell:openExternal appelé par un sender non autorisé`);
    throw new Error('Unauthorized sender');
  }

  // Valider l'URL
  if (!isSafeForExternalOpen(url)) {
    console.error(`[Security] URL non sûre bloquée: ${url}`);
    throw new Error('Unsafe URL blocked');
  }

  console.log(`[Security] Ouverture URL validée: ${url}`);
  await shell.openExternal(url);
});

//* Open file dialog */
ipcMain.handle("dialog:selectAndCreate", async () => {
  const result = await dialog.showOpenDialog({
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
  const result = await dialog.showOpenDialog({
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

      if (data.stage === "Completed") {
        console.log(`[Main] Installation terminée: ${serverGame.name}`);
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
  windows: ['.exe', '.bat', '.cmd'],
  linux: ['.sh', '.run', '.bin', '.AppImage'],
  mac: ['.app', '.command']
};

const detectExecutablePlatform = (filePath) => {
  const lowerPath = filePath.toLowerCase();
  for (const [platform, extensions] of Object.entries(EXECUTABLE_PATTERNS)) {
    if (extensions.some(ext => lowerPath.endsWith(ext))) return platform;
  }
  return null;
};

const scanArchiveForExecutables = async (filePath) => {
  const allExtensions = Object.values(EXECUTABLE_PATTERNS).flat();
  const executables = [];

  const stream = Seven.list(filePath, { $bin: sevenBin.path7za });

  return new Promise((resolve) => {
    stream.on('data', (data) => {
      if (!data.file || data.file.endsWith('/') || data.file.endsWith('\\')) return;

      const fileName = data.file.split(/[/\\]/).pop();
      const isExecutable = allExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

      if (isExecutable) {
        const platform = detectExecutablePlatform(data.file);
        if (platform) {
          executables.push({
            path: data.file,
            platform,
            name: fileName,
            size: data.size || 0
          });
        }
      }
    });

    stream.on('end', () => {
      // Détecter la plateforme actuelle
      const currentPlatformMap = {
        'win32': 'windows',
        'linux': 'linux',
        'darwin': 'mac'
      };
      const currentPlatform = currentPlatformMap[process.platform];

      // Trier en priorisant la plateforme actuelle
      executables.sort((a, b) => {
        // Prioriser les exécutables de la plateforme actuelle
        if (a.platform === currentPlatform && b.platform !== currentPlatform) return -1;
        if (a.platform !== currentPlatform && b.platform === currentPlatform) return 1;
        // Si les deux sont de la même plateforme, préférer les chemins plus courts (racine)
        return a.path.length - b.path.length;
      });

      console.log(`[Main] ✅ ${executables.length} exécutable(s) trouvé(s)`);
      resolve({ success: true, executables, count: executables.length });
    });

    stream.on('error', (err) => {
      console.error(`[Main] ❌ Erreur lecture archive:`, err);
      resolve({ success: false, error: err.message, executables: [] });
    });
  });
};

ipcMain.handle("readArchiveFile", async (event, filePath) => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    return { success: true, buffer };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: false, error: "Fichier introuvable" };
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle("selectAndScanArchive", async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Archives", extensions: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz"] },
        { name: "Tous les fichiers", extensions: ["*"] }
      ],
      title: "Sélectionner une archive"
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }

    const filePath = result.filePaths[0];
    const scanResult = await scanArchiveForExecutables(filePath);

    return {
      ...scanResult,
      filePath,
      fileName: path.basename(filePath)
    };
  } catch (error) {
    return { success: false, error: error.message, executables: [] };
  }
});

ipcMain.handle("listArchiveFiles", async (event, filePath) => {
  return await scanArchiveForExecutables(filePath);
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
      console.error(`[Security] uninstallGame appelé par un sender non autorisé`);
      throw new Error('Unauthorized sender');
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

          // 🧹 Nettoyage de installedGamesCache
          try {
            const installedGames = store.get("installedGamesCache", {});
            if (installedGames[gameId]) {
              delete installedGames[gameId];
              store.set("installedGamesCache", installedGames);
              console.log(`[Main] 🗑️ Jeu ${gameId} supprimé de installedGamesCache`);
            } else {
              console.warn(`[Main] ⚠️ Jeu ${gameId} non trouvé dans installedGamesCache`);
            }
          } catch (cleanupError) {
            console.error(`[Main] ⚠️ Erreur nettoyage installedGamesCache:`, cleanupError);
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
 * Initialise Discord RPC
 */
ipcMain.handle("discord-rpc:initialize", async (event, { enabled }) => {
  try {
    const result = await discordRPC.initialize(enabled);
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
    const result = await discordRPC.setEnabled(enabled);
    return result;
  } catch (error) {
    console.error("[Discord RPC] Erreur setEnabled:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Obtient le statut actuel de Discord RPC
 */
ipcMain.handle("discord-rpc:getStatus", () => {
  try {
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
    await discordRPC.disconnect();
    return { success: true };
  } catch (error) {
    console.error("[Discord RPC] Erreur disconnect:", error);
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
