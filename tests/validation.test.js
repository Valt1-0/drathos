import { describe, it, expect } from "vitest";
import path from "path";
import { validateFilename, validateAndResolvePath } from "../src/main/app/validation.js";

describe("validateFilename", () => {
  it("returns a clean filename unchanged", () => {
    expect(validateFilename("Hollow Knight.exe")).toBe("Hollow Knight.exe");
  });

  it("strips any directory part", () => {
    expect(validateFilename(path.join("some", "dir", "game.exe"))).toBe("game.exe");
  });

  it("removes dangerous characters", () => {
    expect(validateFilename('ga<me>:"|?*.exe')).toBe("game.exe");
    expect(validateFilename("game\x00\x1f.exe")).toBe("game.exe");
  });

  it("collapses whitespace", () => {
    expect(validateFilename("my   game .exe")).toBe("my game .exe");
  });

  it("prefixes Windows reserved device names", () => {
    expect(validateFilename("CON.exe")).toBe("_CON.exe");
    expect(validateFilename("aux.txt")).toBe("_aux.txt");
    expect(validateFilename("COM1")).toBe("_COM1");
  });

  it("does not prefix names merely containing a reserved word", () => {
    expect(validateFilename("CONTROL.exe")).toBe("CONTROL.exe");
  });

  it("truncates to 255 chars while keeping the extension", () => {
    const result = validateFilename("x".repeat(300) + ".exe");
    expect(result).toHaveLength(255);
    expect(result.endsWith(".exe")).toBe(true);
  });

  it("rejects empty or non-string input", () => {
    expect(() => validateFilename("")).toThrow(/Invalid filename/);
    expect(() => validateFilename(null)).toThrow(/Invalid filename/);
  });
});

describe("validateAndResolvePath", () => {
  const base = path.resolve("C:/games/mygame");

  it("resolves a relative executable inside the base", () => {
    const result = validateAndResolvePath(base, "bin/game.exe");
    expect(result).toBe(path.resolve(base, "bin", "game.exe"));
  });

  it("rejects parent traversal", () => {
    expect(() => validateAndResolvePath(base, "../other/game.exe")).toThrow(
      /security risk/
    );
    expect(() => validateAndResolvePath(base, "bin/../../evil.exe")).toThrow(
      /security risk/
    );
  });

  it("rejects absolute paths", () => {
    expect(() => validateAndResolvePath(base, path.resolve("C:/windows/system32/cmd.exe"))).toThrow(
      /security risk/
    );
  });

  it("rejects null bytes and dangerous characters", () => {
    expect(() => validateAndResolvePath(base, "game\0.exe")).toThrow(/security risk/);
    expect(() => validateAndResolvePath(base, 'ga"me.exe')).toThrow(/security risk/);
  });

  it("rejects empty or non-string input", () => {
    expect(() => validateAndResolvePath(base, "")).toThrow(/Invalid installation path/);
    expect(() => validateAndResolvePath(base, undefined)).toThrow(
      /Invalid installation path/
    );
  });
});
