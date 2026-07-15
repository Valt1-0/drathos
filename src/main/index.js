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
  dialog,
  Notification,
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
import { memoryManager } from "./utils/memoryManager.js";
import { AutoUpdateManager } from "./autoUpdater.js";
import { SplashWindow } from "./splashWindow.js";
import { isSafeForExternalOpen } from "./app/security.js";
import { getPinnedCert, setPinnedCert, evaluatePin, fingerprintOf } from "./app/certPinning.js";
import {
  registerAllHandlers,
  getGameLauncher,
  terminateAllWorkers,
  getActiveDownloadCount,
  setAutoUpdateManager,
  getAutoUpdateManager,
} from "./ipc/index.js";

// The main process has no i18n runtime — the renderer mirrors the i18next
// language into the store so native dialogs/notifications can match it.
const MAIN_STRINGS = {
  en: {
    quitTitle: "Download in progress",
    quitMessage: "A download is in progress. Quit anyway?",
    quit: "Quit",
    cancel: "Cancel",
    trayNoticeTitle: "Drathos is still running",
    trayNoticeBody: "The app keeps running in the system tray. Use Quit in the tray menu to exit.",
    trayOpen: "Open Drathos",
    trayQuit: "Quit",
  },
  fr: {
    quitTitle: "Téléchargement en cours",
    quitMessage: "Un téléchargement est en cours. Quitter quand même ?",
    quit: "Quitter",
    cancel: "Annuler",
    trayNoticeTitle: "Drathos est toujours ouvert",
    trayNoticeBody: "L'application continue de tourner dans la barre système. Quittez via le menu de l'icône.",
    trayOpen: "Ouvrir Drathos",
    trayQuit: "Quitter",
  },
  de: {
    quitTitle: "Download läuft",
    quitMessage: "Ein Download läuft noch. Trotzdem beenden?",
    quit: "Beenden",
    cancel: "Abbrechen",
    trayNoticeTitle: "Drathos läuft weiter",
    trayNoticeBody: "Die App läuft im Infobereich weiter. Beenden über das Tray-Menü.",
    trayOpen: "Drathos öffnen",
    trayQuit: "Beenden",
  },
  es: {
    quitTitle: "Descarga en curso",
    quitMessage: "Hay una descarga en curso. ¿Salir de todos modos?",
    quit: "Salir",
    cancel: "Cancelar",
    trayNoticeTitle: "Drathos sigue abierto",
    trayNoticeBody: "La aplicación sigue ejecutándose en la bandeja del sistema. Salga desde el menú del icono.",
    trayOpen: "Abrir Drathos",
    trayQuit: "Salir",
  },
};

const mainStrings = () => {
  const lang = String(store.get("language", "en")).split("-")[0];
  return MAIN_STRINGS[lang] || MAIN_STRINGS.en;
};

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

// === TRAY ICON ===
// The main `icon` is a multi-res image sized for the window (large logical pixels).
// Windows tray needs 16×16 (1× DPI) / 32×32 (2× HiDPI) — provide them explicitly
// so the OS doesn't have to crush a 512px image down to 16px, which causes blur.
const buildTrayIcon = () => {
  if (process.platform === "linux") return icon;
  const p = resolveIconPath(iconPathPng, "icon.png");
  if (!p) return icon;
  try {
    const source = nativeImage.createFromPath(p);
    const trayImg = nativeImage.createEmpty();
    const img16 = source.resize({ width: 16, height: 16, quality: "best" });
    const img32 = source.resize({ width: 32, height: 32, quality: "best" });
    trayImg.addRepresentation({ scaleFactor: 1.0, dataURL: img16.toDataURL() });
    trayImg.addRepresentation({ scaleFactor: 2.0, dataURL: img32.toDataURL() });
    return trayImg.isEmpty() ? icon : trayImg;
  } catch {
    return icon;
  }
};

