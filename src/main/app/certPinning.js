// Trust-On-First-Use certificate pinning for the self-hosted server. The pure
// helpers (fingerprintOf, evaluatePin) are unit-tested; the get/set/clear wrap
// electron-store.
import crypto from "crypto";
import store from "../store.js";

const KEY = "pinnedCertificates";

export const normalizeFingerprint = (fp) =>
  typeof fp === "string" ? fp.trim().toLowerCase() : "";

// PEM → DER → sha256, used when Electron doesn't populate cert.fingerprint, so
// there is always a stable value to pin (never a hard "can't connect").
const derFingerprint = (pem) => {
  if (typeof pem !== "string") return "";
  const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
  if (!b64) return "";
  try {
    const hash = crypto.createHash("sha256").update(Buffer.from(b64, "base64")).digest("base64");
    return `sha256/${hash}`;
  } catch {
    return "";
  }
};

// Prefer Electron's own fingerprint; fall back to deriving it from the cert data.
export const fingerprintOf = (cert) =>
  normalizeFingerprint(cert?.fingerprint) || normalizeFingerprint(derFingerprint(cert?.data));

// first-use → pin it and accept; match → accept; mismatch → block.
export const evaluatePin = (stored, presented) => {
  const p = normalizeFingerprint(presented);
  if (!p) return "mismatch";
  if (!stored) return "first-use";
  return normalizeFingerprint(stored) === p ? "match" : "mismatch";
};

export const getPinnedCert = (hostname) => store.get(KEY, {})[hostname] || null;

export const setPinnedCert = (hostname, fingerprint) => {
  const pins = store.get(KEY, {});
  pins[hostname] = normalizeFingerprint(fingerprint);
  store.set(KEY, pins);
};

export const clearPinnedCert = (hostname) => {
  const pins = store.get(KEY, {});
  if (pins[hostname]) {
    delete pins[hostname];
    store.set(KEY, pins);
  }
};
