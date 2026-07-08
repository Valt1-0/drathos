import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { sha256File, checksumMatches } from "../src/main/app/fileChecksum.js";

describe("checksumMatches", () => {
  it("compares case-insensitively and trims", () => {
    expect(checksumMatches("ABCdef", "abcDEF")).toBe(true);
    expect(checksumMatches("  abc  ", "abc")).toBe(true);
  });

  it("rejects mismatches and non-strings", () => {
    expect(checksumMatches("abc", "abd")).toBe(false);
    expect(checksumMatches(null, "abc")).toBe(false);
    expect(checksumMatches("abc", undefined)).toBe(false);
  });
});

describe("sha256File", () => {
  let dir;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "drathos-fc-"));
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("matches crypto over the same bytes and round-trips with checksumMatches", async () => {
    const p = path.join(dir, "game.zip");
    const data = Buffer.from("PK fake archive");
    fs.writeFileSync(p, data);
    const expected = crypto.createHash("sha256").update(data).digest("hex");
    const actual = await sha256File(p);
    expect(actual).toBe(expected);
    expect(checksumMatches(actual, expected.toUpperCase())).toBe(true);
  });
});
