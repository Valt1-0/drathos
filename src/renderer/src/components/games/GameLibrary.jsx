import { useMemo, useCallback, useState, useEffect, memo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiTrash2, FiPlus, FiLayers, FiDownload, FiWifiOff, FiPackage, FiFilter, FiList, FiGrid } from "react-icons/fi";
import GameCover from "../GameCover";
import { SearchBar } from "../ui";
import GameFilters from "./GameFilters";
import { useConnection } from "../../contexts/connectionContext";
import { storeGet } from "../../utils/storeClient";

// GameRow component extracted and memoized to optimize performance
const STATUS_DOTS = {
  backlog: 'bg-primary',
  inProgress: 'bg-warning',
  completed: 'bg-success',
  dropped: 'bg-red-400',
};

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
  isQueued,
  gameStats,
  userStatus,
  getGenresArray,
  onSelectGame,
  t
}) => {
  if (!game) return null;

  const installed = isInstalled(game._id);
  const playing = isGamePlaying(game._id);
  const downloading = isDownloading(game._id);
  const queued = isQueued(game._id);
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
          <div className="relative w-12 h-12 rounded-md shrink-0 overflow-hidden bg-linear-to-br from-surface to-background animate-pulse">
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

            {/* Badge queued */}
            {queued && !downloading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <FiList className="w-3 h-3" style={{ color: 'var(--app-accent)' }} />
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

            {/* User status badge */}
            {userStatus && STATUS_DOTS[userStatus] && (
              <div className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full ${STATUS_DOTS[userStatus]}`} />
            )}
          </div>

          {/* Game info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate text-sm mb-0.5 ${
              isSelected ? "text-text" : "text-text"
            }`}>
              {game.name}
              {(versionCount && versionCount > 1) && (
                <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded bg-accent/20 border border-accent/30 align-middle -mt-0.5">
                  <FiLayers className="w-2.5 h-2.5 text-accent" />
                  <span className="text-[10px] font-bold text-accent leading-none">
                    {versionCount}
                  </span>
                </span>
              )}
            </h3>

            {/* Status */}
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

              {queued && !downloading && (
                <div className="flex items-center gap-1" style={{ color: 'var(--app-accent)' }}>
                  <FiList className="w-2.5 h-2.5" />
                  <span>{t('downloads.stageQueued')}</span>
                </div>
              )}

              {uninstalling && !downloading && !queued && (
                <div className="flex items-center gap-1 text-warning">
                  <FiTrash2 className="w-2.5 h-2.5" />
                  <span>{t('games.removing')}</span>
                </div>
              )}

              {pending && !uninstalling && !downloading && !queued && (
                <div className="flex items-center gap-1 text-warning">
                  <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('games.pending')}</span>
                </div>
              )}

              {!stats && !installed && !uninstalling && !pending && !downloading && !queued && gameGenres.length > 0 && (
                <span className="text-text-secondary truncate">{gameGenres[0]}</span>
              )}
            </div>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l"></div>
          )}
        </div>
      </div>
    </div>
  );
});

GameRow.displayName = 'GameRow';

