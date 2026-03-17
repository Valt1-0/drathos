/**
 * Drathos - Main Process Entry Point
 * Minimal entry point that initializes the app and delegates to modules
 */

import {
  app,
  shell,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  session,
  globalShortcut,
} from "electron";
import { join } from "path";
import fs from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import iconPathPng from "../../resources/icon.png?asset";
import iconPath2x from "../../resources/icon@2x.png?asset";
import iconPath3x from "../../resources/icon@3x.png?asset";
import iconPathLinux from "../../resources/icon_linux_512.png?asset";
import store from "./store.js";
import logger from "./utils/logger.js";
import crashReporter from "./utils/crashReporter.js";
import { memoryManager } from "./utils/memoryManager.js";
import { AutoUpdateManager } from "./autoUpdater.js";
import { SplashWindow } from "./splashWindow.js";
import { isSafeForExternalOpen } from "./app/security.js";
import {
  registerAllHandlers,
  getGameLauncher,
  terminateAllWorkers,
  setAutoUpdateManager,
  getAutoUpdateManager,
} from "./ipc/index.js";

// Disable security warnings in development (needed for Vite HMR)
if (process.env.NODE_ENV !== "production") {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

// === SINGLE INSTANCE LOCK ===
// Enforced in production only — dev allows multiple instances (Vite HMR, hot reload).
// Quit immediately if another instance is already running; focus existing window instead.
if (!is.dev) {
  const gotInstanceLock = app.requestSingleInstanceLock();
  if (!gotInstanceLock) app.exit(0);
}

let mainWindow = null;

const focusMainWindow = () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
};

app.on("second-instance", () => focusMainWindow());

// === ICON SETUP ===
const buildIcon = () => {
  if (process.platform === "linux" && fs.existsSync(iconPathLinux)) return iconPathLinux;

  // Windows + macOS: multi-resolution nativeImage with icon.png
  const img = nativeImage.createEmpty();
  if (fs.existsSync(iconPathPng)) img.addRepresentation({ scaleFactor: 1.0, dataURL: nativeImage.createFromPath(iconPathPng).toDataURL() });
  if (fs.existsSync(iconPath2x))  img.addRepresentation({ scaleFactor: 2.0, dataURL: nativeImage.createFromPath(iconPath2x).toDataURL() });
  if (fs.existsSync(iconPath3x))  img.addRepresentation({ scaleFactor: 3.0, dataURL: nativeImage.createFromPath(iconPath3x).toDataURL() });
  return img.isEmpty() ? undefined : img;
};

const icon = buildIcon();

// === WINDOW CREATION ===
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    title: "Drathos",
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 200,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      partition: "persist:drathos",
      zoomFactor: 1.0,
    },
  });

  if (is.dev) mainWindow.webContents.openDevTools();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeForExternalOpen(url)) setImmediate(() => shell.openExternal(url));
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
};

// === CSP CONFIGURATION ===
const setupCSP = () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const serverAddress = store.get("serverAddress", "");

    const csp = is.dev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http: blob:; font-src 'self' data:; " +
        "connect-src 'self' ws: http: https:; object-src 'none'; base-uri 'self'; form-action 'self';"
      : (() => {
          const igdb = "https://images.igdb.com";
          const clean = serverAddress.replace(/^https?:\/\//, "");
          const backendHttp = clean ? `http://${clean}` : "";
          const backendHttps = clean ? `https://${clean}` : "";
          return (
            `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ` +
            `img-src 'self' data: blob: ${igdb} ${backendHttp} ${backendHttps} http: https:; font-src 'self' data:; ` +
            `connect-src 'self' ${igdb} ${backendHttp} ${backendHttps} http: https:; object-src 'none'; ` +
            `base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
          );
        })();

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
        "X-Content-Type-Options": ["nosniff"],
        "X-Frame-Options": ["DENY"],
        "X-XSS-Protection": ["1; mode=block"],
        "Referrer-Policy": ["strict-origin-when-cross-origin"],
      },
    });
  });
};

// === SECURITY SETUP ===
const setupSecurity = () => {
  // Allow self-signed certificates for the configured self-hosted backend.
  // Only bypasses cert validation for requests matching the server address —
  // external URLs (IGDB, etc.) are still validated normally.
  session.defaultSession.on("certificate-error", (event, _webContents, url, _error, _cert, callback) => {
    const serverAddress = store.get("serverAddress", "");
    try {
      const serverHostname = new URL(serverAddress.startsWith("http") ? serverAddress : `https://${serverAddress}`).hostname;
      const requestHostname = new URL(url).hostname;
      if (serverAddress && serverHostname && serverHostname === requestHostname) {
        event.preventDefault();
        callback(true);
        return;
      }
    } catch {}
    callback(false);
  });

  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const { protocol } = new URL(webContents.getURL());
      callback(protocol === "file:" && permission === "notifications");
    },
  );

  app.on("web-contents-created", (_, contents) => {
    contents.on("will-navigate", (event, url) => {
      const { protocol, hostname } = new URL(url);
      if (
        protocol !== "file:" &&
        !(is.dev && (hostname === "localhost" || hostname === "127.0.0.1"))
      ) {
        event.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      if (isSafeForExternalOpen(url)) setImmediate(() => shell.openExternal(url));
      return { action: "deny" };
    });
  });
};

