import { BrowserWindow, clipboard } from "electron";
import { is } from "@electron-toolkit/utils";
import { secureHandle, secureOn } from "./secureHandle.js";

export const registerWindowHandlers = () => {
  const getWindow = () => BrowserWindow.getFocusedWindow();

  // navigator.clipboard is blocked by the renderer permission handler; go
  // through the main-process clipboard module instead.
  secureHandle("clipboard:writeText", (_event, text) => {
    clipboard.writeText(String(text ?? ""));
    return true;
  });

  secureOn("window-minimize", () => getWindow()?.minimize());

  secureOn("window-maximize", () => {
    const win = getWindow();
    win && (win.isMaximized() ? win.unmaximize() : win.maximize());
  });

  secureOn("window-close", () => getWindow()?.close());

  secureHandle("window-is-maximized", () => getWindow()?.isMaximized() ?? false);

  secureOn("window-toggle-devtools", () => {
    if (is.dev) getWindow()?.webContents.toggleDevTools();
  });

  secureOn("reload-app", () => getWindow()?.webContents.reloadIgnoringCache());
};
