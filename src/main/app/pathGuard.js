// Pure path-containment helpers for the install/uninstall guards — no electron
// or store dependency, so this module is unit-testable in isolation.
import os from "os";
import path from "path";

// Must match gameEngine.js's fallback so the guard and the installer agree.
export const defaultDownloadDir = () =>
  path.resolve(os.homedir(), "Documents", "Drathos", "Downloads");

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