// === SHORTCUTS (dev only) ===
const setupShortcuts = () => {
  if (!is.dev) return;

  globalShortcut.register("CommandOrControl+Shift+R", () => {
    BrowserWindow.getFocusedWindow()?.webContents.reloadIgnoringCache();
  });

  globalShortcut.register("F5", () => {
    BrowserWindow.getFocusedWindow()?.webContents.reload();
  });
};

// === TRAY SETUP ===
const setupTray = (mainWindow) => {
  const tray = new Tray(icon);
  tray.setToolTip("Drathos");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Ouvrir Drathos",
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      { label: "Quitter", click: () => app.quit() },
    ]),
  );

  tray.on("click", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
};

// === CLEANUP ===
// Guard against double-cleanup (close event + before-quit can both fire).
let isExiting = false;

const doCleanup = () => {
  if (isExiting) return;
  isExiting = true;
  terminateAllWorkers();
  getGameLauncher().cleanup();
  getAutoUpdateManager()?.cleanup();
  crashReporter.cleanup();
  memoryManager.cleanup();
  globalShortcut.unregisterAll();
};

// Tray "Quit" → app.quit() → before-quit fires before window close events
app.on("before-quit", doCleanup);

// === CRASH REPORTING ===
Menu.setApplicationMenu(null);
crashReporter.initialize();

process.on("uncaughtException", (error) => {
  logger.error("[App] Uncaught exception", error);
  crashReporter.reportUncaughtException(error);
});

process.on("unhandledRejection", (reason) => {
  logger.error(
    "[App] Unhandled rejection",
    reason instanceof Error ? reason : new Error(String(reason)),
  );
  crashReporter.reportUnhandledRejection(reason);
});

// === APP INITIALIZATION ===
app.whenReady().then(async () => {
  await logger.initialize();
  logger.info("[App] Starting Drathos...", { version: app.getVersion() });

  app.setName("Drathos");
  electronApp.setAppUserModelId("com.drathos.app");
  setupCSP();
  setupSecurity();
  setupShortcuts();
  registerAllHandlers();

  app.on("browser-window-created", (_, window) =>
    optimizer.watchWindowShortcuts(window),
  );

  const splash = new SplashWindow(icon);
  splash.create();

  mainWindow = createWindow();
  memoryManager.initialize();

  const autoUpdateManager = new AutoUpdateManager();
  autoUpdateManager.setMainWindow(mainWindow);
  setAutoUpdateManager(autoUpdateManager);

  await Promise.all([
    new Promise((r) => mainWindow.webContents.once("did-finish-load", r)),
    new Promise((r) => setTimeout(r, 1000)),
  ]);
  splash.close();

  if (!mainWindow.isDestroyed()) mainWindow.show();
  logger.info("[App] Main window shown");

  setTimeout(async () => {
    try {
      const result = await autoUpdateManager.checkForUpdates();
      logger.info(result.available ? "[App] Update available" : "[App] No updates");
    } catch (error) {
      logger.error("[App] Update check error:", error);
    }
  }, 3000);

  autoUpdateManager.startPeriodicCheck(120);
  setupTray(mainWindow);

  // User clicks X → cleanup then let Electron quit normally
  // Guard prevents re-entry if app.quit() triggers close again
  mainWindow.on("close", () => {
    if (isExiting) return;
    doCleanup();
    app.quit();
  });
});
