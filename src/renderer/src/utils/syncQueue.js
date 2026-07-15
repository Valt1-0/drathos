import { syncStatsToServer } from "../api/gameStats.js";
import logger from "../services/logger.js";

// Persists stat syncs that failed (server offline) and retries them on a timer.
class SyncQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.retryInterval = null;
    this.RETRY_DELAY = 60000;
    this.MAX_RETRIES = 5;
  }

  async loadQueue() {
    try {
      const savedQueue = await window.store.get("syncQueue");
      if (savedQueue && Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        logger.info(`[SyncQueue] ${this.queue.length} pending sync(s) loaded`);
      }
    } catch (error) {
      logger.error("[SyncQueue] Error loading queue:", error);
      this.queue = [];
    }
  }

  async saveQueue() {
    try {
      await window.store.set("syncQueue", this.queue);
    } catch (error) {
      logger.error("[SyncQueue] Erreur sauvegarde queue:", error);
    }
  }

  async enqueue(gameId, localStats, sessionDuration) {
    const syncItem = {
      gameId,
      localStats,
      sessionDuration,
      attempts: 0,
      createdAt: Date.now(),
      lastAttempt: null,
    };

    this.queue.push(syncItem);
    await this.saveQueue();

    logger.info(`[SyncQueue] Sync added for ${gameId} (queue: ${this.queue.length})`);

    this.notifyListeners();
    this.processQueue();
  }

  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      logger.info(`[SyncQueue] Sync removed for ${gameId} (queue: ${this.queue.length})`);

      this.notifyListeners();
    }
  }

  startAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(async () => {
      if (this.queue.length > 0 && !this.isProcessing) {
        logger.info(`[SyncQueue] Retry automatique (${this.queue.length} en attente)`);
        await this.processQueue();
      }
    }, this.RETRY_DELAY);

    logger.info("[SyncQueue] Auto-retry enabled");
  }

  stopAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      logger.info("[SyncQueue] Auto-retry disabled");
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      logger.info(`[SyncQueue] Traitement de ${this.queue.length} sync(s)...`);

      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        try {
          if (item.attempts >= this.MAX_RETRIES) {
            logger.warn(`[SyncQueue] Sync ${item.gameId} abandoned (max retries reached)`);
            await this.dequeue(item.gameId);
            continue;
          }

          item.attempts += 1;
          item.lastAttempt = Date.now();

          await syncStatsToServer(item.gameId, item.localStats, item.sessionDuration);

          logger.info(`[SyncQueue] Sync successful for ${item.gameId} (attempt ${item.attempts})`);

          await this.dequeue(item.gameId);
        } catch (error) {
          logger.error(`[SyncQueue] Échec sync ${item.gameId} (tentative ${item.attempts}): ${error.message}`);

          await this.saveQueue();
        }
      }
    } catch (error) {
      logger.error("[SyncQueue] Erreur traitement queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  async cleanOldItems() {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const initialLength = this.queue.length;

    this.queue = this.queue.filter((item) => {
      return now - item.createdAt < SEVEN_DAYS;
    });

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      logger.info(`[SyncQueue] ${initialLength - this.queue.length} stale sync(s) removed`);
    }
  }

  getStatus() {
    return {
      pending: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue.map((item) => ({
        gameId: item.gameId,
        attempts: item.attempts,
        age: Date.now() - item.createdAt,
      })),
    };
  }

  getPendingCount() {
    return this.queue.length;
  }

  addListener(callback) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push(callback);
    return this.listeners.length - 1;
  }

  removeListener(id) {
    if (this.listeners && this.listeners[id]) {
      this.listeners[id] = null;
    }
  }

  notifyListeners() {
    if (this.listeners) {
      this.listeners.forEach((callback) => {
        if (callback) {
          callback(this.getPendingCount());
        }
      });
    }
  }
}

const syncQueue = new SyncQueue();

syncQueue.loadQueue();
syncQueue.startAutoRetry();

setInterval(() => {
  syncQueue.cleanOldItems();
}, 60 * 60 * 1000);

export default syncQueue;
