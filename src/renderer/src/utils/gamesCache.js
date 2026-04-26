// In-memory cache to avoid unnecessary refetches between navigations
let cache = {
  games: [],        // canonical list of all server games
  installedGames: [],
  lastFetch: 0,
};

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export const gamesCache = {
  get: () => cache,

  set: (data) => {
    // Accept either `games` or `serverGames` as the canonical list key
    const games = data.games ?? data.serverGames ?? cache.games;
    cache = {
      ...cache,
      games,
      installedGames: data.installedGames ?? cache.installedGames,
      lastFetch: Date.now(),
    };
  },

  isValid: () => cache.lastFetch > 0 && (Date.now() - cache.lastFetch) < CACHE_DURATION,

  invalidate: () => { cache.lastFetch = 0; },

  clear: () => {
    cache = { games: [], installedGames: [], lastFetch: 0 };
  },
};
