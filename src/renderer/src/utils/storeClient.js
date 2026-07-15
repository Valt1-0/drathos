// Batches back-to-back window.store IPC calls made in the same microtask tick
// into a single flush, so the many renderer callers don't hammer the bridge.

let pendingFlush = null;
const pendingOps = [];

function scheduledFlush() {
  if (pendingFlush) return;
  pendingFlush = Promise.resolve().then(() => {
    pendingFlush = null;
    const batch = pendingOps.splice(0);
    if (batch.length === 0) return;

    batch.forEach(({ op, key, value, defaultValue, resolve, reject }) => {
      const promise =
        op === 'get'
          ? window.store.get(key, defaultValue)
          : window.store.set(key, value);
      promise.then(resolve, reject);
    });
  });
}

export function storeGet(key, defaultValue) {
  return new Promise((resolve, reject) => {
    pendingOps.push({ op: 'get', key, defaultValue, resolve, reject });
    scheduledFlush();
  });
}

export function storeSet(key, value) {
  return new Promise((resolve, reject) => {
    pendingOps.push({ op: 'set', key, value, resolve, reject });
    scheduledFlush();
  });
}

export function storeBatch(ops) {
  return Promise.all(
    ops.map(({ op, key, defaultValue, value }) =>
      op === 'get' ? storeGet(key, defaultValue) : storeSet(key, value)
    )
  );
}
