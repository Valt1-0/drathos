/**
 * Service de cache local pour les images de jeux
 * Utilise IndexedDB pour stocker les images en blob
 */

const DB_NAME = 'gameCoversCache';
const DB_VERSION = 1;
const STORE_NAME = 'covers';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

class ImageCacheService {
  constructor() {
    this.db = null;
    this.initDB();
  }

  /**
   * Initialise la base de données IndexedDB
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture de la base de données:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Créer le store s'il n'existe pas
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Récupère une image du cache
   * @param {string} url - URL de l'image
   * @returns {Promise<string|null>} URL blob de l'image ou null si non trouvée/expirée
   */
  async getImage(url) {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(url);

      request.onerror = () => {
        console.error('Erreur lors de la récupération de l\'image:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const data = request.result;

        // Vérifier si l'image existe et n'est pas expirée
        if (data && data.blob && data.timestamp) {
          const now = Date.now();
          const age = now - data.timestamp;

          if (age < CACHE_DURATION) {
            // Créer une URL blob depuis le blob stocké
            const blobUrl = URL.createObjectURL(data.blob);
            resolve(blobUrl);
          } else {
            // Image expirée, la supprimer
            this.deleteImage(url);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Stocke une image dans le cache
   * @param {string} url - URL de l'image
   * @param {Blob} blob - Blob de l'image
   * @returns {Promise<void>}
   */
  async setImage(url, blob) {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      const data = {
        url,
        blob,
        timestamp: Date.now()
      };

      const request = objectStore.put(data);

      request.onerror = () => {
        console.error('Erreur lors du stockage de l\'image:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Supprime une image du cache
   * @param {string} url - URL de l'image à supprimer
   * @returns {Promise<void>}
   */
  async deleteImage(url) {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(url);

      request.onerror = () => {
        console.error('Erreur lors de la suppression de l\'image:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Télécharge et met en cache une image
   * @param {string} url - URL de l'image à télécharger
   * @returns {Promise<string>} URL blob de l'image
   */
  async fetchAndCache(url) {
    try {
      // Vérifier d'abord si l'image est déjà dans le cache
      const cachedUrl = await this.getImage(url);
      if (cachedUrl) {
        return cachedUrl;
      }

      // Télécharger l'image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();

      // Stocker dans le cache
      await this.setImage(url, blob);

      // Retourner l'URL blob
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Erreur lors du téléchargement et du cache de l\'image:', error);
      // En cas d'erreur, retourner l'URL originale
      return url;
    }
  }

  /**
   * Nettoie les images expirées du cache
   * @returns {Promise<number>} Nombre d'images supprimées
   */
  async cleanExpiredImages() {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const index = objectStore.index('timestamp');
      const request = index.openCursor();

      let deletedCount = 0;
      const now = Date.now();

      request.onerror = () => {
        console.error('Erreur lors du nettoyage du cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const data = cursor.value;
          const age = now - data.timestamp;

          if (age >= CACHE_DURATION) {
            cursor.delete();
            deletedCount++;
          }

          cursor.continue();
        } else {
          console.log(`Cache nettoyé: ${deletedCount} image(s) expirée(s) supprimée(s)`);
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * Vide complètement le cache
   * @returns {Promise<void>}
   */
  async clearCache() {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onerror = () => {
        console.error('Erreur lors de la suppression du cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Cache d\'images vidé avec succès');
        resolve();
      };
    });
  }

  /**
   * Obtient la taille actuelle du cache
   * @returns {Promise<number>} Nombre d'images dans le cache
   */
  async getCacheSize() {
    if (!this.db) {
      await this.initDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.count();

      request.onerror = () => {
        console.error('Erreur lors du comptage du cache:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }
}

// Créer une instance unique du service
const imageCacheService = new ImageCacheService();

// Nettoyer le cache au démarrage de l'application
imageCacheService.cleanExpiredImages().catch(err => {
  console.error('Erreur lors du nettoyage initial du cache:', err);
});

export default imageCacheService;
