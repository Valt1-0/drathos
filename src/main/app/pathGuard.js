/**
 * Pure path-containment helpers for the game install/uninstall guards.
 * No electron/store dependency, so this module is unit-testable in isolation.
 */
import os from "os";
import path from "path";

// The default install location gameEngine.js falls back to when no download
// path is configured. Kept here so the uninstall guard and the installer agree.
export const defaultDownloadDir = () =>
  path.resolve(os.homedir(), "Documents", "Drathos", "Downloads");

// The effective download directory for a given stored value (configured path,
// or the shared default when unset/blank).
export const resolveDownloadDir = (storedPath) =>
  storedPath && typeof storedPath === "string" && storedPath.trim() !== ""
    ? path.resolve(storedPath)
    : defaultDownloadDir();

// True when `target` is `base` itself or nested inside it. path.relative is
// separator-tolerant and, on Windows, case-insensitive — so a drive-letter
// casing difference (C:\ vs c:\) no longer spuriously denies access, and a path
// on another drive yields an absolute relative path and is correctly rejected.
export const isInside = (base, target) => {
  const rel = path.relative(base, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

// True when two paths resolve to the same location (robust to separators/case).
export const pathsEqual = (a, b) =>
  path.relative(path.resolve(a), path.resolve(b)) === "";
