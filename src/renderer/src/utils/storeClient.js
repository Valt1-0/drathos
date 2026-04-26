/**
 * Thin batching wrapper around window.store IPC calls.
 *
 * Problem: 26+ renderer files call window.store.get/set individually, each
 * triggering a separate IPC round-trip. Back-to-back calls in the same
 * microtask tick are batched here into a single flush via Promise.all so the
 * IPC bridge is not hammered.
 *
 * Usage:
 *   import { storeGet, storeSet, storeBatch } from '../utils/storeClient';
 *
 *   // Drop-in replacements:
 *   const value = await storeGet('key', defaultValue);
 *   await storeSet('key', value);
 *
 *   // Explicit batch (multiple gets resolved in one tick):
 *   const [a, b] = await storeBatch([
 *     { op: 'get', key: 'keyA', defaultValue: null },
 *     { op: 'get', key: 'keyB', defaultValue: [] },
 *   ]);
 */

let pendingFlush = null;
const pendingOps = [];

function scheduledFlush() {
  if (pendingFlush) return;
  pendingFlush = Promise.resolve().then(() => {
    pendingFlush = null;
    const batch = pendingOps.splice(0);
    if (batch.length === 0) return;

    // Execute all ops in parallel — the IPC handler is async-safe
    batch.forEach(({ op, key, value, defaultValue, resolve, reject }) => {
      const promise =
        op === 'get'
          ? window.store.get(key, defaultValue)
          : window.store.set(key, value);
      promise.then(resolve, reject);
    });
  });
}

/**
 * Read a value from the Electron store.
 * Equivalent to window.store.get(key, defaultValue).
 */
export function storeGet(key, defaultValue) {
  return new Promise((resolve, reject) => {
    pendingOps.push({ op: 'get', key, defaultValue, resolve, reject });
    scheduledFlush();
  });
}

/**
 * Write a value to the Electron store.
 * Equivalent to window.store.set(key, value).
 */
export function storeSet(key, value) {
  return new Promise((resolve, reject) => {
    pendingOps.push({ op: 'set', key, value, resolve, reject });
    scheduledFlush();
  });
}

/**
 * Explicit batch: run an array of get/set ops and return their results
 * in the same order.  Useful when you need several keys at once.
 *
 * @param {Array<{ op: 'get'|'set', key: string, defaultValue?: any, value?: any }>} ops
 * @returns {Promise<any[]>}
 */
export function storeBatch(ops) {
  return Promise.all(
    ops.map(({ op, key, defaultValue, value }) =>
      op === 'get' ? storeGet(key, defaultValue) : storeSet(key, value)
    )
  );
}
