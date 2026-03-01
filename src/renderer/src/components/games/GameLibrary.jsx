import React, { useMemo, useCallback, useState, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { FiClock, FiTrash2, FiPlus, FiLayers, FiDownload } from "react-icons/fi";
import GameCover from "../GameCover";
import { SearchBar } from "../ui";
import GameFilters from "./GameFilters";

// Composant GameRow extrait et mémorisé pour optimiser les performances
const GameRow = memo(({
  game,
  versionCount,
  style,
  isSelected,
  isInstalled,
  isGamePlaying,
  isGameUninstalling,
  isPendingUninstall,
  isDownloading,
  gameStats,
  getGenresArray,
  onSelectGame,
  t
}) => {
  if (!game) return null;

  const installed = isInstalled(game._id);
  const playing = isGamePlaying(game._id);
  const downloading = isDownloading(game._id);
  const stats = gameStats[game._id];
  const uninstalling = isGameUninstalling(game._id);
  const pending = isPendingUninstall(game._id);
  const gameGenres = getGenresArray(game);

  return (
    <div style={style} className="px-3 py-0.5">
      <div
        role="button"
        tabIndex={0}
        aria-label={game.name}
        aria-selected={isSelected}
        onClick={() => onSelectGame(game)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGame(game); } }}
        className={`group relative cursor-pointer transition-all duration-200 rounded-md p-2 ${
          isSelected
            ? "bg-primary/10 ring-1 ring-primary/50"
            : "hover:bg-surface/60"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {/* Cover compact */}
          <div className="relative w-12 h-12 bg-surface rounded-md flex-shrink-0 overflow-hidden">
            <GameCover
              src={game.coverUrl}
              alt={game.name}
              className="w-full h-full object-cover"
              size="thumb"
            />

            {/* Badge downloading */}
            {downloading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <FiDownload className="w-3 h-3 animate-bounce" style={{ color: 'var(--app-primary)' }} />
              </div>
            )}

            {/* Badge playing */}
            {playing && !downloading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--app-success)' }}></div>
              </div>
            )}

            {/* Badge installed */}
            {installed && !playing && !downloading && (
              <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--app-success)' }}></div>
            )}
          </div>

          {/* Info du jeu */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate text-sm mb-0.5 ${
              isSelected ? "text-text" : "text-text"
            }`}>
              {game.name}
              {(versionCount && versionCount > 1) && (
                <span className="inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 rounded bg-accent/20 border border-accent/30 align-middle">
                  <FiLayers className="w-2.5 h-2.5 text-accent" />
                  <span className="text-[10px] font-bold text-accent leading-none">
                    {versionCount}
                  </span>
                </span>
              )}
            </h3>

            {/* Statut */}
            <div className="flex items-center gap-1.5 text-xs">
              {stats && stats.totalPlayTime && stats.totalPlayTime !== "< 1 minute" && !stats.totalPlayTime.includes("NaN") && (
                <div className="flex items-center gap-1 text-text-secondary">
                  <FiClock className="w-2.5 h-2.5" />
                  <span>{stats.totalPlayTime}</span>
                </div>
              )}

              {downloading && (
                <div className="flex items-center gap-1 text-primary">
                  <FiDownload className="w-2.5 h-2.5" />
                  <span>{t('downloads.stageDownloading')}</span>
                </div>
              )}

              {uninstalling && !downloading && (
                <div className="flex items-center gap-1 text-warning">
                  <FiTrash2 className="w-2.5 h-2.5" />
                  <span>{t('games.removing')}</span>
                </div>
              )}

              {pending && !uninstalling && !downloading && (
                <div className="flex items-center gap-1 text-warning">
                  <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('games.pending')}</span>
                </div>
              )}

              {!stats && !installed && !uninstalling && !pending && !downloading && gameGenres.length > 0 && (
                <span className="text-text-secondary truncate">{gameGenres[0]}</span>
              )}
            </div>
          </div>

          {/* Indicateur de sélection */}
          {isSelected && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l"></div>
          )}
        </div>
      </div>
    </div>
  );
});

GameRow.displayName = 'GameRow';

