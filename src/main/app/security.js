/**
 * Security utilities for the main process
 */
import { is } from "@electron-toolkit/utils";
import logger from "../utils/logger.js";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const EXECUTABLE_EXT = {
  win32: [".exe", ".bat", ".cmd"],
  linux: [".sh", ".run", ".bin", ".appimage"],
};

export const isValidSender = (frame) => {
  try {
    const { protocol, hostname } = new URL(frame.url);
    if (protocol === "file:") return true;
    if (is.dev && (hostname === "localhost" || hostname === "127.0.0.1")) return true;
    logger.warn(`[Security] Unauthorized sender: ${frame.url}`);
    return false;
  } catch {
    return false;
  }
};

export const isSafeForExternalOpen = (url) => {
  try {
    const { protocol } = new URL(url);
    if (!SAFE_PROTOCOLS.has(protocol)) {
      logger.warn(`[Security] Blocked protocol: ${protocol}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const isExecutableFile = (fileName) => {
  const lower = fileName.toLowerCase();
  const exts = EXECUTABLE_EXT[process.platform] || [];
  return exts.some((ext) => lower.endsWith(ext));
};
