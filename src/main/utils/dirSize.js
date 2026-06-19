import fs from "fs";
import path from "path";

const MAX_DEPTH = 12;
const MAX_FILES = 50_000;
const CONCURRENCY = 32;

/**
 * Recursively calculates the total size of a directory tree.
 * Processes entries in batches of CONCURRENCY to avoid I/O thrashing on large installs.
 *
 * @param {string} dirPath
 * @param {number} depth - current recursion depth (internal)
 * @param {{ files: number, truncated: boolean }} counter - shared across recursive calls
 * @returns {Promise<number>} total bytes
 */
export async function calculateDirSize(dirPath, depth = 0, counter = { files: 0, truncated: false }) {
  if (depth > MAX_DEPTH || counter.files >= MAX_FILES) {
    counter.truncated = true;
    return 0;
  }

  try {
    const items = await fs.promises.readdir(dirPath);
    let total = 0;

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      if (counter.files >= MAX_FILES) {
        counter.truncated = true;
        break;
      }
      const chunk = items.slice(i, i + CONCURRENCY);
      const sizes = await Promise.all(chunk.map(async (item) => {
        if (counter.files >= MAX_FILES) { counter.truncated = true; return 0; }
        try {
          const itemPath = path.join(dirPath, item);
          const stats = await fs.promises.stat(itemPath);
          if (stats.isDirectory()) return calculateDirSize(itemPath, depth + 1, counter);
          counter.files++;
          return stats.size;
        } catch {
          return 0;
        }
      }));
      total += sizes.reduce((sum, s) => sum + s, 0);
    }

    return total;
  } catch {
    return 0;
  }
}
