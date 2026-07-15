import logger from "../services/logger.js";

// Holds uninstall requests made while offline; run when the server is back.
class UninstallQueue {
  constructor() {
    this.queue = [];
    this.listeners = new Map();
  }

  async loadQueue() {
    try {
      const savedQueue = await window.store.get("uninstallQueue");
      if (savedQueue && Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        logger.info(`[UninstallQueue] ${this.queue.length} pending uninstall(s) loaded`);
        this.notifyListeners();
      }
    } catch (error) {
      logger.error("[UninstallQueue] Error loading queue:", error);
      this.queue = [];
    }
  }

  async saveQueue() {
    try {
      await window.store.set("uninstallQueue", this.queue);
      this.notifyListeners();
    } catch (error) {
      logger.error("[UninstallQueue] Error saving queue:", error);
    }
  }

  async enqueue(gameId, gameName, gamePath) {
    const existing = this.queue.find((item) => item.gameId === gameId);
    if (existing) {
      logger.info(`[UninstallQueue] ${gameName} is already queued`);
      return;
    }

    const uninstallItem = {
      gameId,
      gameName,
      gamePath,
      createdAt: Date.now(),
    };

    this.queue.push(uninstallItem);
    await this.saveQueue();

    logger.info(`[UninstallQueue] ${gameName} added to queue`);
  }

  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      logger.info("[UninstallQueue] Game removed from queue");
    }
  }

  isPending(gameId) {
    return this.queue.some((item) => item.gameId === gameId);
  }

  getAll() {
    return [...this.queue];
  }

  async clear() {
    this.queue = [];
    await this.saveQueue();
    logger.info("[UninstallQueue] Queue cleared");
  }

  addListener(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    return id;
  }

  removeListener(id) {
    this.listeners.delete(id);
  }

  notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.queue);
      } catch (error) {
        logger.error("[UninstallQueue] Listener error:", error);
      }
    });
  }
}

const uninstallQueue = new UninstallQueue();

uninstallQueue.loadQueue();

export default uninstallQueue;
