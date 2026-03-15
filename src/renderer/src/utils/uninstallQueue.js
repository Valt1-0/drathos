// drathos/src/renderer/src/utils/uninstallQueue.js

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
        console.log(`[UninstallQueue] ${this.queue.length} désinstallation(s) en attente chargée(s)`);
        this.notifyListeners();
      }
    } catch (error) {
      console.error("[UninstallQueue] Erreur chargement queue:", error);
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
      console.error("[UninstallQueue] Erreur sauvegarde queue:", error);
    }
  }

  /**
   * Adds an uninstallation to the queue (without deleting files)
   */
  async enqueue(gameId, gameName, gamePath) {
    const existing = this.queue.find((item) => item.gameId === gameId);
    if (existing) {
      console.log(`[UninstallQueue] ${gameName} est déjà en queue`);
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

    console.log(`[UninstallQueue] ➕ ${gameName} ajouté à la queue`);
  }

  /**
   * Removes an uninstallation from the queue
   */
  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      console.log(`[UninstallQueue] ➖ Jeu retiré de la queue`);
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
    console.log("[UninstallQueue] Queue vidée");
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
        console.error("[UninstallQueue] Erreur listener:", error);
      }
    });
  }
}

// Instance singleton
const uninstallQueue = new UninstallQueue();

// Load the queue on startup
uninstallQueue.loadQueue();

export default uninstallQueue;
