/**
 * Window control IPC handlers
 */
import { ipcMain, BrowserWindow } from "electron";
import { is } from "@electron-toolkit/utils";

export const registerWindowHandlers = () => {
  const getWindow = () => BrowserWindow.getFocusedWindow();

  ipcMain.on("window-minimize", () => getWindow()?.minimize());

  ipcMain.on("window-maximize", () => {
    const win = getWindow();
    win && (win.isMaximized() ? win.unmaximize() : win.maximize());
  });

  ipcMain.on("window-close", () => getWindow()?.close());

  ipcMain.handle("window-is-maximized", () => getWindow()?.isMaximized() ?? false);

  ipcMain.on("window-toggle-devtools", () => {
    if (is.dev) getWindow()?.webContents.toggleDevTools();
  });

  ipcMain.on("reload-app", () => getWindow()?.webContents.reloadIgnoringCache());
};
