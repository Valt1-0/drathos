/**
 * Discord Rich Presence IPC handlers
 */
import { ipcMain } from "electron";
import store from "../store.js";
import { moduleLoader } from "../utils/moduleLoader.js";
import { setDiscordRPC } from "./game.handlers.js";

let discordRPC = null;

const ensureRPCLoaded = async () => {
  if (discordRPC) return discordRPC;
  discordRPC = await moduleLoader.loadDiscordRPC(true);
  if (!discordRPC) throw new Error("Cannot load Discord RPC module");
  return discordRPC;
};

export const getDiscordRPC = () => discordRPC;

export const initDiscordRPC = async (enabled) => {
  if (!enabled) return null;
  try {
    const rpc = await ensureRPCLoaded();
    rpc.isEnabled = true;
    setDiscordRPC(rpc);
    await rpc.initialize(true);
    return rpc;
  } catch (error) {
    console.error("[Discord RPC] Init error:", error);
    return null;
  }
};

export const cleanupDiscordRPC = async () => {
  if (discordRPC?.isConnected) await discordRPC.disconnect();
};

export const registerDiscordHandlers = () => {
  ipcMain.handle("discord-rpc:initialize", async (_, { enabled }) => {
    try {
      const rpc = await ensureRPCLoaded();
      rpc.isEnabled = enabled;
      setDiscordRPC(rpc);
      const result = await rpc.initialize(enabled);
      store.set("discordRPCEnabled", enabled);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("discord-rpc:setEnabled", async (_, { enabled }) => {
    try {
      const rpc = await ensureRPCLoaded();
      const result = await rpc.setEnabled(enabled);
      store.set("discordRPCEnabled", enabled);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("discord-rpc:getStatus", async () => {
    if (!discordRPC) {
      return { isConnected: false, isEnabled: false, currentActivity: null, clientId: null, user: null };
    }
    try {
      return discordRPC.getStatus();
    } catch {
      return { isConnected: false, isEnabled: false, currentActivity: null, clientId: null, user: null };
    }
  });

  ipcMain.handle("discord-rpc:disconnect", async () => {
    try {
      if (discordRPC) await discordRPC.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
};
