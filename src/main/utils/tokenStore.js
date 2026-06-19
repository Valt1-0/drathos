import { safeStorage } from "electron";
import store from "../store.js";

const ENCRYPTED_KEY = "encryptedToken";
const ENCRYPTED_REFRESH_KEY = "encryptedRefreshToken";

export function getToken() {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = store.get(ENCRYPTED_KEY);
    if (encrypted) {
      try {
        return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        return undefined;
      }
    }
    // Migration: plain token written by pre-safeStorage versions
    const plain = store.get("userToken");
    if (plain) {
      setToken(plain);
      store.delete("userToken");
      return plain;
    }
    return undefined;
  }
  // Fallback for environments where safeStorage is unavailable (some Linux)
  return store.get("userToken");
}

export function setToken(token) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    store.set(ENCRYPTED_KEY, encrypted.toString("base64"));
    store.delete("userToken");
  } else {
    store.set("userToken", token);
  }
}

export function deleteToken() {
  store.delete(ENCRYPTED_KEY);
  store.delete("userToken");
}

export function getRefreshToken() {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = store.get(ENCRYPTED_REFRESH_KEY);
    if (encrypted) {
      try {
        return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
  return store.get("refreshToken");
}

export function setRefreshToken(token) {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    store.set(ENCRYPTED_REFRESH_KEY, encrypted.toString("base64"));
    store.delete("refreshToken");
  } else {
    store.set("refreshToken", token);
  }
}

export function deleteRefreshToken() {
  store.delete(ENCRYPTED_REFRESH_KEY);
  store.delete("refreshToken");
}
