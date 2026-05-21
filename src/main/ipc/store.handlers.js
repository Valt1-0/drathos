/**
 * Store IPC handlers
 */
import { ipcMain, shell, app } from "electron";
import store from "../store.js";
import { isSafeForExternalOpen } from "../app/security.js";
import { secureHandle } from "./secureHandle.js";

// Keys the main process writes exclusively — renderer must not overwrite them via store-set
const RENDERER_BLOCKED_KEYS = new Set(["installedGamesCache", "installedMods"]);

export const registerStoreHandlers = () => {
  // secureHandle validates the sender frame — prevents reads from injected frames
  secureHandle("store-get", (_event, key, defaultValue) =>
    defaultValue !== undefined ? store.get(key, defaultValue) : store.get(key)
  );
  secureHandle("store-set", (_event, key, value) => {
    if (RENDERER_BLOCKED_KEYS.has(key)) throw new Error(`Protected store key: ${key}`);
    store.set(key, value);
  });
  secureHandle("store-delete", (_event, key) => {
    store.delete(key);
  });
  secureHandle("store-clear", () => {
    const preserved = {};
    for (const key of RENDERER_BLOCKED_KEYS) {
      const val = store.get(key);
      if (val !== undefined) preserved[key] = val;
    }
    store.clear();
    for (const [key, val] of Object.entries(preserved)) {
      store.set(key, val);
    }
  });

  ipcMain.handle("app:getLoginItem", () => app.getLoginItemSettings().openAtLogin);
  secureHandle("app:setLoginItem", (_event, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin, name: "Drathos" });
  });

  secureHandle("shell:openExternal", async (_event, url) => {
    if (!isSafeForExternalOpen(url)) throw new Error("Unsafe URL blocked");
    await shell.openExternal(url);
  });
};
