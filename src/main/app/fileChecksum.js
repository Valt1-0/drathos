// Streaming SHA-256 for verifying downloaded game archives. checksumMatches is
// pure (case-insensitive compare); both are unit-tested.
import crypto from "crypto";
import fs from "fs";

export const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

export const checksumMatches = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  a.trim().toLowerCase() === b.trim().toLowerCase();
