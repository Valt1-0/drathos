// drathos/src/renderer/src/utils/uninstallQueue.js
import logger from "../services/logger.js";

/**
 * Simple queue for pending uninstallations
 * Stores requests that will be executed when the server comes back online
 */
class UninstallQueue {
  constructor() {
    this.queue = [];
    this.listeners = new Map();
  }

  /**
   * Loads the queue from localStorage
   */
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

  /**
   * Saves the queue to localStorage
   */
  async saveQueue() {
    try {
      await window.store.set("uninstallQueue", this.queue);
      this.notifyListeners();
    } catch (error) {
      logger.error("[UninstallQueue] Error saving queue:", error);
    }
  }

  /**
   * Adds an uninstallation to the queue (without deleting files)
   */
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

  /**
   * Removes an uninstallation from the queue
   */
  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      logger.info("[UninstallQueue] Game removed from queue");
    }
  }

  /**
   * Checks if a game is pending
   */
  isPending(gameId) {
    return this.queue.some((item) => item.gameId === gameId);
  }

  /**
   * Retrieves all items in the queue
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Completely clears the queue
   */
  async clear() {
    this.queue = [];
    await this.saveQueue();
    logger.info("[UninstallQueue] Queue cleared");
  }

  /**
   * Adds a listener for changes
   */
  addListener(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    return id;
  }

  /**
   * Removes a listener
   */
  removeListener(id) {
    this.listeners.delete(id);
  }

  /**
   * Notifies all listeners
   */
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

// Instance singleton
const uninstallQueue = new UninstallQueue();

// Load the queue on startup
uninstallQueue.loadQueue();

export default uninstallQueue;
