/**
 * IPC handlers registry
 * Registers all IPC handlers in one place
 */
import { registerWindowHandlers } from "./window.handlers.js";
import { registerStoreHandlers } from "./store.handlers.js";
import { registerDialogHandlers } from "./dialog.handlers.js";
import { registerGameHandlers, getGameLauncher, terminateAllWorkers } from "./game.handlers.js";
import { registerModHandlers } from "./mod.handlers.js";
import { registerArchiveHandlers } from "./archive.handlers.js";
import { registerStatsHandlers } from "./stats.handlers.js";
import { registerLoggerHandlers } from "./logger.handlers.js";
import { registerUpdaterHandlers, setAutoUpdateManager, getAutoUpdateManager } from "./updater.handlers.js";
import { registerNotificationHandlers } from "./notification.handlers.js";
import { registerShortcutHandlers } from "./shortcut.handlers.js";
import { registerSecurityHandlers } from "./security.handlers.js";

export const registerAllHandlers = () => {
  registerWindowHandlers();
  registerStoreHandlers();
  registerDialogHandlers();
  registerGameHandlers();
  registerModHandlers();
  registerArchiveHandlers();
  registerStatsHandlers();
  registerLoggerHandlers();
  registerUpdaterHandlers();
  registerNotificationHandlers();
  registerShortcutHandlers();
  registerSecurityHandlers();
};

export {
  getGameLauncher,
  terminateAllWorkers,
  setAutoUpdateManager,
  getAutoUpdateManager,
};
