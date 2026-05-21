import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import logger from "../services/logger";
import { motion } from "framer-motion";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { gamesCache } from "../utils/gamesCache";
import { useGamesLoader } from "../hooks/useGamesLoader";
import uninstallQueue from "../utils/uninstallQueue";
import {
  useActiveDownloads,
  useDownloadQueue,
} from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../contexts/themeContext";
import gameManager from "../services/gameManager";
import { useGameStats } from "../hooks/games/useGameStats";
import { useGameModals } from "../hooks/games/useGameModals";
import useGameStatuses from "../hooks/games/useGameStatuses";
import { useGamesActionHandlers } from "../hooks/games/useGamesActionHandlers";
import { useDebounce } from "../hooks/useDebounce";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import { GamesContext } from "../contexts/gamesContext";
import GameLibrary from "../components/games/GameLibrary";
import GameDetails from "../components/games/GameDetails";
import { toast } from "sonner";

import UninstallModal from "../components/modals/UninstallModal";
import InstallPathModal from "../components/modals/InstallPathModal";
import DeleteGameModal from "../components/modals/DeleteGameModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import AddGameModal from "../components/modals/AddGameModal";
import WineRequiredModal from "../components/modals/WineRequiredModal";

const Games = () => {
  const { t } = useTranslation();
  const { isLight, getTextClass } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useConnection();
  const { user } = useAuth();

  const {
    games,
    setGames,
    installedGames,
    setInstalledGames,
    loading: gamesLoading,
    error: gamesError,
    reload: reloadGames,
  } = useGamesLoader();

  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const defaultFilters = {
    sortBy: "name-asc",
    statusFilter: "all",
    selectedGenres: [],
    showOnlyMultiplayer: false,
    playtimeRange: "all",
    userStatusFilter: "all",
  };
  const [filters, setFilters] = useState(defaultFilters);
  const [libraryExpanded, setLibraryExpanded] = useState(false);

  useEffect(() => {
    const loadFilters = async () => {
      const saved = await window.store.get("gameFilters");
      if (saved) setFilters((prev) => ({ ...prev, ...saved }));
      const expanded = await window.store.get("libraryExpanded");
      if (expanded) setLibraryExpanded(true);
    };
    loadFilters();
  }, []);

  useEffect(() => {
    window.store.set("gameFilters", filters);
  }, [filters]);

  const handleToggleLibraryExpanded = useCallback(() => {
    setLibraryExpanded((prev) => {
      window.store.set("libraryExpanded", !prev);
      return !prev;
    });
  }, []);

  const loading = gamesLoading;
  const error = gamesError;
  const [gameSize, setGameSize] = useState(null);
  const [playingGames, setPlayingGames] = useState(new Set());
  const [uninstalling, setUninstalling] = useState(new Set());
  const [pendingUninstalls, setPendingUninstalls] = useState(new Set());

  const watchdogTimersRef = useRef(new Set());
  const gameSizeCacheRef = useRef(new Map());
  useEffect(() => () => watchdogTimersRef.current.forEach(clearTimeout), []);

  const { gameStats, updateSessionStats } = useGameStats();
  const { gameStatuses, setStatus } = useGameStatuses();
  const modals = useGameModals();
  const activeDownloads = useActiveDownloads();
  const { enqueueGame, queue } = useDownloadQueue();

  const extractGenreName = useCallback(
    (genre) => {
      if (!genre) return t("games.unknown");
      if (typeof genre === "string") return genre;
      return genre.name || genre.slug || genre.id || t("games.unknown");
    },
    [t],
  );

  const extractPlatformName = useCallback(
    (platform) => {
      if (!platform) return t("games.unknown");
      if (typeof platform === "string") return platform;
      return platform.name || platform.slug || platform.id || t("games.unknown");
    },
    [t],
  );

  const getGenresArray = useCallback(
    (game) => {
      if (!game?.genres || !Array.isArray(game.genres)) return [];
      return game.genres.map(extractGenreName);
    },
    [extractGenreName],
  );

  const getPlatformsArray = useCallback(
    (game) => {
      if (!game?.platforms || !Array.isArray(game.platforms)) return ["PC"];
      return game.platforms.map(extractPlatformName);
    },
    [extractPlatformName],
  );

  useEffect(() => {
    if (!games.length || selectedGame) return;
    setSelectedGame(games[0]);
  }, [games, selectedGame]);

  useEffect(() => {
    if (!games.length) return;
    gameManager
      .getActiveGames()
      .then((activeGames) => setPlayingGames(new Set(activeGames.map((g) => g.gameId))))
      .catch(() => {});
  }, [games]);

  useEffect(() => {
    const gameId = location.state?.selectGameId;
    if (!gameId || !games.length) return;
    const game = games.find((g) => g._id === gameId);
    if (game) {
      setSelectedGame(game);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.selectGameId, games, navigate]);

  useEffect(() => {
    const handleQueueChange = (queueItems) => {
      setPendingUninstalls(new Set(queueItems.map((item) => item.gameId)));
    };
    const listenerId = uninstallQueue.addListener(handleQueueChange);
    handleQueueChange(uninstallQueue.getAll());
    return () => uninstallQueue.removeListener(listenerId);
  }, []);

  useEffect(() => {
    const processUninstallQueue = async () => {
      if (!isOnline) return;
      const pending = uninstallQueue.getAll();
      if (pending.length === 0) return;

      for (const item of pending) {
        try {
          setUninstalling((prev) => new Set([...prev, item.gameId]));
          const result = await gameManager.uninstallGame(item.gameId, item.gamePath, item.gameName);
          if (result.success) await uninstallQueue.dequeue(item.gameId);
          setUninstalling((prev) => {
            const next = new Set(prev);
            next.delete(item.gameId);
            return next;
          });
        } catch (error) {
          logger.error("[Games] Uninstall error:", error);
          toast.error(t("errors.uninstallFailed"), {
            description: `${t("games.installErrorDesc", { name: item.gameName, error: error.message })}`,
          });
          setUninstalling((prev) => {
            const next = new Set(prev);
            next.delete(item.gameId);
            return next;
          });
        }
      }

      try {
        gamesCache.invalidate();
        const installed = await getInstalledGames();
        setInstalledGames(installed);
        gamesCache.set({ installedGames: installed });
      } catch (err) {
        logger.warn("[Games] Refresh error:", err);
      }
    };
    processUninstallQueue();
  }, [isOnline]);

  useEffect(() => {
    const handleGameStatusChange = (status) => {
      setPlayingGames((prev) => {
        const next = new Set(prev);
        if (status.status === "running") {
          next.add(status.gameId);
        } else if (status.status === "stopped" || status.status === "failed") {
          next.delete(status.gameId);
        }
        return next;
      });

      if (status.sessionDuration) {
        updateSessionStats(status.gameId, status.sessionDuration);
      }
    };

    const handleUninstallProgress = async (progress) => {
      if (progress.stage === "uninstalled") {
        if (progress.pendingSync || progress.offlineMode) {
          const installedData = installedGames.find(
            (g) => g.serverGameId?._id === progress.id,
          );
          if (installedData) {
            await uninstallQueue.enqueue(
              progress.id,
              installedData.serverGameId?.name || "Unknown Game",
            );
          }
        }

        gameSizeCacheRef.current.clear();
        gamesCache.invalidate();
        getInstalledGames()
          .then((installed) => {
            setInstalledGames(installed);
            gamesCache.set({ installedGames: installed });
          })
          .catch((err) => logger.warn("Could not refresh installed games:", err));

        setUninstalling((prev) => {
          const next = new Set(prev);
          next.delete(progress.id);
          return next;
        });
      } else if (progress.stage === "failed") {
        setUninstalling((prev) => {
          const next = new Set(prev);
          next.delete(progress.id);
          return next;
        });
      }
    };

    gameManager.addStatusListener("*", handleGameStatusChange);
    gameManager.addUninstallListener("*", handleUninstallProgress);
    return () => {
      gameManager.removeStatusListener("*", handleGameStatusChange);
      gameManager.removeUninstallListener("*", handleUninstallProgress);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGameSize(null);

    const loadGameSize = async () => {
      if (!selectedGame || !isInstalled(selectedGame._id)) return;
      const installedData = getInstalledGameData(selectedGame._id);
      if (!installedData) return;

      const cached = gameSizeCacheRef.current.get(installedData.path);
      if (cached) { setGameSize(cached); return; }

      const sizeResult = await gameManager.getGameSize(installedData.path);
      if (!cancelled) {
        const value = sizeResult.success ? sizeResult : null;
        if (value) gameSizeCacheRef.current.set(installedData.path, value);
        setGameSize(value);
      }
    };

    loadGameSize();
    return () => { cancelled = true; };
  }, [selectedGame, installedGames]);

  const isInstalled = useCallback(
    (gameId) => installedGames.some((g) => g.serverGameId?._id === gameId),
    [installedGames],
  );

  const getInstalledGameData = useCallback(
    (gameId) => installedGames.find((g) => g.serverGameId?._id === gameId),
    [installedGames],
  );

  const isGamePlaying = useCallback((gameId) => playingGames.has(gameId), [playingGames]);
  const isGameUninstalling = useCallback((gameId) => uninstalling.has(gameId), [uninstalling]);
  const isPendingUninstall = useCallback((gameId) => pendingUninstalls.has(gameId), [pendingUninstalls]);
  const isGameDownloading = useCallback(
    (gameId) => activeDownloads.some((dl) => dl.gameId === gameId),
    [activeDownloads],
  );
  const isGameQueued = useCallback(
    (gameId) => queue.some((g) => g._id === gameId),
    [queue],
  );

  const {
    handleLaunchGame,
    handleStopGame,
    handleForceStopGame,
    handleInstallGame,
    handleInstallPathConfirm,
    handleUninstallGame,
    confirmUninstall,
    openGameFolder,
    createShortcut,
    confirmDeleteGame,
    handleAddGameSuccess,
  } = useGamesActionHandlers({
    setGames,
    installedGames,
    setInstalledGames,
    selectedGame,
    setSelectedGame,
    setPlayingGames,
    setUninstalling,
    gameSizeCacheRef,
    watchdogTimersRef,
    isInstalled,
    getInstalledGameData,
    isPendingUninstall,
    isGameDownloading,
    isGameQueued,
    enqueueGame,
    modals,
    user,
  });

  const keyboardShortcuts = useMemo(
    () => ({
      enter: () => {
        if (!selectedGame || isGameDownloading(selectedGame._id) || isGameQueued(selectedGame._id)) return;
        if (isInstalled(selectedGame._id) && !isGamePlaying(selectedGame._id)) {
          handleLaunchGame(selectedGame);
        } else if (!isInstalled(selectedGame._id)) {
          handleInstallGame(selectedGame);
        }
      },
      escape: () => {
        if (modals.uninstallModal.isOpen) modals.uninstallModal.close();
        if (modals.installPathModal.isOpen) modals.installPathModal.close();
        if (modals.deleteGameModal.isOpen) modals.deleteGameModal.close();
        if (modals.wineModal.isOpen) modals.wineModal.close();
      },
      "ctrl+r": async () => {
        try {
          const updatedGames = await getAllServerGames();
          if (updatedGames !== null) {
            setGames(updatedGames);
            toast.success(t("games.gamesListRefreshed"), { id: "games-refreshed" });
          } else {
            toast.error(t("errors.refreshGames"));
          }
        } catch {
          toast.error(t("errors.refreshGames"));
        }
      },
      "ctrl+f": (e) => {
        const searchInput = document.querySelector('[data-search-main]');
        if (searchInput) { e.preventDefault(); searchInput.focus(); }
      },
    }),
    [
      selectedGame,
      isGameDownloading,
      isGameQueued,
      isInstalled,
      isGamePlaying,
      handleLaunchGame,
      handleInstallGame,
      modals,
      t,
    ],
  );

  const anyModalOpen =
    modals.uninstallModal.isOpen ||
    modals.installPathModal.isOpen ||
    modals.deleteGameModal.isOpen ||
    modals.confirmationModal.isOpen ||
    modals.addGameModal.isOpen ||
    modals.wineModal.isOpen;
  useKeyboardShortcuts(keyboardShortcuts, !anyModalOpen);

  const libraryStatusSets = useMemo(
    () => ({
      playingGames,
      uninstallingGames: uninstalling,
      pendingUninstalls,
      activeDownloads,
      queue,
    }),
    [playingGames, uninstalling, pendingUninstalls, activeDownloads, queue],
  );

  const selectedGameState = useMemo(() => {
    if (!selectedGame) return null;
    const id = selectedGame._id;
    return {
      isInstalled: isInstalled(id),
      isPlaying: isGamePlaying(id),
      isUninstalling: isGameUninstalling(id),
      isPending: isPendingUninstall(id),
      isQueued: isGameQueued(id),
      activeDownload: activeDownloads.find((dl) => dl.gameId === id) ?? null,
      gameStats: gameStats[id] ?? null,
      gameStatus: gameStatuses[id] ?? null,
    };
  }, [
    selectedGame,
    isInstalled,
    isGamePlaying,
    isGameUninstalling,
    isPendingUninstall,
    isGameQueued,
    activeDownloads,
    gameStats,
    gameStatuses,
  ]);

  const gameHandlers = useMemo(
    () => ({
      onLaunch: handleLaunchGame,
      onStop: handleStopGame,
      onForceStop: handleForceStopGame,
      onInstall: handleInstallGame,
      onUninstall: handleUninstallGame,
      onOpenFolder: openGameFolder,
      onCreateShortcut: createShortcut,
      onDeleteFromServer: (game) => {
        if (!user || user.role !== "admin") {
          toast.error(t("common.adminOnly"));
          return;
        }
        if (isInstalled(game._id)) {
          toast.error(t("games.deleteInstalledError"));
          return;
        }
        modals.deleteGameModal.open(game);
      },
      onSetStatus: setStatus,
    }),
    [
      handleLaunchGame,
      handleStopGame,
      handleForceStopGame,
      handleInstallGame,
      handleUninstallGame,
      openGameFolder,
      createShortcut,
      modals.deleteGameModal,
      user,
      isInstalled,
      setStatus,
      t,
    ],
  );

  const gamesCtxValue = useMemo(
    () => ({
      games,
      selectedGameId: selectedGame?._id ?? null,
      onSelectGame: setSelectedGame,
      searchTerm,
      debouncedSearchTerm,
      onSearchChange: setSearchTerm,
      filters,
      onFiltersChange: setFilters,
      installedGames,
      playingGames: libraryStatusSets.playingGames,
      uninstallingGames: libraryStatusSets.uninstallingGames,
      pendingUninstalls: libraryStatusSets.pendingUninstalls,
      activeDownloads: libraryStatusSets.activeDownloads,
      queue: libraryStatusSets.queue,
      gameStats,
      gameStatuses,
      user,
      onAddGame: modals.addGameModal.open,
      getGenresArray,
      expanded: libraryExpanded,
      onToggleExpanded: handleToggleLibraryExpanded,
      loading,
      onLaunch: gameHandlers.onLaunch,
      onStop: gameHandlers.onStop,
      onInstall: gameHandlers.onInstall,
      onOpenFolder: gameHandlers.onOpenFolder,
      onUninstall: gameHandlers.onUninstall,
    }),
    [
      games,
      selectedGame,
      searchTerm,
      debouncedSearchTerm,
      filters,
      installedGames,
      libraryStatusSets,
      gameStats,
      gameStatuses,
      user,
      modals.addGameModal.open,
      getGenresArray,
      libraryExpanded,
      handleToggleLibraryExpanded,
      loading,
      gameHandlers,
    ],
  );

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? "bg-gray-50" : "bg-gray-900"}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className={`relative w-16 h-16 mx-auto mb-6 ${isLight ? "bg-blue-100" : "bg-blue-500/20"} rounded-2xl flex items-center justify-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
          <p className={`text-lg font-medium ${getTextClass("primary")}`}>{t("games.loadingLibrary")}</p>
          <p className={`text-sm mt-2 ${getTextClass("secondary")}`}>{t("games.pleaseWait")}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? "bg-gray-50" : "bg-gray-900"}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full mx-4 rounded-2xl p-8 border ${isLight ? "bg-white border-red-200" : "bg-gray-800/50 border-red-500/30"}`}
        >
          <div className={`w-16 h-16 rounded-xl mx-auto mb-6 flex items-center justify-center ${isLight ? "bg-red-100" : "bg-red-500/20"}`}>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className={`text-xl font-bold text-center mb-3 ${getTextClass("primary")}`}>
            {t("errors.loadingFailed")}
          </h2>
          <p className={`text-center mb-6 text-sm ${isLight ? "text-red-600" : "text-red-400"}`}>{error}</p>
          <button
            onClick={reloadGames}
            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
                : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/30"
            }`}
          >
            {t("games.retry")}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <GamesContext.Provider value={gamesCtxValue}>
    <div className={`h-full flex ${isLight ? "bg-gray-50" : "bg-gray-900"}`}>
      <GameLibrary />

      {!libraryExpanded && (
        <GameDetails
          game={selectedGame}
          allGames={games}
          onSelectVersion={setSelectedGame}
          gameSize={gameSize}
          user={user}
          getGenresArray={getGenresArray}
          getPlatformsArray={getPlatformsArray}
          {...(selectedGameState ?? {})}
          {...gameHandlers}
        />
      )}

      <UninstallModal
        isOpen={modals.uninstallModal.isOpen}
        onClose={modals.uninstallModal.close}
        onConfirm={confirmUninstall}
        game={modals.uninstallModal.game}
        gameSize={modals.uninstallModal.game?._id === selectedGame?._id ? gameSize : null}
      />

      <InstallPathModal
        isOpen={modals.installPathModal.isOpen}
        onClose={modals.installPathModal.close}
        onConfirm={handleInstallPathConfirm}
        gameName={modals.installPathModal.game?.name}
      />

      <DeleteGameModal
        isOpen={modals.deleteGameModal.isOpen}
        onClose={modals.deleteGameModal.close}
        onConfirm={confirmDeleteGame}
        game={modals.deleteGameModal.game}
        loading={modals.deleteGameModal.loading}
        result={modals.deleteGameModal.result}
      />

      <ConfirmationModal
        isOpen={modals.confirmationModal.isOpen}
        onClose={modals.confirmationModal.close}
        onConfirm={
          modals.confirmationModal.data.onConfirm
            ? () => modals.confirmationModal.data.onConfirm()
            : modals.confirmationModal.close
        }
        title={modals.confirmationModal.data.title}
        message={modals.confirmationModal.data.message}
        confirmText={modals.confirmationModal.data.confirmText}
        cancelText={modals.confirmationModal.data.cancelText}
        confirmColor={modals.confirmationModal.data.confirmColor}
        icon={modals.confirmationModal.data.icon}
        showLockInfo={modals.confirmationModal.data.showLockInfo}
        loading={modals.confirmationModal.data.loading}
        error={modals.confirmationModal.data.error}
        success={modals.confirmationModal.data.success}
      />

      <AddGameModal
        isOpen={modals.addGameModal.isOpen}
        onClose={modals.addGameModal.close}
        onSuccess={handleAddGameSuccess}
      />

      <WineRequiredModal
        isOpen={modals.wineModal.isOpen}
        onClose={modals.wineModal.close}
        instructions={modals.wineModal.instructions}
      />
    </div>
    </GamesContext.Provider>
  );
};

export default Games;
