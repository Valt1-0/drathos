// In-memory cache to avoid unnecessary refetches between navigations
let cache = {
  games: [],
  installedGames: [],
  serverGames: [],
  lastFetch: 0,
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const gamesCache = {
  get: () => cache,

  set: (data) => {
    // Sync games and serverGames
    if (data.games) data.serverGames = data.games;
    if (data.serverGames) data.games = data.serverGames;
    cache = { ...cache, ...data, lastFetch: Date.now() };
  },

  isValid: () => cache.lastFetch > 0 && (Date.now() - cache.lastFetch) < CACHE_DURATION,

  invalidate: () => { cache.lastFetch = 0; },

  clear: () => {
    cache = { games: [], installedGames: [], serverGames: [], lastFetch: 0 };
  },
};
