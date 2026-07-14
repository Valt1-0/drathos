import { dialog, BrowserWindow } from "electron";
import fs from "fs";
import path from "path";
import store from "../store.js";
import { secureHandle } from "./secureHandle.js";

const getMainWindow = () => BrowserWindow.getAllWindows()[0];

// Electron 43 defaults dialogs to Downloads — point them at the game directory
const dialogDefaultPath = () => {
  const downloadPath = store.get("downloadPath", "");
  return downloadPath && fs.existsSync(downloadPath) ? { defaultPath: downloadPath } : {};
};

export const registerDialogHandlers = () => {
  secureHandle("dialog:selectAndCreate", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
      ...dialogDefaultPath(),
    });

    if (result.canceled || !result.filePaths.length) return null;

    const subfolder = path.join(result.filePaths[0], "DrathosGames");
    await fs.promises.mkdir(subfolder, { recursive: true }).catch(() => {});
    return subfolder;
  });

  secureHandle("dialog:openFolder", async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      properties: ["openDirectory"],
      ...dialogDefaultPath(),
    });
    return result.canceled ? null : result.filePaths[0];
  });
};
