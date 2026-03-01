import Store from "electron-store";
import { app } from "electron";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const schema = {
  userToken: {
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
  allowSelfSignedCerts: {
    type: "boolean",
    default: true,
  },
};

/**
 * Returns the encryption key to use for the store.
 *
 * Priority:
 *   1. DRATHOS_ENCRYPTION_KEY env var (advanced / CI override)
 *   2. Auto-generated key stored in <userData>/drathos.key
 *
 * The auto-generated key is created on first run and persists across
 * launches — the store is always encrypted even on self-hosted installs
 * where the env var is not set.
 */
function getEncryptionKey() {
  if (process.env.DRATHOS_ENCRYPTION_KEY) {
    return process.env.DRATHOS_ENCRYPTION_KEY;
  }

  const keyPath = path.join(app.getPath("userData"), "drathos.key");

  if (fs.existsSync(keyPath)) {
    try {
      const key = fs.readFileSync(keyPath, "utf8").trim();
      if (key.length >= 32) return key;
    } catch {}
  }

  // First run — generate a random 256-bit key and persist it.
  const key = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(path.dirname(keyPath), { recursive: true });
    fs.writeFileSync(keyPath, key, { encoding: "utf8", mode: 0o600 });
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
    // Legacy: hardcoded dev key used before 0.7.0
    { schema, encryptionKey: "drathos-dev-key-change-in-production" },
    // Unencrypted: DRATHOS_ENCRYPTION_KEY was not set before this version
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

const store = createStore();

export default store;
