class MemoryManager {
  constructor() {
    this.config = {
      maxConcurrentProcesses: 5,
      cacheCleanupInterval: 30 * 60 * 1000,
      gcInterval: 5 * 60 * 1000,
      maxCacheAge: 7 * 24 * 60 * 60 * 1000,
    };

    this.activeProcesses = new Set();
    this.registeredListeners = new Map();
    this.cleanupTasks = new Set();

    this.cacheCleanupTimer = null;
    this.gcTimer = null;

    this.stats = {
      processesStarted: 0,
      processesEnded: 0,
      cacheCleanups: 0,
      gcRuns: 0,
      listenersRegistered: 0,
      listenersRemoved: 0,
    };
  }

  initialize() {
    this.startCacheCleanup();
    this.startPeriodicGC();
    console.log('[MemoryManager] Initialisé');
  }

  startCacheCleanup() {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
    }

    this.cacheCleanupTimer = setInterval(() => {
      this.cleanupOldCache();
    }, this.config.cacheCleanupInterval);

    this.cleanupOldCache();
  }

  startPeriodicGC() {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    if (global.gc) {
      this.gcTimer = setInterval(() => {
        this.runGarbageCollection();
      }, this.config.gcInterval);
    }
  }

  async cleanupOldCache() {
    try {
      const startTime = Date.now();
      this.stats.cacheCleanups++;
      const duration = Date.now() - startTime;
      console.log(`[MemoryManager] Cache nettoyé en ${duration}ms`);
    } catch (error) {
      console.error('[MemoryManager] Erreur nettoyage cache:', error);
    }
  }

  runGarbageCollection() {
    if (!global.gc) return;

    try {
      const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
      global.gc();
      const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
      const freed = memBefore - memAfter;

      this.stats.gcRuns++;
      console.log(`[MemoryManager] GC - ${freed.toFixed(2)} MB libérés`);
    } catch (error) {
      console.error('[MemoryManager] Erreur GC:', error);
    }
  }

  registerProcess(processId) {
    if (this.activeProcesses.size >= this.config.maxConcurrentProcesses) {
      console.warn(`[MemoryManager] Limite processus atteinte (${this.config.maxConcurrentProcesses})`);
      return false;
    }

    this.activeProcesses.add(processId);
    this.stats.processesStarted++;
    return true;
  }

  unregisterProcess(processId) {
    if (this.activeProcesses.has(processId)) {
      this.activeProcesses.delete(processId);
      this.stats.processesEnded++;
    }
  }

  registerListener(listenerId, cleanupFn) {
    this.registeredListeners.set(listenerId, cleanupFn);
    this.stats.listenersRegistered++;
  }

  cleanupListener(listenerId) {
    const cleanupFn = this.registeredListeners.get(listenerId);

    if (cleanupFn) {
      try {
        cleanupFn();
        this.registeredListeners.delete(listenerId);
        this.stats.listenersRemoved++;
      } catch (error) {
        console.error(`[MemoryManager] Erreur cleanup listener ${listenerId}:`, error);
      }
    }
  }

  cleanupAllListeners() {
    for (const [listenerId, cleanupFn] of this.registeredListeners) {
      try {
        cleanupFn();
        this.stats.listenersRemoved++;
      } catch (error) {
        console.error(`[MemoryManager] Erreur cleanup listener ${listenerId}:`, error);
      }
    }

    this.registeredListeners.clear();
  }

  addCleanupTask(cleanupTask) {
    this.cleanupTasks.add(cleanupTask);
  }

  async runCleanupTasks() {
    for (const task of this.cleanupTasks) {
      try {
        await task();
      } catch (error) {
        console.error('[MemoryManager] Erreur tâche cleanup:', error);
      }
    }
  }

  getMemoryStats() {
    const mem = process.memoryUsage();

    return {
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(mem.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      activeProcesses: this.activeProcesses.size,
      maxProcesses: this.config.maxConcurrentProcesses,
      registeredListeners: this.registeredListeners.size,
      stats: this.stats,
    };
  }

  async cleanup() {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }

    this.cleanupAllListeners();
    await this.runCleanupTasks();
    this.activeProcesses.clear();

    if (global.gc) global.gc();

    console.log('[MemoryManager] Nettoyage terminé');
  }
}

export const memoryManager = new MemoryManager();
