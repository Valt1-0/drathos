import { describe, it, expect, vi } from "vitest";

// certPinning imports ../store.js (electron-store). Stub it so the pure helpers
// can be imported without an Electron runtime.
vi.mock("../src/main/store.js", () => ({ default: { get: () => ({}), set: () => {} } }));

import crypto from "crypto";

const { normalizeFingerprint, evaluatePin, fingerprintOf } = await import(
  "../src/main/app/certPinning.js"
);

describe("normalizeFingerprint", () => {
  it("lowercases and trims", () => {
    expect(normalizeFingerprint("  SHA256/AbCdEf  ")).toBe("sha256/abcdef");
  });

  it("returns empty string for non-strings", () => {
    expect(normalizeFingerprint(null)).toBe("");
    expect(normalizeFingerprint(undefined)).toBe("");
    expect(normalizeFingerprint(42)).toBe("");
  });
});

describe("fingerprintOf", () => {
  it("prefers Electron's own fingerprint", () => {
    expect(fingerprintOf({ fingerprint: "SHA256/AbC", data: "ignored" })).toBe("sha256/abc");
  });

  it("derives a stable sha256 from cert data when fingerprint is absent", () => {
    const der = Buffer.from("fake-certificate-bytes");
    const pem = `-----BEGIN CERTIFICATE-----\n${der.toString("base64")}\n-----END CERTIFICATE-----`;
    const expected = `sha256/${crypto.createHash("sha256").update(der).digest("base64")}`.toLowerCase();
    expect(fingerprintOf({ data: pem })).toBe(expected);
  });

  it("is deterministic for the same cert", () => {
    const pem = `-----BEGIN CERTIFICATE-----\n${Buffer.from("abc").toString("base64")}\n-----END CERTIFICATE-----`;
    expect(fingerprintOf({ data: pem })).toBe(fingerprintOf({ data: pem }));
  });

  it("returns empty string when nothing usable is present", () => {
    expect(fingerprintOf({})).toBe("");
    expect(fingerprintOf(null)).toBe("");
  });
});

describe("evaluatePin", () => {
  it("pins on first use when nothing is stored", () => {
    expect(evaluatePin(null, "sha256/aaa")).toBe("first-use");
  });

  it("accepts a matching fingerprint (case-insensitive)", () => {
    expect(evaluatePin("sha256/aaa", "SHA256/AAA")).toBe("match");
  });

  it("blocks a changed fingerprint", () => {
    expect(evaluatePin("sha256/aaa", "sha256/bbb")).toBe("mismatch");
  });

  it("blocks when the presented fingerprint is missing", () => {
    expect(evaluatePin("sha256/aaa", null)).toBe("mismatch");
    expect(evaluatePin(null, "")).toBe("mismatch");
  });
});
