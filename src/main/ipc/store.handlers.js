/**
 * Store IPC handlers
 */
import { ipcMain, shell, app, screen } from "electron";
import store from "../store.js";
import { getToken, setToken, deleteToken, getRefreshToken, setRefreshToken, deleteRefreshToken } from "../utils/tokenStore.js";
import { isSafeForExternalOpen } from "../app/security.js";
import { defaultDownloadDir } from "../app/pathGuard.js";
import { secureHandle } from "./secureHandle.js";

// Keys the main process writes exclusively — renderer must not overwrite them via store-set
const RENDERER_BLOCKED_KEYS = new Set(["installedGamesCache", "installedMods"]);

export const registerStoreHandlers = () => {
  // secureHandle validates the sender frame — prevents reads from injected frames
  secureHandle("store-get", (_event, key, defaultValue) => {
    if (key === "userToken") return getToken() ?? defaultValue;
    if (key === "refreshToken") return getRefreshToken() ?? defaultValue;
    return defaultValue !== undefined ? store.get(key, defaultValue) : store.get(key);
  });
  secureHandle("store-set", (_event, key, value) => {
    if (RENDERER_BLOCKED_KEYS.has(key)) throw new Error(`Protected store key: ${key}`);
    if (key === "userToken") { setToken(value); return; }
    if (key === "refreshToken") { setRefreshToken(value); return; }
    store.set(key, value);
  });
  secureHandle("store-delete", (_event, key) => {
    if (key === "userToken") { deleteToken(); return; }
    if (key === "refreshToken") { deleteRefreshToken(); return; }
    store.delete(key);
  });
  secureHandle("store-clear", () => {
    const preserved = {};
    for (const key of RENDERER_BLOCKED_KEYS) {
      const val = store.get(key);
      if (val !== undefined) preserved[key] = val;
    }
    store.clear();
    deleteToken();
    deleteRefreshToken();
    for (const [key, val] of Object.entries(preserved)) {
      store.set(key, val);
    }
  });

  secureHandle("app:getLoginItem", () => app.getLoginItemSettings().openAtLogin);
  secureHandle("app:getDefaultDownloadDir", () => defaultDownloadDir());

  // 1-based, same enumeration order the launcher uses to pick a target display
  secureHandle("app:getDisplays", () =>
    screen.getAllDisplays().map((d, i) => ({
      index: i + 1,
      primary: d.id === screen.getPrimaryDisplay().id,
      width: d.bounds.width,
      height: d.bounds.height,
    }))
  );
  secureHandle("app:setLoginItem", (_event, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin, name: "Drathos" });
  });

  secureHandle("shell:openExternal", async (_event, url) => {
    if (!isSafeForExternalOpen(url)) throw new Error("Unsafe URL blocked");
    await shell.openExternal(url);
  });
};
