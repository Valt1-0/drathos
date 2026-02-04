/**
 * IPC handlers registry
 * Registers all IPC handlers in one place
 */
import { registerWindowHandlers } from "./window.handlers.js";
import { registerStoreHandlers } from "./store.handlers.js";
import { registerDialogHandlers } from "./dialog.handlers.js";
import { registerGameHandlers, getGameLauncher } from "./game.handlers.js";
import { registerModHandlers } from "./mod.handlers.js";
import { registerArchiveHandlers } from "./archive.handlers.js";
import { registerStatsHandlers } from "./stats.handlers.js";
import { registerDiscordHandlers, initDiscordRPC, cleanupDiscordRPC, getDiscordRPC } from "./discord.handlers.js";
import { registerLoggerHandlers } from "./logger.handlers.js";
import { registerUpdaterHandlers, setAutoUpdateManager, getAutoUpdateManager } from "./updater.handlers.js";

export const registerAllHandlers = () => {
  registerWindowHandlers();
  registerStoreHandlers();
  registerDialogHandlers();
  registerGameHandlers();
  registerModHandlers();
  registerArchiveHandlers();
  registerStatsHandlers();
  registerDiscordHandlers();
  registerLoggerHandlers();
  registerUpdaterHandlers();
};

export {
  getGameLauncher,
  initDiscordRPC,
  cleanupDiscordRPC,
  getDiscordRPC,
  setAutoUpdateManager,
  getAutoUpdateManager,
};