const GameCard = memo(({
  game,
  versionCount,
  isSelected,
  isInstalled,
  isGamePlaying,
  isGameUninstalling,
  isPendingUninstall,
  isDownloading,
  isQueued,
  gameStats,
  userStatus,
  onSelectGame,
  t,
}) => {
  if (!game) return null;

  const installed = isInstalled(game._id);
  const playing = isGamePlaying(game._id);
  const downloading = isDownloading(game._id);
  const queued = isQueued(game._id);
  const uninstalling = isGameUninstalling(game._id);
  const pending = isPendingUninstall(game._id);
  const stats = gameStats[game._id];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={game.name}
      aria-selected={isSelected}
      onClick={() => onSelectGame(game)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGame(game); } }}
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 select-none ${
        isSelected
          ? 'ring-2 ring-primary shadow-lg scale-[1.02]'
          : 'hover:ring-2 hover:ring-primary/40 hover:scale-[1.02]'
      }`}
      style={isSelected ? { boxShadow: '0 4px 20px rgba(var(--app-primary-rgb, 59,130,246), 0.25)' } : {}}
    >
      <div className="aspect-2/3 relative bg-surface">
        <GameCover
          src={game.coverUrl}
          alt={game.name}
          className="w-full h-full object-cover"
          size="medium"
        />

        {/* Status badges — top right */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {playing && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-white font-semibold leading-none">{t('games.playing')}</span>
            </div>
          )}
          {downloading && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
              <FiDownload className="w-2.5 h-2.5 text-primary animate-bounce" />
              <span className="text-[10px] text-white font-semibold leading-none">{t('downloads.stageDownloading')}</span>
            </div>
          )}
          {queued && !downloading && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
              <FiList className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] text-white font-semibold leading-none">{t('downloads.stageQueued')}</span>
            </div>
          )}
          {(uninstalling || pending) && !downloading && !queued && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
              <FiTrash2 className="w-2.5 h-2.5 text-warning" />
            </div>
          )}
          {versionCount > 1 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
              <FiLayers className="w-2.5 h-2.5 text-accent" />
              <span className="text-[10px] text-accent font-bold leading-none">{versionCount}</span>
            </div>
          )}
        </div>

        {/* Installed dot — top left */}
        {installed && !playing && (
          <div
            className="absolute top-2 left-2 w-2 h-2 rounded-full bg-success"
            style={{ boxShadow: '0 0 6px var(--app-success)' }}
          />
        )}

        {/* User status dot */}
        {userStatus && STATUS_DOTS[userStatus] && !installed && (
          <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${STATUS_DOTS[userStatus]}`} />
        )}

        {/* Bottom gradient with title + playtime */}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/55 to-transparent pt-10 pb-3 px-3">
          <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{game.name}</h3>
          {stats?.totalPlayTime && stats.totalPlayTime !== '< 1 minute' && !stats.totalPlayTime.includes('NaN') && (
            <div className="flex items-center gap-1 mt-1">
              <FiClock className="w-3 h-3 text-white/50 shrink-0" />
              <span className="text-white/50 text-xs">{stats.totalPlayTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GameCard.displayName = 'GameCard';

const GameRowSkeleton = ({ style }) => (
  <div style={style} className="px-3 py-0.5">
    <div className="rounded-md p-2 flex items-center gap-2.5">
      <div className="w-12 h-12 rounded-md shrink-0 bg-surface animate-pulse" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-2.5 bg-surface rounded-full animate-pulse w-3/4" />
        <div className="h-2 bg-surface rounded-full animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

const GameCardSkeleton = ({ columnIndex, rowIndex, style }) => (
  <div style={style} className={`pb-3 ${columnIndex === 0 ? 'pl-4' : 'pl-0'} pr-3`}>
    <div className="w-full aspect-2/3 rounded-xl bg-surface animate-pulse" />
  </div>
);

const LibraryEmptyState = ({ isOnline, hasGames, hasActiveFilters, onResetFilters, t }) => {
  if (hasActiveFilters) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 ring-1 ring-primary/20">
          <FiFilter className="text-lg text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{t('games.noGamesFound')}</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t('games.noGamesFilterMessage')}</p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors ring-1 ring-primary/20"
          >
            {t('games.resetFilters')}
          </button>
        )}
      </div>
    );
  }

  if (!isOnline && !hasGames) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-warning/10 ring-1 ring-warning/20">
          <FiWifiOff className="text-lg text-warning" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{t('games.offlineNoCache')}</p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t('games.offlineNoCacheDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-surface ring-1 ring-border">
        <FiPackage className="text-lg text-text-secondary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{t('games.emptyLibrary')}</p>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t('games.emptyLibraryDesc')}</p>
      </div>
    </div>
  );
};

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
  queue = [],
  gameStats,
  gameStatuses = {},
  user,
  onAddGame,
  getGenresArray,
  expanded = false,
  onToggleExpanded,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { isOnline } = useConnection();
  const [rawStats, setRawStats] = useState({});

  // Load raw stats (seconds) for playtime filtering
  useEffect(() => {
    const loadRawStats = async () => {
      const cached = await storeGet("installedGamesCache", {});
      const stats = {};
      Object.entries(cached).forEach(([gameId, data]) => {
        if (data.stats) {
          stats[gameId] = data.stats.totalPlayTime || 0;
        }
      });
      setRawStats(stats);
    };
    loadRawStats();
  }, [installedGames]); // re-load when installed games list changes

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
      if (debouncedSearchTerm && !game.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) {
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

      // User status
      if (filters.userStatusFilter && filters.userStatusFilter !== 'all') {
        if ((gameStatuses?.[game._id] || null) !== filters.userStatusFilter) return false;
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
  }, [uniqueGames, gamesByIgdbId, debouncedSearchTerm, filters, rawStats, isInstalled, getGenresArray, gameStatuses]);

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
    if (filters.userStatusFilter && filters.userStatusFilter !== 'all') count++;
    return count;
  }, [filters]);

  const downloadingIds = useMemo(() => new Set(activeDownloads.map(dl => dl.gameId)), [activeDownloads]);
  const queuedIds = useMemo(() => new Set(queue.map(g => g._id)), [queue]);

  const isGamePlaying = useCallback((gameId) => playingGames.has(gameId), [playingGames]);
  const isGameUninstalling = useCallback((gameId) => uninstallingGames.has(gameId), [uninstallingGames]);
  const isPendingUninstall = useCallback((gameId) => pendingUninstalls.has(gameId), [pendingUninstalls]);
  const isDownloading = useCallback((gameId) => downloadingIds.has(gameId), [downloadingIds]);
  const isQueued = useCallback((gameId) => queuedIds.has(gameId), [queuedIds]);

  const resetFilters = useCallback(() => {
    onFiltersChange({
      sortBy: 'name-asc', statusFilter: 'all', selectedGenres: [],
      showOnlyMultiplayer: false, playtimeRange: 'all', userStatusFilter: 'all',
    });
  }, [onFiltersChange]);


  const sharedCardProps = {
    isInstalled,
    isGamePlaying,
    isGameUninstalling,
    isPendingUninstall,
    isDownloading,
    isQueued,
    gameStats,
    onSelectGame,
    t,
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-background flex flex-col"
      style={expanded
        ? { flex: 1, minWidth: 0 }
        : { width: 224, flexShrink: 0, borderRight: '1px solid var(--app-border)' }
      }
    >
      {/* Header */}
      <motion.div layout="position" className="shrink-0" style={{ borderBottom: '1px solid var(--app-border)' }}>
        {/* Title row — always visible */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <motion.h1 layout="position" className="text-lg font-bold text-text shrink-0">
            {t('nav.library')}
          </motion.h1>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <motion.button
              layout
              onClick={onToggleExpanded}
              title={expanded ? t('games.compactView') : t('games.expandedView')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors duration-150"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={expanded ? 'list' : 'grid'}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {expanded ? <FiList className="text-base" /> : <FiGrid className="text-base" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Compact mode controls */}
        <AnimatePresence>
          {!expanded && (
            <motion.div
              key="compact-controls"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18 } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              className="px-4 pb-4 space-y-2"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded mode toolbar */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="toolbar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.18, delay: 0.05 } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              className="px-4 pb-3"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-64 shrink-0">
                  <SearchBar
                    placeholder={t('games.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <GameFilters
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  allGenres={allGenres}
                  activeFilterCount={activeFilterCount}
                  variant="toolbar"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Game list / grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-background">
        {!loading && filteredGames.length === 0 ? (
          <LibraryEmptyState
            isOnline={isOnline}
            hasGames={games.length > 0}
            hasActiveFilters={activeFilterCount > 0 || debouncedSearchTerm.length > 0}
            onResetFilters={resetFilters}
            t={t}
          />
        ) : expanded ? (
          <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {loading
              ? Array.from({ length: 16 }, (_, i) => <div key={i} className="aspect-2/3 rounded-xl bg-surface animate-pulse" />)
              : filteredGames.map((game) => {
                  const key = game.igdbId || game._id;
                  return (
                    <GameCard
                      key={game._id}
                      game={game}
                      versionCount={versionCounts.get(key) || 1}
                      isSelected={selectedGameId === game._id}
                      userStatus={gameStatuses?.[game._id] || null}
                      {...sharedCardProps}
                    />
                  );
                })
            }
          </div>
        ) : (
          <div>
            {loading
              ? Array.from({ length: 12 }, (_, i) => <GameRowSkeleton key={i} />)
              : filteredGames.map((game) => {
                  const key = game.igdbId || game._id;
                  return (
                    <GameRow
                      key={game._id}
                      game={game}
                      versionCount={versionCounts.get(key) || 1}
                      style={undefined}
                      isSelected={selectedGameId === game._id}
                      isInstalled={isInstalled}
                      isGamePlaying={isGamePlaying}
                      isGameUninstalling={isGameUninstalling}
                      isPendingUninstall={isPendingUninstall}
                      isDownloading={isDownloading}
                      isQueued={isQueued}
                      gameStats={gameStats}
                      userStatus={gameStatuses?.[game._id] || null}
                      getGenresArray={getGenresArray}
                      onSelectGame={onSelectGame}
                      t={t}
                    />
                  );
                })
            }
          </div>
        )}
      </div>

      {/* Footer */}
      <motion.div layout="position" className="shrink-0 px-4 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--app-border)' }}>
        <div className="flex items-center gap-3 flex-1 text-sm min-w-0">
          <span className="text-text-secondary truncate">{t('games.gamesCount', { count: filteredGames.length })}</span>
          <span className="w-px h-3 bg-border shrink-0" />
          <span className="text-success font-medium truncate">{t('games.installedCount', { count: installedGames.length })}</span>
        </div>

        {user?.role === "admin" && isOnline && (
          <motion.button
            layout
            onClick={onAddGame}
            title={!expanded ? t('games.addGame') : undefined}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
            className="shrink-0 flex items-center gap-1.5 bg-background-secondary hover:bg-surface text-text rounded-lg text-sm font-medium group overflow-hidden"
            style={{ border: '1px solid var(--app-border)', padding: expanded ? '0.375rem 0.75rem' : '0.375rem' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--app-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--app-border)'; }}
          >
            <FiPlus className="text-sm shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {t('games.addGame')}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default memo(GameLibrary);
