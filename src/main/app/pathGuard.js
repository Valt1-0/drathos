// Pure path-containment helpers for the install/uninstall guards — no electron
// or store dependency, so this module is unit-testable in isolation.
import fs from "fs";
import os from "os";
import path from "path";

// Historical default. Documents can be OneDrive-managed on Windows, where
// directory creation may block indefinitely — kept only for installs that
// already live there.
const legacyDefaultDir = () =>
  path.resolve(os.homedir(), "Documents", "Drathos", "Downloads");

const localDataRoot = () => {
  if (process.platform === "win32")
    return process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  if (process.platform === "darwin")
    return path.join(os.homedir(), "Library", "Application Support");
  return process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
};

// Shared by the guard AND gameEngine so both always agree on the fallback.
export const defaultDownloadDir = () => {
  try {
    const legacy = legacyDefaultDir();
    if (fs.existsSync(legacy) && fs.readdirSync(legacy).length > 0) return legacy;
  } catch {
    /* unreadable legacy dir — use the safe default */
  }
  return path.resolve(localDataRoot(), "Drathos", "Downloads");
};

export const resolveDownloadDir = (storedPath) =>
  storedPath && typeof storedPath === "string" && storedPath.trim() !== ""
    ? path.resolve(storedPath)
    : defaultDownloadDir();

// path.relative is separator-tolerant and case-insensitive on Windows, so it
// handles C:\ vs c:\ and rejects a different drive (absolute relative result).
export const isInside = (base, target) => {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

export const pathsEqual = (a, b) =>
  path.relative(path.resolve(a), path.resolve(b)) === "";

// gameEngine installs each game into `<name>_v<version>`. This marks a folder as
// a Drathos install, so we never delete an arbitrary/system path a server sends.
export const hasVersionSuffix = (basename) => /_v[0-9][\w.-]*$/i.test(basename);
