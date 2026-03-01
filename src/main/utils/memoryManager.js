class MemoryManager {
  constructor() {
    this.gcTimer = null;
  }

  initialize() {
    if (global.gc) {
      this.gcTimer = setInterval(() => this.runGarbageCollection(), 5 * 60 * 1000);
    }
    console.log('[MemoryManager] Initialisé');
  }

  runGarbageCollection() {
    if (!global.gc) return;
    try {
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      global.gc();
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`[MemoryManager] GC - ${(memBefore - memAfter).toFixed(2)} MB libérés`);
    } catch (error) {
      console.error('[MemoryManager] Erreur GC:', error);
    }
  }

  cleanup() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    if (global.gc) global.gc();
    console.log('[MemoryManager] Nettoyage terminé');
  }
}

export const memoryManager = new MemoryManager();
