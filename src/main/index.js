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
import { join, resolve } from "path";
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
// In packaged apps, ?asset paths may point inside the asar where fs.existsSync fails.
// Fall back to process.resourcesPath which is always the real unpacked resources folder.
const resolveIconPath = (assetPath, filename) => {
  if (fs.existsSync(assetPath)) return assetPath;
  const fallback = resolve(process.resourcesPath ?? "", filename);
  return fs.existsSync(fallback) ? fallback : null;
};

const buildIcon = () => {
  if (process.platform === "linux") {
    const p = resolveIconPath(iconPathLinux, "icon_linux_512.png");
    return p ?? undefined;
  }

  // Windows + macOS: multi-resolution nativeImage
  const img = nativeImage.createEmpty();
  const add = (scale, assetPath, filename) => {
    const p = resolveIconPath(assetPath, filename);
    if (p) {
      try {
        img.addRepresentation({ scaleFactor: scale, dataURL: nativeImage.createFromPath(p).toDataURL() });
      } catch {}
    }
  };
  add(1.0, iconPathPng, "icon.png");
  add(2.0, iconPath2x, "icon@2x.png");
  add(3.0, iconPath3x, "icon@3x.png");
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

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return mainWindow;
};

// === CSP CONFIGURATION ===
const setupCSP = () => {
  const appSession = session.fromPartition("persist:drathos");
  appSession.webRequest.onHeadersReceived((details, callback) => {
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
            `img-src 'self' data: blob: ${igdb} ${backendHttp} ${backendHttps}; font-src 'self' data:; ` +
            `connect-src 'self' http: https: ws: wss:; object-src 'none'; ` +
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
  const appSession = session.fromPartition("persist:drathos");

  // Allow self-signed certificates for the configured self-hosted backend.
  // Only bypasses cert validation for requests matching the server address —
  // external URLs (IGDB, etc.) are still validated normally.
  appSession.on("certificate-error", (event, _webContents, url, _error, _cert, callback) => {
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

  appSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      const url = webContents.getURL();
      try {
        const { protocol, hostname } = new URL(url);
        const isLocal = protocol === "file:" || (is.dev && (hostname === "localhost" || hostname === "127.0.0.1"));
        callback(isLocal && permission === "notifications");
      } catch {
        callback(false);
      }
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
  if (!icon) {
    logger.warn("[App] Icon not found, tray disabled");
    return null;
  }
  const tray = new Tray(icon);
  tray.setToolTip("Drathos");

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Drathos",
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
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

// Tray "Quit" → doCleanup + exit direct
app.on("before-quit", (event) => {
  event.preventDefault();
  doCleanup();
  app.exit(0);
});

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

  // Helper to (re)load the renderer — used for retries on startup failure
  const loadRenderer = () =>
    is.dev && process.env["ELECTRON_RENDERER_URL"]
      ? mainWindow.webContents.loadURL(process.env["ELECTRON_RENDERER_URL"])
      : mainWindow.webContents.loadFile(join(__dirname, "../renderer/index.html"));

  // Wait for a successful did-finish-load, retrying once on did-fail-load.
  // Handles the cold-start race (GPU not yet ready at Windows login) where the
  // renderer fails to load on first attempt but succeeds immediately after retry.
  const waitForRenderer = () =>
    new Promise((resolve) => {
      let attempts = 0;
      const fallback = setTimeout(resolve, 10_000); // Safety: never hang more than 10s
      const onLoad = () => {
        clearTimeout(fallback);
        mainWindow.webContents.off("did-fail-load", onFail);
        resolve();
      };
      const onFail = (_, code) => {
        if (code === -3) return; // ERR_ABORTED — normal during SPA navigation, ignore
        mainWindow.webContents.off("did-finish-load", onLoad);
        logger.warn("[App] Renderer failed to load, retrying...", { code, attempt: ++attempts });
        if (attempts <= 1) {
          setTimeout(() => {
            if (mainWindow.isDestroyed()) { clearTimeout(fallback); resolve(); return; }
            mainWindow.webContents.once("did-finish-load", onLoad);
            mainWindow.webContents.once("did-fail-load", onFail);
            loadRenderer();
          }, 800);
        } else {
          clearTimeout(fallback);
          resolve(); // Give up after 1 retry
        }
      };
      mainWindow.webContents.once("did-finish-load", onLoad);
      mainWindow.webContents.once("did-fail-load", onFail);
    });

  mainWindow.webContents.on("render-process-gone", (_, details) => {
    logger.error("[App] Renderer crashed", details);
    // Reload after renderer crash — common on first cold start (GPU initialization)
    setTimeout(() => {
      if (!mainWindow.isDestroyed()) loadRenderer();
    }, 500);
  });
  mainWindow.webContents.on("did-fail-load", (_, code, desc, url) => {
    if (code !== -3) logger.error("[App] Renderer failed to load", { code, desc, url });
  });
  mainWindow.webContents.on("console-message", (event) => {
    if (event.level >= 2) logger.error("[Renderer]", { message: event.message, line: event.line, sourceId: event.sourceId });
  });

  memoryManager.initialize();

  const autoUpdateManager = new AutoUpdateManager();
  autoUpdateManager.setMainWindow(mainWindow);
  setAutoUpdateManager(autoUpdateManager);

  await Promise.all([waitForRenderer(), new Promise((r) => setTimeout(r, 1000))]);
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
    app.exit(0);
  });
});
