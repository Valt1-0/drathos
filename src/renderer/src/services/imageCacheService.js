import logger from './logger.js';

const DB_NAME = 'gameCoversCache';
const MEMORY_CACHE_MAX = 300;
const DB_VERSION = 1;
const STORE_NAME = 'covers';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

class ImageCacheService {
  constructor() {
    this.db = null;
    this.isAvailable = false;
    this.initializationPromise = null;
    this.memoryCache = new Map();
    this.initDB();
  }

  async initDB() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        logger.warn('[ImageCache] IndexedDB non disponible dans cet environnement');
        this.isAvailable = false;
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.warn(`[ImageCache] IndexedDB non disponible: ${request.error?.message || 'Erreur inconnue'}`);
        this.isAvailable = false;
        this.db = null;
        resolve(null);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isAvailable = true;
        logger.info('[ImageCache] IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initializationPromise;
  }

  async getImage(url) {
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
          logger.warn(`[ImageCache] Retrieval error: ${request.error?.message}`);
          resolve(null);
        };

        request.onsuccess = () => {
          const data = request.result;

          if (data && data.blob && data.timestamp) {
            const now = Date.now();
            const age = now - data.timestamp;

            if (age < CACHE_DURATION) {
              const blobUrl = URL.createObjectURL(data.blob);
              resolve(blobUrl);
            } else {
              this.deleteImage(url).catch(() => {});
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de getImage: ${error.message}`);
      return null;
    }
  }

  async setImage(url, blob) {
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
          logger.warn(`[ImageCache] Erreur lors du stockage: ${request.error?.message}`);
          resolve();
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de setImage: ${error.message}`);
      return;
    }
  }

  async deleteImage(url) {
    const cached = this.memoryCache.get(url);
    if (cached?.blobUrl) URL.revokeObjectURL(cached.blobUrl);
    this.memoryCache.delete(url);

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
          logger.warn(`[ImageCache] Erreur lors de la suppression: ${request.error?.message}`);
          resolve();
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de deleteImage: ${error.message}`);
      return;
    }
  }

  async fetchAndCache(url) {
    try {
      if (this.memoryCache.has(url)) {
        const cached = this.memoryCache.get(url);
        if (cached && cached.blobUrl) {
          return cached.blobUrl;
        }
      }

      if (this.isAvailable) {
        const cachedUrl = await this.getImage(url);
        if (cachedUrl) {
          if (this.memoryCache.size >= MEMORY_CACHE_MAX) {
            const oldestKey = this.memoryCache.keys().next().value;
            const evicted = this.memoryCache.get(oldestKey);
            if (evicted?.blobUrl) URL.revokeObjectURL(evicted.blobUrl);
            this.memoryCache.delete(oldestKey);
          }
          this.memoryCache.set(url, { blobUrl: cachedUrl, timestamp: Date.now() });
          return cachedUrl;
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      if (this.isAvailable) {
        await this.setImage(url, blob);
      }

      if (this.memoryCache.size >= MEMORY_CACHE_MAX) {
        const oldestKey = this.memoryCache.keys().next().value;
        const evicted = this.memoryCache.get(oldestKey);
        if (evicted?.blobUrl) URL.revokeObjectURL(evicted.blobUrl);
        this.memoryCache.delete(oldestKey);
      }
      this.memoryCache.set(url, { blobUrl, timestamp: Date.now() });

      return blobUrl;
    } catch (error) {
      logger.warn(`[ImageCache] Download error: ${error.message}`);
      return url;
    }
  }

  async cleanExpiredImages() {
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
          logger.warn(`[ImageCache] Erreur lors du nettoyage: ${request.error?.message}`);
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
              logger.info(`[ImageCache] ${deletedCount} expired image(s) deleted`);
            }
            resolve(deletedCount);
          }
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de cleanExpiredImages: ${error.message}`);
      return 0;
    }
  }

  async clearCache() {
    this.memoryCache.clear();

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
          logger.warn(`[ImageCache] Erreur lors de la suppression: ${request.error?.message}`);
          resolve();
        };

        request.onsuccess = () => {
          logger.info('[ImageCache] Cache cleared successfully');
          resolve();
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de clearCache: ${error.message}`);
      return;
    }
  }

  async getCacheSize() {
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
          logger.warn(`[ImageCache] Erreur lors du comptage: ${request.error?.message}`);
          resolve(0);
        };

        request.onsuccess = () => {
          resolve(request.result);
        };
      });
    } catch (error) {
      logger.warn(`[ImageCache] Exception lors de getCacheSize: ${error.message}`);
      return 0;
    }
  }
}

const imageCacheService = new ImageCacheService();

imageCacheService.initDB().then(() => {
  if (imageCacheService.isAvailable) {
    imageCacheService.cleanExpiredImages().catch(err => {
      logger.warn(`[ImageCache] Erreur lors du nettoyage initial: ${err.message}`);
    });
  }
}).catch(() => {});

export default imageCacheService;
