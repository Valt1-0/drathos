class MemoryManager {
  constructor() {
    this.gcTimer = null;
  }

  initialize() {
    if (global.gc) {
      this.gcTimer = setInterval(() => this.runGarbageCollection(), 5 * 60 * 1000);
    }
  }

  runGarbageCollection() {
    if (!global.gc) return;
    try {
      global.gc();
    } catch {}
  }

  cleanup() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    if (global.gc) global.gc();
  }
}

export const memoryManager = new MemoryManager();
