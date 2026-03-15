/**
 * Local cache service for game images
 * Uses IndexedDB to store images as blobs
 */

const DB_NAME = 'gameCoversCache';
const DB_VERSION = 1;
const STORE_NAME = 'covers';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

class ImageCacheService {
  constructor() {
    this.db = null;
    this.isAvailable = false;
    this.initializationPromise = null;
    this.memoryCache = new Map(); // In-memory cache to avoid hitting IndexedDB every time
    this.initDB();
  }

  /**
   * Initializes the IndexedDB database
   */
  async initDB() {
    // Avoid multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve) => {
      // Check if IndexedDB is available
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

        // Create the store if it does not exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initializationPromise;
  }

  /**
   * Retrieves an image from the cache
   * @param {string} url - Image URL
   * @returns {Promise<string|null>} Blob URL of the image or null if not found/expired
   */
  async getImage(url) {
    // If IndexedDB is not available, return null
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

          // Check if the image exists and is not expired
          if (data && data.blob && data.timestamp) {
            const now = Date.now();
            const age = now - data.timestamp;

            if (age < CACHE_DURATION) {
              // Create a blob URL from the stored blob
              const blobUrl = URL.createObjectURL(data.blob);
              resolve(blobUrl);
            } else {
              // Image expired, delete it
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
   * Stores an image in the cache
   * @param {string} url - Image URL
   * @param {Blob} blob - Image blob
   * @returns {Promise<void>}
   */
  async setImage(url, blob) {
    // If IndexedDB is not available, do nothing
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
          resolve(); // Resolve anyway to avoid blocking
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
   * Removes an image from the cache
   * @param {string} url - URL of the image to remove
   * @returns {Promise<void>}
   */
  async deleteImage(url) {
    // Remove from the in-memory cache
    this.memoryCache.delete(url);

    // If IndexedDB is not available, do nothing
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
          resolve(); // Resolve anyway
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
   * Downloads and caches an image
   * @param {string} url - URL of the image to download
   * @returns {Promise<string>} Blob URL of the image
   */
  async fetchAndCache(url) {
    try {
      // 1. Check the in-memory cache first (instant)
      if (this.memoryCache.has(url)) {
        const cached = this.memoryCache.get(url);
        // Check that the blob URL is still valid
        if (cached && cached.blobUrl) {
          return cached.blobUrl;
        }
      }

      // 2. Check IndexedDB if available
      if (this.isAvailable) {
        const cachedUrl = await this.getImage(url);
        if (cachedUrl) {
          // Store in memory cache for next time
          this.memoryCache.set(url, { blobUrl: cachedUrl, timestamp: Date.now() });
          return cachedUrl;
        }
      }

      // 3. Download the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // 4. Store in IndexedDB (if available)
      if (this.isAvailable) {
        await this.setImage(url, blob);
      }

      // 5. Store in the in-memory cache
      this.memoryCache.set(url, { blobUrl, timestamp: Date.now() });

      return blobUrl;
    } catch (error) {
      console.warn('[ImageCache] Erreur lors du téléchargement:', error.message);
      // On error, return the original URL
      return url;
    }
  }

  /**
   * Removes expired images from the cache
   * @returns {Promise<number>} Number of images deleted
   */
  async cleanExpiredImages() {
    // If IndexedDB is not available, return 0
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
   * Completely clears the cache
   * @returns {Promise<void>}
   */
  async clearCache() {
    // Clear the in-memory cache
    this.memoryCache.clear();

    // If IndexedDB is not available, do nothing
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
   * Gets the current cache size
   * @returns {Promise<number>} Number of images in the cache
   */
  async getCacheSize() {
    // If IndexedDB is not available, return 0
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

// Create a single instance of the service
const imageCacheService = new ImageCacheService();

// Clean the cache on application startup (only if IndexedDB is available)
imageCacheService.initDB().then(() => {
  if (imageCacheService.isAvailable) {
    imageCacheService.cleanExpiredImages().catch(err => {
      console.warn('[ImageCache] Erreur lors du nettoyage initial:', err.message);
    });
  }
}).catch(() => {
  // Error already logged in initDB
});

export default imageCacheService;
