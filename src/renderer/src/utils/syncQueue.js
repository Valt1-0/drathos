// drathos/src/renderer/src/utils/syncQueue.js

import { syncStatsToServer, isServerOnline } from "../api/gameStats.js";

/**
 * Gestionnaire de queue pour les syncs ratées
 * Sauvegarde les syncs en attente et les retente automatiquement
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
   * Charge la queue depuis le localStorage
   */
  async loadQueue() {
    try {
      const savedQueue = await window.store.get("syncQueue");
      if (savedQueue && Array.isArray(savedQueue)) {
        this.queue = savedQueue;
        console.log(`[SyncQueue] ${this.queue.length} sync(s) en attente chargée(s)`);
      }
    } catch (error) {
      console.error("[SyncQueue] Erreur chargement queue:", error);
      this.queue = [];
    }
  }

  /**
   * Sauvegarde la queue dans le localStorage
   */
  async saveQueue() {
    try {
      await window.store.set("syncQueue", this.queue);
    } catch (error) {
      console.error("[SyncQueue] Erreur sauvegarde queue:", error);
    }
  }

  /**
   * Ajoute une sync à la queue
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

    console.log(`[SyncQueue] ➕ Sync ajoutée pour ${gameId} (queue: ${this.queue.length})`);

    // Tenter immédiatement la sync
    this.processQueue();
  }

  /**
   * Supprime une sync de la queue
   */
  async dequeue(gameId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((item) => item.gameId !== gameId);

    if (this.queue.length < initialLength) {
      await this.saveQueue();
      console.log(`[SyncQueue] ➖ Sync retirée pour ${gameId} (queue: ${this.queue.length})`);
    }
  }

  /**
   * Démarre le traitement automatique de la queue
   */
  startAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.retryInterval = setInterval(async () => {
      if (this.queue.length > 0 && !this.isProcessing) {
        console.log(`[SyncQueue] 🔄 Retry automatique (${this.queue.length} en attente)`);
        await this.processQueue();
      }
    }, this.RETRY_DELAY);

    console.log("[SyncQueue] ⏰ Auto-retry activé");
  }

  /**
   * Arrête le traitement automatique
   */
  stopAutoRetry() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
      console.log("[SyncQueue] ⏸️ Auto-retry désactivé");
    }
  }

  /**
   * Traite la queue de syncs
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Vérifier si le serveur est accessible
      const serverOnline = await isServerOnline();

      if (!serverOnline) {
        console.log("[SyncQueue] ⏭️ Serveur offline, skip pour le moment");
        this.isProcessing = false;
        return;
      }

      console.log(`[SyncQueue] 🔄 Traitement de ${this.queue.length} sync(s)...`);

      // Copie de la queue pour itération sécurisée
      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        try {
          // Vérifier le nombre de tentatives
          if (item.attempts >= this.MAX_RETRIES) {
            console.warn(
              `[SyncQueue] ⚠️ Sync ${item.gameId} abandonnée (max retries atteint)`
            );
            await this.dequeue(item.gameId);
            continue;
          }

          // Incrémenter les tentatives
          item.attempts += 1;
          item.lastAttempt = Date.now();

          // Tenter la sync
          await syncStatsToServer(item.gameId, item.localStats, item.sessionDuration);

          console.log(
            `[SyncQueue] ✅ Sync réussie pour ${item.gameId} (tentative ${item.attempts})`
          );

          // Retirer de la queue si succès
          await this.dequeue(item.gameId);
        } catch (error) {
          console.error(
            `[SyncQueue] ❌ Échec sync ${item.gameId} (tentative ${item.attempts}):`,
            error.message
          );

          // Mettre à jour la queue
          await this.saveQueue();
        }
      }
    } catch (error) {
      console.error("[SyncQueue] ❌ Erreur traitement queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Nettoie les syncs trop anciennes (> 7 jours)
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
      console.log(
        `[SyncQueue] 🧹 ${initialLength - this.queue.length} sync(s) obsolète(s) supprimée(s)`
      );
    }
  }

  /**
   * Récupère le statut de la queue
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
}

// Instance singleton
const syncQueue = new SyncQueue();

// Charger la queue au démarrage
syncQueue.loadQueue();

// Démarrer l'auto-retry
syncQueue.startAutoRetry();

// Nettoyer les vieilles syncs toutes les heures
setInterval(() => {
  syncQueue.cleanOldItems();
}, 60 * 60 * 1000);

export default syncQueue;
