import { dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import { secureHandle } from "./secureHandle.js";

const getMainWindow = () => BrowserWindow.getAllWindows()[0];

export const registerDialogHandlers = () => {
  secureHandle("dialog:selectAndCreate", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const subfolder = path.join(result.filePaths[0], "DrathosGames");
    await fs.promises.mkdir(subfolder, { recursive: true }).catch(() => {});
    return subfolder;
  });

  secureHandle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
