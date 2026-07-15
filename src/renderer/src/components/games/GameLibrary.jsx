import { useMemo, useCallback, useState, useEffect, memo } from "react";
import { List } from "react-window";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiTrash2,
  FiPlus,
  FiLayers,
  FiDownload,
  FiWifiOff,
  FiPackage,
  FiFilter,
  FiList,
  FiGrid,
  FiPlay,
  FiSquare,
  FiFolder,
  FiStar,
  FiX,
} from "react-icons/fi";
import GameCover from "../GameCover";
import { SearchBar } from "../ui";
import GameFilters from "./GameFilters";
import { useConnection } from "../../contexts/connectionContext";
import { useGames } from "../../contexts/gamesContext";
import { storeGet } from "../../utils/storeClient";

const highlightText = (text, term) => {
  if (!term?.trim()) return text;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-primary font-semibold">
        {text.slice(i, i + term.length)}
      </span>
      {text.slice(i + term.length)}
    </>
  );
};

const GameContextMenu = ({
  menu,
  onClose,
  onLaunch,
  onStop,
  onInstall,
  onOpenFolder,
  onUninstall,
  t,
}) => {
  useEffect(() => {
    if (!menu) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const onScroll = () => onClose();
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;
  const { game, x, y, installed, playing, downloading, queued } = menu;

  const items = [];
  if (!downloading && !queued) {
    if (installed) {
      items.push(
        playing
          ? {
              icon: FiSquare,
              label: t("games.stop"),
              color: "text-warning",
              onClick: () => {
                onStop?.(game);
                onClose();
              },
            }
          : {
              icon: FiPlay,
              label: t("games.playNow"),
              color: "text-success",
              onClick: () => {
                onLaunch?.(game);
                onClose();
              },
            },
      );
    } else {
      items.push({
        icon: FiDownload,
        label: t("games.installGame"),
        color: "text-primary",
        onClick: () => {
          onInstall?.(game);
          onClose();
        },
      });
    }
  }
  if (installed) {
    items.push({
      icon: FiFolder,
      label: t("games.folder"),
      onClick: () => {
        onOpenFolder?.(game);
        onClose();
      },
    });
    items.push({ sep: true });
    items.push({
      icon: FiTrash2,
      label: t("games.uninstall"),
      color: "text-error",
      onClick: () => {
        onUninstall?.(game);
        onClose();
      },
    });
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-200" onClick={onClose} />
      <div
        className="fixed z-201 bg-surface border border-border rounded-xl shadow-2xl py-1.5 min-w-44 overflow-hidden"
        style={{ left: x, top: y }}
      >
        {items.map((item, i) =>
          item.sep ? (
            <div key={i} className="h-px bg-border mx-2 my-1" />
          ) : (
            <button
              key={i}
              onClick={item.onClick}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors hover:bg-primary/8 ${item.color || "text-text-secondary"}`}
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              {item.label}
            </button>
          ),
        )}
      </div>
    </>,
    document.body,
  );
};

// GameRow component extracted and memoized to optimize performance
const STATUS_DOTS = {
  backlog: "bg-primary",
  inProgress: "bg-warning",
  completed: "bg-success",
  dropped: "bg-red-400",
};

const GameRow = memo(
  ({
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
    openContextMenu,
    searchTerm,
    t,
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
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectGame(game);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            openContextMenu?.(
              game,
              e.clientX,
              e.clientY,
              installed,
              playing,
              downloading,
              queued,
            );
          }}
          className={`group relative cursor-pointer transition-all duration-200 rounded-md p-2 ${
            isSelected
              ? "bg-primary/10 ring-1 ring-primary/50"
              : "hover:bg-surface/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative w-12 h-12 rounded-md shrink-0 overflow-hidden bg-linear-to-br from-surface to-background animate-pulse">
              <GameCover
                src={game.coverUrl}
                alt={game.name}
                className="w-full h-full object-cover"
                size="thumb"
              />
              {downloading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <FiDownload
                    className="w-3 h-3 animate-bounce"
                    style={{ color: "var(--app-primary)" }}
                  />
                </div>
              )}
              {queued && !downloading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <FiList
                    className="w-3 h-3"
                    style={{ color: "var(--app-accent)" }}
                  />
                </div>
              )}
              {playing && !downloading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--app-success)" }}
                  />
                </div>
              )}
              {installed && !playing && !downloading && (
                <div
                  className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--app-success)" }}
                />
              )}
              {userStatus && STATUS_DOTS[userStatus] && (
                <div
                  className={`absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full ${STATUS_DOTS[userStatus]}`}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate text-sm mb-0.5 text-text">
                {highlightText(game.name, searchTerm)}
                {versionCount && versionCount > 1 && (
                  <span className="inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded bg-accent/20 border border-accent/30 align-middle -mt-0.5">
                    <FiLayers className="w-2.5 h-2.5 text-accent" />
                    <span className="text-[10px] font-bold text-accent leading-none">
                      {versionCount}
                    </span>
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                {stats &&
                  stats.totalPlayTime &&
                  stats.totalPlayTime !== "< 1 minute" &&
                  !stats.totalPlayTime.includes("NaN") && (
                    <div className="flex items-center gap-1 text-text-secondary">
                      <FiClock className="w-2.5 h-2.5" />
                      <span>{stats.totalPlayTime}</span>
                    </div>
                  )}
                {downloading && (
                  <div className="flex items-center gap-1 text-primary">
                    <FiDownload className="w-2.5 h-2.5" />
                    <span>{t("downloads.stageDownloading")}</span>
                  </div>
                )}
                {queued && !downloading && (
                  <div
                    className="flex items-center gap-1"
                    style={{ color: "var(--app-accent)" }}
                  >
                    <FiList className="w-2.5 h-2.5" />
                    <span>{t("downloads.stageQueued")}</span>
                  </div>
                )}
                {uninstalling && !downloading && !queued && (
                  <div className="flex items-center gap-1 text-warning">
                    <FiTrash2 className="w-2.5 h-2.5" />
                    <span>{t("games.removing")}</span>
                  </div>
                )}
                {pending && !uninstalling && !downloading && !queued && (
                  <div className="flex items-center gap-1 text-warning">
                    <svg
                      className="w-2.5 h-2.5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>{t("games.pending")}</span>
                  </div>
                )}
                {!stats &&
                  !installed &&
                  !uninstalling &&
                  !pending &&
                  !downloading &&
                  !queued &&
                  gameGenres.length > 0 && (
                    <span className="text-text-secondary truncate">
                      {gameGenres[0]}
                    </span>
                  )}
              </div>
            </div>

            {isSelected && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r"></div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

GameRow.displayName = "GameRow";

const GameCard = memo(
  ({
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
    getGenresArray,
    onSelectGame,
    openContextMenu,
    onLaunch,
    onStop,
    onInstall,
    onOpenFolder,
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
    const genres = getGenresArray?.(game) ?? [];
    const year = game.releaseDate
      ? new Date(game.releaseDate).getFullYear()
      : null;
    const rawRating =
      game.rating > 0
        ? game.rating
        : game.aggregatedRating > 0
          ? game.aggregatedRating
          : 0;
    const displayRating =
      rawRating > 0
        ? (rawRating > 10 ? rawRating / 10 : rawRating).toFixed(1)
        : null;

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={game.name}
        aria-selected={isSelected}
        onClick={() => onSelectGame(game)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelectGame(game);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openContextMenu?.(
            game,
            e.clientX,
            e.clientY,
            installed,
            playing,
            downloading,
            queued,
          );
        }}
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 select-none ${
          isSelected
            ? "ring-2 ring-primary shadow-lg scale-[1.02]"
            : "hover:ring-2 hover:ring-primary/40 hover:scale-[1.02]"
        }`}
        style={
          isSelected
            ? {
                boxShadow:
                  "0 4px 20px color-mix(in srgb, var(--app-primary) 25%, transparent)",
              }
            : {}
        }
      >
        <div className="aspect-2/3 relative bg-surface">
          <GameCover
            src={game.coverUrl}
            alt={game.name}
            className="w-full h-full object-cover"
            size="medium"
          />

          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {playing && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-white font-semibold leading-none">
                  {t("games.playing")}
                </span>
              </div>
            )}
            {downloading && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
                <FiDownload className="w-2.5 h-2.5 text-primary animate-bounce" />
                <span className="text-[10px] text-white font-semibold leading-none">
                  {t("downloads.stageDownloading")}
                </span>
              </div>
            )}
            {queued && !downloading && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm">
                <FiList className="w-2.5 h-2.5 text-accent" />
                <span className="text-[10px] text-white font-semibold leading-none">
                  {t("downloads.stageQueued")}
                </span>
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
                <span className="text-[10px] text-accent font-bold leading-none">
                  {versionCount}
                </span>
              </div>
            )}
          </div>

          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {displayRating && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                <FiStar className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-[10px] text-white font-bold leading-none">
                  {displayRating}
                </span>
              </div>
            )}
            {installed && !playing && (
              <div
                className="w-2 h-2 rounded-full bg-success"
                style={{ boxShadow: "0 0 6px var(--app-success)" }}
              />
            )}
            {userStatus && STATUS_DOTS[userStatus] && !installed && (
              <div
                className={`w-2 h-2 rounded-full ${STATUS_DOTS[userStatus]}`}
              />
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/95 via-black/55 to-transparent pt-10 pb-3 px-3 group-hover:opacity-0 transition-opacity duration-150">
            <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">
              {game.name}
            </h3>
            {stats?.totalPlayTime &&
              stats.totalPlayTime !== "< 1 minute" &&
              !stats.totalPlayTime.includes("NaN") && (
                <div className="flex items-center gap-1 mt-1">
                  <FiClock className="w-3 h-3 text-white/50 shrink-0" />
                  <span className="text-white/50 text-xs">
                    {stats.totalPlayTime}
                  </span>
                </div>
              )}
          </div>

          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out bg-linear-to-t from-black via-black/90 to-transparent pt-10 pb-3 px-2.5">
            <p className="text-white font-bold text-xs leading-tight line-clamp-1 mb-2">
              {game.name}
            </p>
            {(genres[0] || year) && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {genres[0] && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 leading-none">
                    {genres[0]}
                  </span>
                )}
                {year && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 leading-none">
                    {year}
                  </span>
                )}
                {game.version && versionCount <= 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/70 leading-none">
                    v{game.version}
                  </span>
                )}
              </div>
            )}
            <div className="flex gap-1.5">
              {!downloading && !queued && !uninstalling && !pending && (
                <>
                  {installed ? (
                    playing ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStop?.(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-warning/25 text-warning text-[11px] font-semibold border border-warning/30 hover:bg-warning/35 transition-colors"
                      >
                        <FiSquare className="w-3 h-3 shrink-0" />
                        {t("games.stop")}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunch?.(game);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-success/25 text-success text-[11px] font-semibold border border-success/30 hover:bg-success/35 transition-colors"
                      >
                        <FiPlay className="w-3 h-3 shrink-0" />
                        {t("games.playNow")}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInstall?.(game);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/25 text-primary text-[11px] font-semibold border border-primary/30 hover:bg-primary/35 transition-colors"
                    >
                      <FiDownload className="w-3 h-3 shrink-0" />
                      {t("games.installGame")}
                    </button>
                  )}
                  {installed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFolder?.(game);
                      }}
                      className="w-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                    >
                      <FiFolder className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

GameCard.displayName = "GameCard";

const GameRowSkeleton = ({ style }) => (
  <div style={style} className="px-3 py-0.5">
    <div className="rounded-md p-2 flex items-center gap-2.5">
      <div className="w-14 h-14 rounded-md shrink-0 bg-surface animate-pulse" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-2.5 bg-surface rounded-full animate-pulse w-3/4" />
        <div className="h-2 bg-surface rounded-full animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

const COMPACT_ROW_HEIGHT = 76; // px — matches GameRow DOM structure (py-0.5 + p-2 + h-14)

// rowComponent for react-window v2 — receives (ariaAttributes, index, style, ...rowProps)
const VirtualRow = ({
  ariaAttributes: _aria,
  index,
  style,
  filteredGames,
  versionCounts,
  selectedGameId,
  gameStatuses,
  ...rowProps
}) => {
  const game = filteredGames[index];
  if (!game) return null;
  const key = game.igdbId || game._id;
  return (
    <GameRow
      game={game}
      versionCount={versionCounts.get(key) || 1}
      style={style}
      isSelected={selectedGameId === game._id}
      userStatus={gameStatuses?.[game._id] || null}
      {...rowProps}
    />
  );
};

const LibraryEmptyState = ({
  isOnline,
  hasGames,
  hasActiveFilters,
  onResetFilters,
  t,
}) => {
  if (hasActiveFilters) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-8 text-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 ring-1 ring-primary/20">
          <FiFilter className="text-lg text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-text">
            {t("games.noGamesFound")}
          </p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {t("games.noGamesFilterMessage")}
          </p>
        </div>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors ring-1 ring-primary/20"
          >
            {t("games.resetFilters")}
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
          <p className="text-sm font-semibold text-text">
            {t("games.offlineNoCache")}
          </p>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {t("games.offlineNoCacheDesc")}
          </p>
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
        <p className="text-sm font-semibold text-text">
          {t("games.emptyLibrary")}
        </p>
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {t("games.emptyLibraryDesc")}
        </p>
      </div>
    </div>
  );
};

const GameLibrary = () => {
  const {
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
    onLaunch,
    onStop,
    onInstall,
    onOpenFolder,
    onUninstall,
  } = useGames();
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

    games.forEach((game) => {
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

    return {
      uniqueGames: unique,
      versionCounts: counts,
      gamesByIgdbId: byIgdb,
    };
  }, [games]);

  const isInstalled = useCallback(
    (gameId) => installedGames.some((g) => g.serverGameId?._id === gameId),
    [installedGames],
  );

  const filteredGames = useMemo(() => {
    const filtered = uniqueGames.filter((game) => {
      // Search
      if (
        debouncedSearchTerm &&
        !game.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ) {
        return false;
      }

      // Status
      if (filters.statusFilter === "installed" && !isInstalled(game._id))
        return false;
      if (filters.statusFilter === "not-installed" && isInstalled(game._id))
        return false;

      // Genres (multi-select)
      if (filters.selectedGenres.length > 0) {
        const gameGenres = getGenresArray(game);
        if (!filters.selectedGenres.some((g) => gameGenres.includes(g)))
          return false;
      }

      // Multiplayer
      if (filters.showOnlyMultiplayer) {
        const key = game.igdbId || game._id;
        const versions = gamesByIgdbId.get(key) || [game];
        if (!versions.some((v) => v.multiplayer?.enabled)) return false;
      }

      // User status
      if (filters.userStatusFilter && filters.userStatusFilter !== "all") {
        if ((gameStatuses?.[game._id] || null) !== filters.userStatusFilter)
          return false;
      }

      // Playtime
      if (filters.playtimeRange !== "all") {
        const pt = rawStats[game._id] || 0;
        switch (filters.playtimeRange) {
          case "none":
            if (pt > 0) return false;
            break;
          case "under1h":
            if (pt <= 0 || pt >= 3600) return false;
            break;
          case "1to10h":
            if (pt < 3600 || pt >= 36000) return false;
            break;
          case "10to50h":
            if (pt < 36000 || pt >= 180000) return false;
            break;
          case "over50h":
            if (pt < 180000) return false;
            break;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "size":
          return (b.sizeMB || 0) - (a.sizeMB || 0);
        case "release-date":
          return new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0);
        case "playtime":
          return (rawStats[b._id] || 0) - (rawStats[a._id] || 0);
        case "recently-added":
          return b._id.localeCompare(a._id);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    uniqueGames,
    gamesByIgdbId,
    debouncedSearchTerm,
    filters,
    rawStats,
    isInstalled,
    getGenresArray,
    gameStatuses,
  ]);

  const allGenres = useMemo(() => {
    return [...new Set(games.flatMap((game) => getGenresArray(game)))];
  }, [games, getGenresArray]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sortBy !== "name-asc") count++;
    if (filters.statusFilter !== "all") count++;
    if (filters.selectedGenres.length > 0) count++;
    if (filters.showOnlyMultiplayer) count++;
    if (filters.playtimeRange !== "all") count++;
    if (filters.userStatusFilter && filters.userStatusFilter !== "all") count++;
    return count;
  }, [filters]);

  const downloadingIds = useMemo(
    () => new Set(activeDownloads.map((dl) => dl.gameId)),
    [activeDownloads],
  );
  const queuedIds = useMemo(() => new Set(queue.map((g) => g._id)), [queue]);

  const isGamePlaying = useCallback(
    (gameId) => playingGames.has(gameId),
    [playingGames],
  );
  const isGameUninstalling = useCallback(
    (gameId) => uninstallingGames.has(gameId),
    [uninstallingGames],
  );
  const isPendingUninstall = useCallback(
    (gameId) => pendingUninstalls.has(gameId),
    [pendingUninstalls],
  );
  const isDownloading = useCallback(
    (gameId) => downloadingIds.has(gameId),
    [downloadingIds],
  );
  const isQueued = useCallback((gameId) => queuedIds.has(gameId), [queuedIds]);

  const resetFilters = useCallback(() => {
    onFiltersChange({
      sortBy: "name-asc",
      statusFilter: "all",
      selectedGenres: [],
      showOnlyMultiplayer: false,
      playtimeRange: "all",
      userStatusFilter: "all",
    });
  }, [onFiltersChange]);

  const [contextMenu, setContextMenu] = useState(null);
  const openContextMenu = useCallback(
    (game, x, y, installed, playing, downloading, queued) => {
      setContextMenu({ game, x, y, installed, playing, downloading, queued });
    },
    [],
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const rowItemData = useMemo(
    () => ({
      filteredGames,
      versionCounts,
      selectedGameId,
      gameStatuses,
      isInstalled,
      isGamePlaying,
      isGameUninstalling,
      isPendingUninstall,
      isDownloading,
      isQueued,
      gameStats,
      getGenresArray,
      onSelectGame,
      openContextMenu,
      searchTerm: debouncedSearchTerm,
      t,
    }),
    [
      filteredGames,
      versionCounts,
      selectedGameId,
      gameStatuses,
      isInstalled,
      isGamePlaying,
      isGameUninstalling,
      isPendingUninstall,
      isDownloading,
      isQueued,
      gameStats,
      getGenresArray,
      onSelectGame,
      openContextMenu,
      debouncedSearchTerm,
      t,
    ],
  );

  const sharedCardProps = {
    isInstalled,
    isGamePlaying,
    isGameUninstalling,
    isPendingUninstall,
    isDownloading,
    isQueued,
    gameStats,
    getGenresArray,
    onSelectGame,
    openContextMenu,
    onLaunch,
    onStop,
    onInstall,
    onOpenFolder,
    t,
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-background flex flex-col"
      style={
        expanded
          ? { flex: 1, minWidth: 0 }
          : {
              width: 224,
              flexShrink: 0,
              borderRight: "1px solid var(--app-border)",
            }
      }
    >
      <motion.div
        layout="position"
        className="shrink-0"
        style={{ borderBottom: "1px solid var(--app-border)" }}
      >
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <motion.h1
            layout="position"
            className="text-lg font-bold text-text shrink-0"
          >
            {t("nav.library")}
          </motion.h1>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <motion.button
              layout
              onClick={onToggleExpanded}
              title={
                expanded ? t("games.compactView") : t("games.expandedView")
              }
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text hover:bg-surface transition-colors duration-150"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={expanded ? "list" : "grid"}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  className="block"
                >
                  {expanded ? (
                    <FiList className="text-base" />
                  ) : (
                    <FiGrid className="text-base" />
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {!isOnline && (
            <motion.div
              key="offline-banner"
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mx-4 mb-3 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
                <FiWifiOff className="w-3 h-3 text-warning shrink-0" />
                <span className="text-xs text-warning font-medium truncate">
                  {t("games.offlineMode")}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                placeholder={t("games.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                data-search-main="true"
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

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="toolbar"
              initial={{ opacity: 0, y: -6 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.18, delay: 0.05 },
              }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              className="px-4 pb-3"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-64 shrink-0">
                  <SearchBar
                    placeholder={t("games.searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="text-sm"
                    data-search-main="true"
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

      <div
        className={`flex-1 min-h-0 ${
          expanded
            ? "overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-background"
            : "overflow-hidden"
        }`}
      >
        {!loading && filteredGames.length === 0 ? (
          <LibraryEmptyState
            isOnline={isOnline}
            hasGames={games.length > 0}
            hasActiveFilters={
              activeFilterCount > 0 || debouncedSearchTerm.length > 0
            }
            onResetFilters={resetFilters}
            t={t}
          />
        ) : expanded ? (
          <div
            className="grid gap-3 p-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            }}
          >
            {loading
              ? Array.from({ length: 16 }, (_, i) => (
                  <div
                    key={i}
                    className="aspect-2/3 rounded-xl bg-surface animate-pulse relative overflow-hidden"
                  >
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-background/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
                      <div className="h-2.5 rounded-full bg-white/5 w-3/4" />
                      <div className="h-2 rounded-full bg-white/5 w-1/2" />
                    </div>
                  </div>
                ))
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
                })}
          </div>
        ) : loading ? (
          <div>
            {Array.from({ length: 12 }, (_, i) => (
              <GameRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <List
            rowCount={filteredGames.length}
            rowHeight={COMPACT_ROW_HEIGHT}
            rowComponent={VirtualRow}
            rowProps={rowItemData}
            overscanCount={5}
            style={{ height: "100%" }}
            className="scrollbar-thin scrollbar-thumb-surface scrollbar-track-background"
          />
        )}
      </div>

      <motion.div
        layout="position"
        className="shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ borderTop: "1px solid var(--app-border)" }}
      >
        <div className="flex items-center gap-3 flex-1 text-sm min-w-0">
          <span className="text-text-secondary truncate">
            {t("games.gamesCount", { count: filteredGames.length })}
          </span>
          <span className="w-px h-3 bg-border shrink-0" />
          <span className="text-success font-medium truncate">
            {t("games.installedCount", { count: installedGames.length })}
          </span>
        </div>

        {user?.role === "admin" && isOnline && (
          <motion.button
            layout
            onClick={onAddGame}
            title={!expanded ? t("games.addGame") : undefined}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } }}
            className="shrink-0 flex items-center gap-1.5 bg-background-secondary hover:bg-surface text-text rounded-lg text-sm font-medium group overflow-hidden"
            style={{
              border: "1px solid var(--app-border)",
              padding: expanded ? "0.375rem 0.75rem" : "0.375rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--app-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--app-border)";
            }}
          >
            <FiPlus className="text-sm shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {t("games.addGame")}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </motion.div>

      <GameContextMenu
        menu={contextMenu}
        onClose={closeContextMenu}
        onLaunch={onLaunch}
        onStop={onStop}
        onInstall={onInstall}
        onOpenFolder={onOpenFolder}
        onUninstall={onUninstall}
        t={t}
      />
    </motion.div>
  );
};

export default GameLibrary;
