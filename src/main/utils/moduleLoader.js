class ModuleLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
  }

  async loadModule(moduleName, importFn) {
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    const loadPromise = (async () => {
      try {
        const startTime = Date.now();
        const module = await importFn();
        const loadTime = Date.now() - startTime;

        console.log(`[ModuleLoader] ${moduleName} chargé en ${loadTime}ms`);
        this.loadedModules.set(moduleName, module);

        return module;
      } catch (error) {
        console.error(`[ModuleLoader] Erreur chargement ${moduleName}:`, error);
        throw error;
      } finally {
        this.loadingPromises.delete(moduleName);
      }
    })();

    this.loadingPromises.set(moduleName, loadPromise);
    return loadPromise;
  }

  unloadModule(moduleName) {
    if (this.loadedModules.has(moduleName)) {
      this.loadedModules.delete(moduleName);
      if (global.gc) global.gc();
    }
  }

  unloadAll() {
    this.loadedModules.clear();
    this.loadingPromises.clear();
    if (global.gc) global.gc();
  }

  getStats() {
    return {
      loadedModules: Array.from(this.loadedModules.keys()),
      loadingModules: Array.from(this.loadingPromises.keys()),
      totalLoaded: this.loadedModules.size,
      totalLoading: this.loadingPromises.size,
    };
  }
}

export const moduleLoader = new ModuleLoader();
