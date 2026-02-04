/**
 * Dialog IPC handlers
 */
import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";

const getMainWindow = () => BrowserWindow.getAllWindows()[0];

export const registerDialogHandlers = () => {
  ipcMain.handle("dialog:selectAndCreate", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const subfolder = path.join(result.filePaths[0], "DrathosGames");
    await fs.promises.mkdir(subfolder, { recursive: true }).catch(() => {});
    return subfolder;
  });

  ipcMain.handle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
