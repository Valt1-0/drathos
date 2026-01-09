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
    this.isAvailable = false;
    this.initializationPromise = null;
    this.memoryCache = new Map(); // Cache mémoire pour éviter IndexedDB à chaque fois
    this.initDB();
  }

  /**
   * Initialise la base de données IndexedDB
   */
  async initDB() {
    // Éviter les initialisations multiples
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve) => {
      // Vérifier si IndexedDB est disponible
      if (!window.indexedDB) {
        console.warn('[ImageCache] IndexedDB non disponible dans cet environnement');
        this.isAvailable = false;
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('[ImageCache] IndexedDB non disponible:', request.error?.message || 'Erreur inconnue');
        console.warn('[ImageCache] Les images seront chargées directement sans cache');
        this.isAvailable = false;
        this.db = null;
        resolve(null);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isAvailable = true;
        console.log('[ImageCache] IndexedDB initialisé avec succès');
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

    return this.initializationPromise;
  }

  /**
   * Récupère une image du cache
   * @param {string} url - URL de l'image
   * @returns {Promise<string|null>} URL blob de l'image ou null si non trouvée/expirée
   */
  async getImage(url) {
    // Si IndexedDB n'est pas disponible, retourner null
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return null;
      }
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.get(url);

        request.onerror = () => {
          console.warn('[ImageCache] Erreur lors de la récupération:', request.error?.message);
          resolve(null);
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
              this.deleteImage(url).catch(() => {});
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de getImage:', error.message);
      return null;
    }
  }

  /**
   * Stocke une image dans le cache
   * @param {string} url - URL de l'image
   * @param {Blob} blob - Blob de l'image
   * @returns {Promise<void>}
   */
  async setImage(url, blob) {
    // Si IndexedDB n'est pas disponible, ne rien faire
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return;
      }
    }

    try {
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
          console.warn('[ImageCache] Erreur lors du stockage:', request.error?.message);
          resolve(); // Résoudre quand même pour ne pas bloquer
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de setImage:', error.message);
      return;
    }
  }

  /**
   * Supprime une image du cache
   * @param {string} url - URL de l'image à supprimer
   * @returns {Promise<void>}
   */
  async deleteImage(url) {
    // Supprimer du cache mémoire
    this.memoryCache.delete(url);

    // Si IndexedDB n'est pas disponible, ne rien faire
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return;
      }
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(url);

        request.onerror = () => {
          console.warn('[ImageCache] Erreur lors de la suppression:', request.error?.message);
          resolve(); // Résoudre quand même
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de deleteImage:', error.message);
      return;
    }
  }

  /**
   * Télécharge et met en cache une image
   * @param {string} url - URL de l'image à télécharger
   * @returns {Promise<string>} URL blob de l'image
   */
  async fetchAndCache(url) {
    try {
      // 1. Vérifier d'abord le cache mémoire (instantané)
      if (this.memoryCache.has(url)) {
        const cached = this.memoryCache.get(url);
        // Vérifier que l'URL blob est toujours valide
        if (cached && cached.blobUrl) {
          return cached.blobUrl;
        }
      }

      // 2. Vérifier IndexedDB si disponible
      if (this.isAvailable) {
        const cachedUrl = await this.getImage(url);
        if (cachedUrl) {
          // Mettre en cache mémoire pour la prochaine fois
          this.memoryCache.set(url, { blobUrl: cachedUrl, timestamp: Date.now() });
          return cachedUrl;
        }
      }

      // 3. Télécharger l'image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // 4. Stocker dans IndexedDB (si disponible)
      if (this.isAvailable) {
        await this.setImage(url, blob);
      }

      // 5. Stocker dans le cache mémoire
      this.memoryCache.set(url, { blobUrl, timestamp: Date.now() });

      return blobUrl;
    } catch (error) {
      console.warn('[ImageCache] Erreur lors du téléchargement:', error.message);
      // En cas d'erreur, retourner l'URL originale
      return url;
    }
  }

  /**
   * Nettoie les images expirées du cache
   * @returns {Promise<number>} Nombre d'images supprimées
   */
  async cleanExpiredImages() {
    // Si IndexedDB n'est pas disponible, retourner 0
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return 0;
      }
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const index = objectStore.index('timestamp');
        const request = index.openCursor();

        let deletedCount = 0;
        const now = Date.now();

        request.onerror = () => {
          console.warn('[ImageCache] Erreur lors du nettoyage:', request.error?.message);
          resolve(0);
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
            if (deletedCount > 0) {
              console.log(`[ImageCache] ${deletedCount} image(s) expirée(s) supprimée(s)`);
            }
            resolve(deletedCount);
          }
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de cleanExpiredImages:', error.message);
      return 0;
    }
  }

  /**
   * Vide complètement le cache
   * @returns {Promise<void>}
   */
  async clearCache() {
    // Vider le cache mémoire
    this.memoryCache.clear();

    // Si IndexedDB n'est pas disponible, ne rien faire
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return;
      }
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onerror = () => {
          console.warn('[ImageCache] Erreur lors de la suppression:', request.error?.message);
          resolve();
        };

        request.onsuccess = () => {
          console.log('[ImageCache] Cache vidé avec succès');
          resolve();
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de clearCache:', error.message);
      return;
    }
  }

  /**
   * Obtient la taille actuelle du cache
   * @returns {Promise<number>} Nombre d'images dans le cache
   */
  async getCacheSize() {
    // Si IndexedDB n'est pas disponible, retourner 0
    if (!this.isAvailable) {
      await this.initDB();
      if (!this.isAvailable) {
        return 0;
      }
    }

    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.count();

        request.onerror = () => {
          console.warn('[ImageCache] Erreur lors du comptage:', request.error?.message);
          resolve(0);
        };

        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    } catch (error) {
      console.warn('[ImageCache] Exception lors de getCacheSize:', error.message);
      return 0;
    }
  }
}

// Créer une instance unique du service
const imageCacheService = new ImageCacheService();

// Nettoyer le cache au démarrage de l'application (uniquement si IndexedDB est disponible)
imageCacheService.initDB().then(() => {
  if (imageCacheService.isAvailable) {
    imageCacheService.cleanExpiredImages().catch(err => {
      console.warn('[ImageCache] Erreur lors du nettoyage initial:', err.message);
    });
  }
}).catch(() => {
  // Erreur déjà loggée dans initDB
});

export default imageCacheService;
