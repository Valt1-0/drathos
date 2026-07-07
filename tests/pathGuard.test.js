import { describe, it, expect } from "vitest";
import path from "path";
import { isInside, pathsEqual, resolveDownloadDir, defaultDownloadDir } from "../src/main/app/pathGuard.js";

describe("isInside", () => {
  const base = path.resolve("games", "library");

  it("accepts the base directory itself", () => {
    expect(isInside(base, base)).toBe(true);
  });

  it("accepts a nested game folder", () => {
    expect(isInside(base, path.join(base, "hollow_knight_v1.0.0"))).toBe(true);
    expect(isInside(base, path.join(base, "deep", "nested", "file.exe"))).toBe(true);
  });

  it("rejects a sibling outside the base", () => {
    expect(isInside(base, path.resolve("games", "other", "game"))).toBe(false);
  });

  it("rejects traversal that escapes the base", () => {
    expect(isInside(base, path.join(base, "..", "escape"))).toBe(false);
  });

  it("rejects a prefix-collision sibling (library vs library2)", () => {
    // startsWith(base) would wrongly accept this; path.relative does not.
    expect(isInside(base, path.resolve("games", "library2", "game"))).toBe(false);
  });
});

describe("isInside — Windows semantics (case-insensitive, separator-tolerant)", () => {
  const w = path.win32;
  const isInsideWin = (base, target) => {
    const rel = w.relative(base, target);
    return rel === "" || (!rel.startsWith("..") && !w.isAbsolute(rel));
  };

  it("ignores drive-letter casing (C:\\ vs c:\\)", () => {
    expect(isInsideWin("C:\\Games\\Library", "c:\\Games\\Library\\game")).toBe(true);
    expect(isInsideWin("c:\\Games\\Library", "C:\\Games\\Library\\game")).toBe(true);
  });

  it("ignores folder-name casing", () => {
    expect(isInsideWin("C:\\Games\\Library", "C:\\games\\library\\game")).toBe(true);
  });

  it("rejects a path on a different drive", () => {
    expect(isInsideWin("C:\\Games\\Library", "D:\\Games\\Library\\game")).toBe(false);
  });
});

describe("resolveDownloadDir", () => {
  it("uses the configured path when set", () => {
    expect(resolveDownloadDir("/srv/drathos/games")).toBe(path.resolve("/srv/drathos/games"));
  });

  it("falls back to the default when empty, blank or missing", () => {
    const def = defaultDownloadDir();
    expect(resolveDownloadDir("")).toBe(def);
    expect(resolveDownloadDir("   ")).toBe(def);
    expect(resolveDownloadDir(undefined)).toBe(def);
    expect(resolveDownloadDir(null)).toBe(def);
  });
});

describe("pathsEqual", () => {
  it("matches paths differing only by separators or redundant segments", () => {
    expect(pathsEqual("games/lib/game", path.join("games", "lib", "game"))).toBe(true);
    expect(pathsEqual("games/lib/game", "games/lib/./game")).toBe(true);
    expect(pathsEqual("games/lib/game", "games/other/../lib/game")).toBe(true);
  });

  it("does not match different locations", () => {
    expect(pathsEqual("games/lib/a", "games/lib/b")).toBe(false);
  });
});
