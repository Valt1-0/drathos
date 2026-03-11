import { ipcMain, app } from "electron";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const escapePsString = (s) => s.replace(/'/g, "''");

export const registerShortcutHandlers = () => {
  ipcMain.handle("createShortcut", async (_event, { gameName, gamePath, executable }) => {
    try {
      const desktop = app.getPath("desktop");
      const execPath = path.join(gamePath, executable);

      if (process.platform === "win32") {
        const shortcutPath = path.join(desktop, `${gameName}.lnk`);
        const esc = escapePsString;
        const ps = `$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('${esc(shortcutPath)}'); $sc.TargetPath = '${esc(execPath)}'; $sc.WorkingDirectory = '${esc(gamePath)}'; $sc.Save()`;

        await new Promise((resolve, reject) => {
          exec(
            `powershell -NoProfile -NonInteractive -Command "${ps}"`,
            { windowsHide: true },
            (err) => (err ? reject(err) : resolve())
          );
        });
      } else {
        const desktopFile = path.join(desktop, `${gameName}.desktop`);
        const content = [
          "[Desktop Entry]",
          "Type=Application",
          `Name=${gameName}`,
          `Exec=${execPath}`,
          `Path=${gamePath}`,
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
