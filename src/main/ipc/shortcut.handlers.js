import { ipcMain, app, shell } from "electron";
import fs from "fs";
import path from "path";

export const registerShortcutHandlers = () => {
  ipcMain.handle("createShortcut", async (_event, { gameName, gamePath, executable }) => {
    try {
      const desktop = app.getPath("desktop");
      const execPath = path.join(gamePath, executable);

      if (process.platform === "win32") {
        // Use Electron's native shell.writeShortcutLink — no shell escaping needed
        const shortcutPath = path.join(desktop, `${gameName}.lnk`);
        const success = shell.writeShortcutLink(shortcutPath, "create", {
          target: execPath,
          cwd: gamePath,
          icon: execPath,
          iconIndex: 0,
        });
        if (!success) throw new Error("shell.writeShortcutLink returned false");
      } else {
        const escapeDesktop = (v) => v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        const desktopFile = path.join(desktop, `${gameName.replace(/[/\\:*?"<>|]/g, "_")}.desktop`);
        const content = [
          "[Desktop Entry]",
          "Type=Application",
          `Name=${escapeDesktop(gameName)}`,
          `Exec=${escapeDesktop(execPath)}`,
          `Path=${escapeDesktop(gamePath)}`,
          "Icon=application-x-executable",
          "Terminal=false",
          "Categories=Game;",
        ].join("\n") + "\n";

        await fs.promises.writeFile(desktopFile, content, { mode: 0o755 });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
