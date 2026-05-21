import { ipcMain } from "electron";
import { isValidSender } from "../app/security.js";
import logger from "../utils/logger.js";

const warnUnauthorized = (channel, frame) =>
  logger.warn(`[secureHandle] Unauthorized IPC call on channel "${channel}" from ${frame?.url ?? "unknown"}`);

/** Drop-in for ipcMain.handle — validates sender before running the handler. */
export const secureHandle = (channel, handler) =>
  ipcMain.handle(channel, (event, ...args) => {
    if (!isValidSender(event.senderFrame)) {
      warnUnauthorized(channel, event.senderFrame);
      throw new Error("Unauthorized");
    }
    return handler(event, ...args);
  });

/** Drop-in for ipcMain.on — validates sender, silently drops unauthorized events. */
export const secureOn = (channel, handler) =>
  ipcMain.on(channel, (event, ...args) => {
    if (!isValidSender(event.senderFrame)) {
      warnUnauthorized(channel, event.senderFrame);
      return;
    }
    handler(event, ...args);
  });