const GameLibrary = ({
  games,
  selectedGameId,
  onSelectGame,
  searchTerm,
  debouncedSearchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  installedGames,
  playingGames,
  uninstallingGames,
  pendingUninstalls,
  activeDownloads = [],
  gameStats,
  user,
  onAddGame,
  getGenresArray,
}) => {
  const { t } = useTranslation();
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
  const [FixedSizeList, setFixedSizeList] = useState(null);
  const [rawStats, setRawStats] = useState({});

  // Window resize + react-window loading
  useEffect(() => {
    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setWindowHeight(window.innerHeight), 100);
    };
    window.addEventListener('resize', onResize);

    import('react-window')
      .then((module) => setFixedSizeList(() => module.FixedSizeList))
      .catch((err) => console.warn('[GameLibrary] react-window fallback:', err));

    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Load raw stats (seconds) for playtime filtering
  useEffect(() => {
    const loadRawStats = async () => {
      const cached = await window.store.get("installedGamesCache", {});
      const stats = {};
      Object.entries(cached).forEach(([gameId, data]) => {
        if (data.stats) {
          stats[gameId] = data.stats.totalPlayTime || 0;
        }
      });
      setRawStats(stats);
    };
    loadRawStats();
  }, [gameStats]); // re-load when gameStats changes

  // Group and count versions
  const { uniqueGames, versionCounts, gamesByIgdbId } = useMemo(() => {
    const counts = new Map();
    const byIgdb = new Map();
    const seen = new Set();
    const unique = [];

    games.forEach(game => {
      const key = game.igdbId || game._id;

      // Count versions
      counts.set(key, (counts.get(key) || 0) + 1);

      // Group by igdbId
      if (!byIgdb.has(key)) {
        byIgdb.set(key, []);
      }
      byIgdb.get(key).push(game);

      // Keep only first occurrence for unique list
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(game);
      }
    });

    return { uniqueGames: unique, versionCounts: counts, gamesByIgdbId: byIgdb };
  }, [games]);

  const isInstalled = useCallback((gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId),
    [installedGames]
  );

  const filteredGames = useMemo(() => {
    const filtered = uniqueGames.filter((game) => {
      // Search
      if (debouncedSearchTerm && !game.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
        return false;
      }

      // Status
      if (filters.statusFilter === 'installed' && !isInstalled(game._id)) return false;
      if (filters.statusFilter === 'not-installed' && isInstalled(game._id)) return false;

      // Genres (multi-select)
      if (filters.selectedGenres.length > 0) {
        const gameGenres = getGenresArray(game);
        if (!filters.selectedGenres.some((g) => gameGenres.includes(g))) return false;
      }

      // Multiplayer
      if (filters.showOnlyMultiplayer) {
        const key = game.igdbId || game._id;
        const versions = gamesByIgdbId.get(key) || [game];
        if (!versions.some((v) => v.multiplayer?.enabled)) return false;
      }

      // Playtime
      if (filters.playtimeRange !== 'all') {
        const pt = rawStats[game._id] || 0;
        switch (filters.playtimeRange) {
          case 'none': if (pt > 0) return false; break;
          case 'under1h': if (pt <= 0 || pt >= 3600) return false; break;
          case '1to10h': if (pt < 3600 || pt >= 36000) return false; break;
          case '10to50h': if (pt < 36000 || pt >= 180000) return false; break;
          case 'over50h': if (pt < 180000) return false; break;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'size':
          return (b.sizeMB || 0) - (a.sizeMB || 0);
        case 'release-date':
          return new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0);
        case 'playtime':
          return (rawStats[b._id] || 0) - (rawStats[a._id] || 0);
        case 'recently-added':
          return b._id.localeCompare(a._id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [uniqueGames, gamesByIgdbId, debouncedSearchTerm, filters, rawStats, isInstalled, getGenresArray]);

  const allGenres = useMemo(() => {
    return [...new Set(games.flatMap((game) => getGenresArray(game)))];
  }, [games, getGenresArray]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sortBy !== 'name-asc') count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.selectedGenres.length > 0) count++;
    if (filters.showOnlyMultiplayer) count++;
    if (filters.playtimeRange !== 'all') count++;
    return count;
  }, [filters]);

  const isGamePlaying = useCallback((gameId) => playingGames.has(gameId), [playingGames]);
  const isGameUninstalling = useCallback((gameId) => uninstallingGames.has(gameId), [uninstallingGames]);
  const isPendingUninstall = useCallback((gameId) => pendingUninstalls.has(gameId), [pendingUninstalls]);
  const isDownloading = useCallback((gameId) =>
    activeDownloads.some(dl => dl.gameId === gameId),
    [activeDownloads]
  );

  // Wrapper pour GameRow pour react-window (extrait les données de l'index)
  const VirtualGameRow = useCallback(({ index, style }) => {
    const game = filteredGames[index];
    const key = game.igdbId || game._id;
    const count = versionCounts.get(key) || 1;

    return (
      <GameRow
        game={game}
        versionCount={count}
        style={style}
        isSelected={selectedGameId === game._id}
        isInstalled={isInstalled}
        isGamePlaying={isGamePlaying}
        isGameUninstalling={isGameUninstalling}
        isPendingUninstall={isPendingUninstall}
        isDownloading={isDownloading}
        gameStats={gameStats}
        getGenresArray={getGenresArray}
        onSelectGame={onSelectGame}
        t={t}
      />
    );
  }, [filteredGames, versionCounts, selectedGameId, isInstalled, isGamePlaying, isGameUninstalling, isPendingUninstall, isDownloading, gameStats, getGenresArray, onSelectGame, t]);

  return (
    <div className="w-56 xl:w-64 bg-background flex flex-col" style={{ borderRight: '1px solid var(--app-border)' }}>
      <div className="p-3 xl:p-4 space-y-3">
        <h1 className="text-lg xl:text-xl font-bold text-text">{t('nav.library')}</h1>

        <SearchBar
          placeholder={t('games.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm"
        />

        <GameFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          allGenres={allGenres}
          activeFilterCount={activeFilterCount}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {filteredGames.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 text-center">
            <div className="text-text-secondary">
              <p className="text-sm mb-1">{t('games.noGamesFound')}</p>
              <p className="text-xs">{t('games.noGamesMessage')}</p>
            </div>
          </div>
        ) : FixedSizeList ? (
          <FixedSizeList
            height={windowHeight - (user?.role === "admin" ? 460 : 400)}
            itemCount={filteredGames.length}
            itemSize={64}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-surface scrollbar-track-background"
          >
            {VirtualGameRow}
          </FixedSizeList>
        ) : (
          <div
            className="overflow-y-auto py-2"
            style={{
              height: user?.role === "admin" ? `calc(100vh - 460px)` : `calc(100vh - 400px)`
            }}
          >
            {/* Fallback: limit to 30 items to avoid DOM explosion */}
            {filteredGames.slice(0, 30).map((game) => {
              const key = game.igdbId || game._id;
              const count = versionCounts.get(key) || 1;

              return (
                <GameRow
                  key={game._id}
                  game={game}
                  versionCount={count}
                  style={{}}
                  isSelected={selectedGameId === game._id}
                  isInstalled={isInstalled}
                  isGamePlaying={isGamePlaying}
                  isGameUninstalling={isGameUninstalling}
                  isPendingUninstall={isPendingUninstall}
                  isDownloading={isDownloading}
                  gameStats={gameStats}
                  getGenresArray={getGenresArray}
                  onSelectGame={onSelectGame}
                  t={t}
                />
              );
            })}
            {filteredGames.length > 30 && (
              <div className="text-center py-4 text-text-secondary text-sm">
                +{filteredGames.length - 30} {t('games.more')}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--app-border)' }}>
        {user?.role === "admin" && (
          <button
            onClick={onAddGame}
            className="w-full px-4 py-2.5 bg-background-secondary hover:bg-surface text-text rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 group"
            style={{
              border: '1px solid var(--app-border)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--app-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--app-border)';
            }}
          >
            <FiPlus className="text-base group-hover:rotate-90 transition-transform duration-300" />
            {t('games.addGame')}
          </button>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">{t('games.gamesCount', { count: games.length })}</span>
          <span className="text-success font-medium">
            {t('games.installedCount', { count: installedGames.length })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameLibrary;
