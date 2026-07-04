/**
 * Path and filename validation utilities
 */
import path from "path";

const RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
// eslint-disable-next-line no-control-regex -- control chars are deliberately rejected in paths
const DANGEROUS_CHARS = /[<>:"|?*\x00-\x1f]/g;

export const validateFilename = (filename) => {
  if (!filename || typeof filename !== "string") throw new Error("Invalid filename");

  let name = path.basename(filename).replace(DANGEROUS_CHARS, "").replace(/\s+/g, " ").trim();
  if (RESERVED_NAMES.test(name)) name = "_" + name;

  if (name.length > 255) {
    const ext = path.extname(name);
    name = name.slice(0, 255 - ext.length) + ext;
  }
  return name;
};

export const validateAndResolvePath = (basePath, relativePath) => {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error("Invalid installation path");
  }

  const normalized = path.normalize(relativePath);

  if (normalized.includes("..") || path.isAbsolute(normalized) ||
      normalized.includes("\0") || DANGEROUS_CHARS.test(normalized)) {
    throw new Error("Invalid path: potential security risk");
  }

  const fullPath = path.resolve(basePath, normalized);
  const rel = path.relative(basePath, fullPath);

  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path must be inside base directory");
  }

  return fullPath;
};
