/**
 * Store IPC handlers
 */
import { ipcMain, shell, app } from "electron";
import store from "../store.js";
import { isValidSender, isSafeForExternalOpen } from "../app/security.js";

export const registerStoreHandlers = () => {
  ipcMain.handle("store-get", (_, key) => store.get(key));
  ipcMain.handle("store-set", (_, key, value) => store.set(key, value));
  ipcMain.handle("store-delete", (_, key) => store.delete(key));
  ipcMain.handle("store-clear", () => store.clear());

  ipcMain.handle("app:getLoginItem", () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle("app:setLoginItem", (_, openAtLogin) => {
    app.setLoginItemSettings({ openAtLogin, name: "Drathos" });
  });

  ipcMain.handle("shell:openExternal", async (event, url) => {
    if (!isValidSender(event.senderFrame)) {
      throw new Error("Unauthorized sender");
    }
    if (!isSafeForExternalOpen(url)) {
      throw new Error("Unsafe URL blocked");
    }
    await shell.openExternal(url);
  });
};
