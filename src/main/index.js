/**
 * Drathos - Main Process Entry Point
 * Minimal entry point that initializes the app and delegates to modules
 */

// Disable security warnings in development (needed for Vite HMR)
if (process.env.NODE_ENV !== "production") {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

import { app, shell, BrowserWindow, Tray, Menu, session, globalShortcut } from "electron";
import { join } from "path";
import fs from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import iconPath from "../../resources/logo2.png?asset";

import store from "./store.js";
import logger from "./utils/logger.js";
import { memoryManager } from "./utils/memoryManager.js";
import { moduleLoader } from "./utils/moduleLoader.js";
import { AutoUpdateManager } from "./autoUpdater.js";
import { SplashWindow } from "./splashWindow.js";
import { isSafeForExternalOpen } from "./app/security.js";
import {
  registerAllHandlers,
  getGameLauncher,
  initDiscordRPC,
  cleanupDiscordRPC,
  setAutoUpdateManager,
  getAutoUpdateManager,
} from "./ipc/index.js";

// === ICON SETUP ===
const getIconPath = () => {
  if (fs.existsSync(iconPath)) return iconPath;
  if (process.platform === "linux") {
    const systemIcon = join(__dirname, "../../build/icon.png");
    if (fs.existsSync(systemIcon)) return systemIcon;
  }
  return undefined;
};

const icon = getIconPath();

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
    ...(process.platform === "linux" ? { icon } : {}),
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
          return `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ` +
            `img-src 'self' data: blob: ${igdb} ${backendHttp} ${backendHttps} http: https:; font-src 'self' data:; ` +
            `connect-src 'self' ${igdb} ${backendHttp} ${backendHttps} http: https:; object-src 'none'; ` +
            `base-uri 'self'; form-action 'self'; frame-ancestors 'none';`;
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
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const { protocol } = new URL(webContents.getURL());
    callback(protocol === "file:" && permission === "notifications");
  });

  app.on("web-contents-created", (_, contents) => {
    contents.on("will-navigate", (event, url) => {
      const { protocol, hostname } = new URL(url);
      if (protocol !== "file:" && !(is.dev && (hostname === "localhost" || hostname === "127.0.0.1"))) {
        event.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      if (isSafeForExternalOpen(url)) setImmediate(() => shell.openExternal(url));
      return { action: "deny" };
    });
  });
};

// === SHORTCUTS ===
const setupShortcuts = () => {
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

  tray.setContextMenu(Menu.buildFromTemplate([
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
  ]));

  tray.on("click", () => {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
};

// === APP INITIALIZATION ===
Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
  await logger.initialize();
  logger.info("[App] Starting Drathos...", { version: app.getVersion() });

  app.setName("Drathos");
  electronApp.setAppUserModelId("com.drathos.app");

  // Splash screen
  const splash = new SplashWindow(icon);
  const splashWindow = splash.create();

  // Setup
  setupCSP();
  setupSecurity();
  setupShortcuts();
  registerAllHandlers();

  app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));

  // Create main window
  const mainWindow = createWindow();
  memoryManager.initialize();

  // Auto-updater
  const autoUpdateManager = new AutoUpdateManager();
  autoUpdateManager.setMainWindow(mainWindow);
  setAutoUpdateManager(autoUpdateManager);

  // Wait for splash animation
  await new Promise((r) => setTimeout(r, 2000));
  splash.close();

  if (!mainWindow.isDestroyed()) mainWindow.show();
  logger.info("[App] Main window shown");

  // Check updates after window is shown
  setTimeout(async () => {
    try {
      const result = await autoUpdateManager.checkForUpdates();
      logger.info(result.available ? "[App] Update available" : "[App] No updates");
    } catch (error) {
      logger.error("[App] Update check error:", error);
    }
  }, 3000);

  autoUpdateManager.startPeriodicCheck(120);

  // Discord RPC
  if (store.get("discordRPCEnabled", false)) {
    initDiscordRPC(true).then((rpc) => {
      if (rpc) logger.info("[Discord RPC] Initialized");
    });
  }

  // Tray
  setupTray(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// === CLEANUP ===
app.on("window-all-closed", () => {
  getGameLauncher().cleanup();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", async () => {
  logger.info("[App] Shutting down...");

  getGameLauncher().cleanup();
  await cleanupDiscordRPC();
  getAutoUpdateManager()?.cleanup();
  await memoryManager.cleanup();
  moduleLoader.unloadAll();
  globalShortcut.unregisterAll();
});
