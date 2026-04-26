// drathos/src/renderer/src/utils/syncQueue.js

import { syncStatsToServer } from "../api/gameStats.js";
import logger from "../services/logger.js";

/**
 * Queue manager for failed syncs
 * Saves pending syncs and retries them automatically
 */
class SyncQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.retryInterval = null;
    this.RETRY_DELAY = 60000; // 1 minute
    this.MAX_RETRIES = 5;
  }

  /**
   * Loads the queue from localStorage
   */
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

  /**
   * Saves the queue to localStorage
   */
  async saveQueue() {
    try {
      await window.store.set("syncQueue", this.queue);
    } catch (error) {
      logger.error("[SyncQueue] Erreur sauvegarde queue:", error);
    }
  }

  /**
   * Adds a sync to the queue
   */
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

    // Notify listeners
    this.notifyListeners();

    // Attempt the sync immediately
    this.processQueue();
  }

  /**
   * Removes a sync from the queue
   */
  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      logger.info(`[SyncQueue] Sync removed for ${gameId} (queue: ${this.queue.length})`);

      // Notify listeners
      this.notifyListeners();
    }
  }

  /**
   * Starts automatic queue processing
   */
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

  /**
   * Stops automatic processing
   */
  stopAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      logger.info("[SyncQueue] Auto-retry disabled");
    }
  }

  /**
   * Processes the sync queue
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      logger.info(`[SyncQueue] Traitement de ${this.queue.length} sync(s)...`);

      // Copy of the queue for safe iteration
      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        try {
          // Check the number of attempts
          if (item.attempts >= this.MAX_RETRIES) {
            logger.warn(`[SyncQueue] Sync ${item.gameId} abandoned (max retries reached)`);
            await this.dequeue(item.gameId);
            continue;
          }

          // Increment attempts
          item.attempts += 1;
          item.lastAttempt = Date.now();

          // Attempt the sync
          await syncStatsToServer(item.gameId, item.localStats, item.sessionDuration);

          logger.info(`[SyncQueue] Sync successful for ${item.gameId} (attempt ${item.attempts})`);

          // Remove from queue if successful
          await this.dequeue(item.gameId);
        } catch (error) {
          logger.error(`[SyncQueue] Échec sync ${item.gameId} (tentative ${item.attempts}): ${error.message}`);

          // Update the queue
          await this.saveQueue();
        }
      }
    } catch (error) {
      logger.error("[SyncQueue] Erreur traitement queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Removes syncs that are too old (> 7 days)
   */
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

  /**
   * Retrieves the queue status
   */
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

  /**
   * Retrieves the number of pending syncs
   */
  getPendingCount() {
    return this.queue.length;
  }

  /**
   * Adds a listener for queue changes
   */
  addListener(callback) {
    if (!this.listeners) {
      this.listeners = [];
    }
    this.listeners.push(callback);
    return this.listeners.length - 1;
  }

  /**
   * Removes a listener
   */
  removeListener(id) {
    if (this.listeners && this.listeners[id]) {
      this.listeners[id] = null;
    }
  }

  /**
   * Notifies listeners of a change
   */
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

// Instance singleton
const syncQueue = new SyncQueue();

// Load the queue on startup
syncQueue.loadQueue();

// Start auto-retry
syncQueue.startAutoRetry();

// Clean old syncs every hour
setInterval(() => {
  syncQueue.cleanOldItems();
}, 60 * 60 * 1000);

export default syncQueue;
