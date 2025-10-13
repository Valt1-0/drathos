// drathos/src/renderer/src/utils/uninstallQueue.js

/**
 * Queue simple pour les désinstallations en attente
 * Stocke les requêtes qui seront exécutées quand le serveur revient online
 */
class UninstallQueue {
  constructor() {
    this.queue = [];
    this.listeners = new Map();
  }

  /**
   * Charge la queue depuis le localStorage
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
   * Sauvegarde la queue dans le localStorage
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
   * Ajoute une désinstallation à la queue (sans supprimer les fichiers)
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
   * Supprime une désinstallation de la queue
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
   * Vérifie si un jeu est en attente
   */
  isPending(gameId) {
    return this.queue.some((item) => item.gameId === gameId);
  }

  /**
   * Récupère tous les items de la queue
   */
  getAll() {
    return [...this.queue];
  }

  /**
   * Vide complètement la queue
   */
  async clear() {
    this.queue = [];
    await this.saveQueue();
    console.log("[UninstallQueue] Queue vidée");
  }

  /**
   * Ajoute un listener pour les changements
   */
  addListener(callback) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    return id;
  }

  /**
   * Supprime un listener
   */
  removeListener(id) {
    this.listeners.delete(id);
  }

  /**
   * Notifie tous les listeners
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

// Charger la queue au démarrage
uninstallQueue.loadQueue();

export default uninstallQueue;
