/**
 * Security utilities for the main process
 */
import { is } from "@electron-toolkit/utils";
import logger from "../utils/logger.js";

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

// Explicit allowlist of hostnames the app is permitted to open in the system browser.
// Only neutral third-party domains — no project-specific domains so forks and
// self-hosters are not restricted by upstream branding.
// Add entries here when new external links are introduced; never use a wildcard.
const ALLOWED_EXTERNAL_HOSTS = new Set([
  "wiki.winehq.org",  // Wine installation guide (WineRequiredModal)
  "winehq.org",
  "github.com",       // Bug reports open a pre-filled issue (BugReportModal)
]);

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
    const { protocol, hostname } = new URL(url);
    if (!SAFE_PROTOCOLS.has(protocol)) {
      logger.warn(`[Security] Blocked protocol for external open: ${protocol}`);
      return false;
    }
    if (protocol !== "mailto:" && !ALLOWED_EXTERNAL_HOSTS.has(hostname)) {
      logger.warn(`[Security] Blocked external open — hostname not in allowlist: ${hostname}`);
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
