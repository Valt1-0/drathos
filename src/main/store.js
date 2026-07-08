import Store from "electron-store";
import { app, safeStorage } from "electron";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const schema = {
  encryptedToken: {
    type: "string",
  },
  serverAddress: {
    type: "string",
  },
  downloadPath: {
    type: "string",
  },
  installedGamesCache: {
    type: "object",
    default: {},
  },
  installedMods: {
    type: "object",
    default: {},
  },
  pinnedCertificates: {
    type: "object",
    default: {},
  },
};

/**
 * Returns the encryption key for the store.
 *
 * Priority:
 *   1. DRATHOS_ENCRYPTION_KEY env var (CI / advanced override)
 *   2. safeStorage-encrypted key in <userData>/drathos.key.enc  (Windows DPAPI / macOS Keychain)
 *   3. Plaintext key in <userData>/drathos.key                  (fallback: Linux headless)
 *
 * On first run or migration from plaintext, the key is encrypted with
 * safeStorage and the old plaintext file is removed.
 */
function getEncryptionKey() {
  if (process.env.DRATHOS_ENCRYPTION_KEY) {
    return process.env.DRATHOS_ENCRYPTION_KEY;
  }

  const userData = app.getPath("userData");
  const plainKeyPath = path.join(userData, "drathos.key");
  const encKeyPath   = path.join(userData, "drathos.key.enc");

  if (safeStorage.isEncryptionAvailable()) {
    // --- Read existing safeStorage-encrypted key ---
    if (fs.existsSync(encKeyPath)) {
      try {
        const encBuf = fs.readFileSync(encKeyPath);
        const key = safeStorage.decryptString(encBuf);
        if (key.length >= 32) return key;
      } catch {
        // Corrupted — fall through to regenerate
      }
    }

    // --- Migration: plaintext key exists → re-encrypt it ---
    let key;
    if (fs.existsSync(plainKeyPath)) {
      try {
        const plain = fs.readFileSync(plainKeyPath, "utf8").trim();
        if (plain.length >= 32) key = plain;
      } catch {}
    }

    // --- First run: generate new key ---
    if (!key) key = crypto.randomBytes(32).toString("hex");

    // Persist encrypted
    try {
      fs.mkdirSync(userData, { recursive: true });
      fs.writeFileSync(encKeyPath, safeStorage.encryptString(key));
      // Remove old plaintext key now that it is migrated
      if (fs.existsSync(plainKeyPath)) {
        try { fs.unlinkSync(plainKeyPath); } catch {}
      }
    } catch (err) {
      console.warn("[Store] Could not persist encrypted key:", err.message);
    }
    return key;
  }

  // --- Fallback: safeStorage unavailable (headless Linux without libsecret) ---
  if (fs.existsSync(plainKeyPath)) {
    try {
      const key = fs.readFileSync(plainKeyPath, "utf8").trim();
      if (key.length >= 32) return key;
    } catch {}
  }

  const key = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(plainKeyPath, key, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    console.warn("[Store] Could not persist encryption key:", err.message);
  }
  return key;
}

function createStore() {
  const encryptionKey = getEncryptionKey();
  const storeOptions = { schema, encryptionKey };

  try {
    return new Store(storeOptions);
  } catch {
    // Opening the store failed — the existing file was likely written with a
    // different key (legacy hardcoded key, or no encryption at all).
    // Try known previous formats in order, migrate data, then recreate.
  }

  let migratedData = {};
  let storePath;

  for (const attemptOptions of [
    // Legacy: unencrypted store (pre-0.8.0 installs without DRATHOS_ENCRYPTION_KEY)
    { schema },
  ]) {
    try {
      const legacy = new Store(attemptOptions);
      storePath = legacy.path;
      migratedData = { ...legacy.store };
      break;
    } catch {}
  }

  if (storePath) {
    try { fs.unlinkSync(storePath); } catch {}
  }

  const fresh = new Store(storeOptions);
  try {
    for (const [key, value] of Object.entries(migratedData)) {
      fresh.set(key, value);
    }
  } catch {}

  return fresh;
}

// Lazy singleton — defers createStore() (and therefore safeStorage.isEncryptionAvailable())
// until the first property access, which always happens after app.whenReady() in practice.
// This guarantees safeStorage is fully operational (macOS Keychain / Linux secret-service)
// before we try to use it.
let _store = null;
const getStore = () => { if (!_store) _store = createStore(); return _store; };

const store = new Proxy({}, {
  get(_, prop) {
    const s = getStore();
    const val = s[prop];
    return typeof val === "function" ? val.bind(s) : val;
  },
  set(_, prop, value) {
    getStore()[prop] = value;
    return true;
  },
  has(_, prop) { return prop in getStore(); },
});

export default store;
