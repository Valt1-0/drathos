import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class WineDetector {
  constructor() {
    this.wineCommand = null;
    this.isChecked = false;
  }

  async detectWine() {
    if (this.isChecked) {
      return this.wineCommand;
    }

    const platform = process.platform;

    if (platform === "win32") {
      this.isChecked = true;
      return null;
    }

    const commands = ["wine", "wine64", "/usr/local/bin/wine"];

    for (const cmd of commands) {
      try {
        const { stdout } = await execAsync(`which ${cmd}`);
        if (stdout.trim()) {
          console.log(`[Wine] Wine detected: ${cmd}`);
          this.wineCommand = cmd;
          this.isChecked = true;
          return cmd;
        }
      } catch (error) {
        continue;
      }
    }

    console.log("[Wine] Wine not found on system");
    this.isChecked = true;
    return null;
  }

  async getWineVersion() {
    const wineCmd = await this.detectWine();
    if (!wineCmd) {
      return null;
    }

    try {
      const { stdout } = await execAsync(`${wineCmd} --version`);
      return stdout.trim();
    } catch (error) {
      console.error("[Wine] Error getting Wine version:", error.message);
      return null;
    }
  }

  isWineRequired(executablePath) {
    const platform = process.platform;
    const isExe = executablePath.toLowerCase().endsWith(".exe");

    return (platform === "darwin" || platform === "linux") && isExe;
  }

  getWineInstallInstructions() {
    const platform = process.platform;

    if (platform === "darwin") {
      return {
        platform: "macOS",
        method: "Homebrew",
        command: "brew install --cask wine-stable",
        url: "https://wiki.winehq.org/MacOS",
      };
    } else if (platform === "linux") {
      return {
        platform: "Linux",
        method: "Package Manager",
        command: "sudo apt install wine64 wine32",
        url: "https://wiki.winehq.org/Download",
      };
    }

    return null;
  }
}

export const wineDetector = new WineDetector();