const trayIcon = buildTrayIcon();

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
      webSecurity: true,
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
          // Strip scheme and reject addresses containing characters that could
          // break the CSP header (quotes, spaces, semicolons, etc.)
          const stripped = serverAddress.replace(/^https?:\/\//, "").split(/[?#\s]/)[0];
          const clean = /^[\w.\-:[\]]+$/.test(stripped) ? stripped : "";
          const backendHttp  = clean ? `http://${clean}`  : "";
          const backendHttps = clean ? `https://${clean}` : "";
          const backendWs    = clean ? `ws://${clean}`    : "";
          const backendWss   = clean ? `wss://${clean}`   : "";
          // If no server is configured yet allow all origins as fallback so the
          // setup screen can reach any host the user types in.
          const connectSrc = clean
            ? `'self' ${backendHttp} ${backendHttps} ${backendWs} ${backendWss}`
            : `'self' http: https: ws: wss:`;
          return (
            `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ` +
            `img-src 'self' data: blob: ${igdb} ${backendHttp} ${backendHttps}; font-src 'self' data:; ` +
            `connect-src ${connectSrc}; object-src 'none'; ` +
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

  // Self-signed certs for the configured backend are trusted on first use, then
  // pinned: a later cert with a different fingerprint is blocked (MITM defense).
  // External URLs (IGDB, etc.) are always validated normally.
  appSession.on("certificate-error", (event, _webContents, url, _error, cert, callback) => {
    const serverAddress = store.get("serverAddress", "");
    try {
      const serverHostname = new URL(serverAddress.startsWith("http") ? serverAddress : `https://${serverAddress}`).hostname;
      const requestHostname = new URL(url).hostname;
      if (serverAddress && serverHostname && serverHostname === requestHostname) {
        const presented = fingerprintOf(cert);
        const stored = getPinnedCert(requestHostname);
        const decision = evaluatePin(stored, presented);

        if (decision === "first-use") {
          setPinnedCert(requestHostname, presented);
          logger.warn(`[Security] Pinned certificate for ${requestHostname} on first use`);
        }

        if (decision === "first-use" || decision === "match") {
          event.preventDefault();
          callback(true);
          return;
        }

        // mismatch — block and tell the renderer so it can warn the user and
        // offer to re-trust (legitimate cert rotation) or bail (real MITM).
        logger.error(`[Security] Certificate changed for ${requestHostname} — connection blocked`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("security:certificate-changed", { hostname: requestHostname });
        }
        callback(false);
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
// Blocks quit while a download/installation is running unless the user confirms.
const confirmQuit = () => {
  if (getActiveDownloadCount() === 0) return true;
  // A dialog parented to a hidden window can open invisible (tray quit) —
  // surface the window first so the confirmation is actually seen
  focusMainWindow();
  const s = mainStrings();
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: "warning",
    title: s.quitTitle,
    message: s.quitMessage,
    buttons: [s.quit, s.cancel],
    defaultId: 1,
    cancelId: 1,
  });
  return choice === 0;
};

const setupTray = (mainWindow) => {
  if (!trayIcon) {
    logger.warn("[App] Icon not found, tray disabled");
    return null;
  }
  const tray = new Tray(trayIcon);
  tray.setToolTip("Drathos");

  const s = mainStrings();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: s.trayOpen,
        click: () => {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      {
        label: s.trayQuit,
        click: () => {
          if (!confirmQuit()) return;
          app.quit();
        },
      },
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
  memoryManager.cleanup();
  globalShortcut.unregisterAll();
};

// Tray "Quit" → doCleanup + exit direct
app.on("before-quit", (event) => {
  event.preventDefault();
  doCleanup();
  app.exit(0);
});

// === GLOBAL ERROR LOGGING ===
// Crashes are written to the log file; users report them via GitHub issues
// (the bug-report modal exports these logs to attach).
Menu.setApplicationMenu(null);

process.on("uncaughtException", (error) => {
  logger.error("[App] Uncaught exception", error);
});

process.on("unhandledRejection", (reason) => {
  logger.error(
    "[App] Unhandled rejection",
    reason instanceof Error ? reason : new Error(String(reason)),
  );
});

// === APP INITIALIZATION ===
app.whenReady().then(async () => {
  await logger.initialize();
  logger.info("[App] Starting Drathos...", { version: app.getVersion() });

  app.setName("Drathos");
  // Must match electron-builder's appId — the installer registers the shortcut
  // with that AUMID, and a mismatch makes Windows show the lowercase package
  // name in the taskbar instead of "Drathos".
  electronApp.setAppUserModelId("com.valt.drathos");
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
  const tray = setupTray(mainWindow);

  // User clicks X → hide to tray (default, launcher behavior) or quit.
  // Guard prevents re-entry if app.quit() triggers close again.
  mainWindow.on("close", (event) => {
    if (isExiting) return;

    if (tray && store.get("closeToTray", true)) {
      event.preventDefault();
      mainWindow.hide();
      // One-time heads-up that the app is now in the tray
      if (!store.get("trayNoticeShown") && Notification.isSupported()) {
        const s = mainStrings();
        new Notification({ title: s.trayNoticeTitle, body: s.trayNoticeBody }).show();
        store.set("trayNoticeShown", true);
      }
      return;
    }

    if (!confirmQuit()) {
      event.preventDefault();
      return;
    }
    doCleanup();
    app.exit(0);
  });
});
