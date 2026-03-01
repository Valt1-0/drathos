import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { getAllServerGames, deleteServerGame } from "../api/serverGames";
import { checkServerStatus } from "../api/server";
import { getInstalledGames, launchGame as launchGameAPI } from "../api/installedGames";
import { formatStats as formatStatsAPI } from "../api/gameStats";
import uninstallQueue from "../utils/uninstallQueue";
import { useActiveDownloads, useDownloadQueue } from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../contexts/themeContext";
import gameManager from "../services/gameManager";
import { useGameStats } from "../hooks/games/useGameStats";
import { useGameModals } from "../hooks/games/useGameModals";
import { useDebounce } from "../hooks/useDebounce";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";
import GameLibrary from "../components/games/GameLibrary";
import GameDetails from "../components/games/GameDetails";
import { gamesCache } from "../utils/gamesCache";
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
  const { isOnline } = useConnection();
  const { user } = useAuth();

  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const defaultFilters = {
    sortBy: 'name-asc',
    statusFilter: 'all',
    selectedGenres: [],
    showOnlyMultiplayer: false,
    playtimeRange: 'all',
  };
  const [filters, setFilters] = useState(defaultFilters);

  // Load persisted filters on mount
  useEffect(() => {
    const loadFilters = async () => {
      const saved = await window.store.get('gameFilters');
      if (saved) setFilters((prev) => ({ ...prev, ...saved }));
    };
    loadFilters();
  }, []);

  // Persist filters on change
  useEffect(() => {
    window.store.set('gameFilters', filters);
  }, [filters]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameSize, setGameSize] = useState(null);
  const [playingGames, setPlayingGames] = useState(new Set());
  const [uninstalling, setUninstalling] = useState(new Set());
  const [pendingUninstalls, setPendingUninstalls] = useState(new Set());

  const { gameStats, updateSessionStats } = useGameStats();
  const modals = useGameModals();
  const activeDownloads = useActiveDownloads();
  const { enqueueGame, queue } = useDownloadQueue();

  const extractGenreName = useCallback((genre) => {
    if (!genre) return t('games.unknown');
    if (typeof genre === "string") return genre;
    return genre.name || genre.slug || genre.id || t('games.unknown');
  }, [t]);

  const extractPlatformName = useCallback((platform) => {
    if (!platform) return t('games.unknown');
    if (typeof platform === "string") return platform;
    return platform.name || platform.slug || platform.id || t('games.unknown');
  }, [t]);

  const getGenresArray = useCallback((game) => {
    if (!game || !game.genres) return [];
    if (!Array.isArray(game.genres)) return [];
    return game.genres.map(extractGenreName);
  }, [extractGenreName]);

  const getPlatformsArray = useCallback((game) => {
    if (!game || !game.platforms) return ["PC"];
    if (!Array.isArray(game.platforms)) return ["PC"];
    return game.platforms.map(extractPlatformName);
  }, [extractPlatformName]);

  // Load games
  useEffect(() => {
    const load = async () => {
      // 1. Charger cache local d'abord (jeux installés)
      const localCache = await window.store.get("installedGamesCache", {});
      const localInstalled = Object.entries(localCache).map(([id, data]) => ({
        _id: `installed_${id}`,
        serverGameId: { _id: id, name: data.name, coverUrl: data.coverUrl, genres: data.genres, summary: data.summary },
        path: data.path,
      }));

      // 2. Si offline ou pas encore vérifié: afficher seulement les jeux installés
      if (!isOnline) {
        gamesCache.clear();
        setInstalledGames(localInstalled);
        setGames(localInstalled.map(g => g.serverGameId));
        if (localInstalled.length && !selectedGame) setSelectedGame(localInstalled[0].serverGameId);
        setLoading(false);
        return;
      }

      // 3. Online + cache mémoire valide: utiliser le cache
      if (gamesCache.isValid()) {
        const c = gamesCache.get();
        setGames(c.games);
        setInstalledGames(c.installedGames);
        if (c.games.length && !selectedGame) setSelectedGame(c.games[0]);
        setLoading(false);
        return;
      }

      // 4. Online + pas de cache: fetch serveur
      setLoading(true);
      try {
        const [allGames, installed, activeGames] = await Promise.all([
          getAllServerGames(),
          getInstalledGames(),
          gameManager.getActiveGames(),
        ]);

        gamesCache.set({ games: allGames || [], installedGames: installed || [] });
        setGames(allGames || []);
        setInstalledGames(installed || []);
        if (allGames?.length && !selectedGame) setSelectedGame(allGames[0]);
        setPlayingGames(new Set(activeGames.map(g => g.gameId)));
      } catch (err) {
        console.debug("[Games] Server unavailable:", err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOnline]);

  useEffect(() => {
    const handleQueueChange = (queueItems) => {
      const pendingIds = new Set(queueItems.map((item) => item.gameId));
      setPendingUninstalls(pendingIds);
    };

    const listenerId = uninstallQueue.addListener(handleQueueChange);
    const initialQueue = uninstallQueue.getAll();
    handleQueueChange(initialQueue);

    return () => uninstallQueue.removeListener(listenerId);
  }, []);

  useEffect(() => {
    const processUninstallQueue = async () => {
      if (!isOnline) return;

      const queue = uninstallQueue.getAll();
      if (queue.length === 0) return;

      for (const item of queue) {
        try {
          setUninstalling((prev) => new Set([...prev, item.gameId]));

          const result = await gameManager.uninstallGame(
            item.gameId,
            item.gamePath,
            item.gameName
          );

          if (result.success) {
            await uninstallQueue.dequeue(item.gameId);
          }

          setUninstalling((prev) => {
            const newSet = new Set(prev);
            newSet.delete(item.gameId);
            return newSet;
          });
        } catch (error) {
          console.error("[Games] Uninstall error:", error);
          toast.error(t('errors.uninstallFailed'), {
            description: `${t('games.installErrorDesc', { name: item.gameName, error: error.message })}`,
          });
          setUninstalling((prev) => {
            const newSet = new Set(prev);
            newSet.delete(item.gameId);
            return newSet;
          });
        }
      }

      try {
        gamesCache.invalidate();
        const installed = await getInstalledGames();
        setInstalledGames(installed);
        gamesCache.set({ installedGames: installed });
      } catch (err) {
        console.warn("[Games] Refresh error:", err);
      }
    };

    processUninstallQueue();
  }, [isOnline]);

  useEffect(() => {
    const handleGameStatusChange = (status) => {
      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        if (status.status === "running") {
          newSet.add(status.gameId);
        } else if (status.status === "stopped" || status.status === "failed") {
          newSet.delete(status.gameId);
        }
        return newSet;
      });

      if (status.sessionDuration) {
        updateSessionStats(status.gameId, status.sessionDuration);
      }
    };

    const handleUninstallProgress = async (progress) => {
      if (progress.stage === "uninstalled") {
        if (progress.pendingSync || progress.offlineMode) {
          const installedData = installedGames.find(
            (g) => g.serverGameId?._id === progress.id
          );
          if (installedData) {
            await uninstallQueue.enqueue(
              progress.id,
              installedData.serverGameId?.name || "Unknown Game"
            );
          }
        }

        gamesCache.invalidate();
        getInstalledGames()
          .then((installed) => {
            setInstalledGames(installed);
            gamesCache.set({ installedGames: installed });
          })
          .catch((err) => console.warn("Could not refresh installed games:", err));

        setUninstalling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(progress.id);
          return newSet;
        });
      } else if (progress.stage === "failed") {
        setUninstalling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(progress.id);
          return newSet;
        });
      }
    };

    gameManager.addStatusListener("*", handleGameStatusChange);
    gameManager.addUninstallListener("*", handleUninstallProgress);

    return () => {
      gameManager.removeStatusListener("*", handleGameStatusChange);
      gameManager.removeUninstallListeners("*");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setGameSize(null);

    const loadGameSize = async () => {
      if (!selectedGame || !isInstalled(selectedGame._id)) return;
      const installedData = getInstalledGameData(selectedGame._id);
      if (!installedData) return;
      const sizeResult = await gameManager.getGameSize(installedData.path);
      if (!cancelled) setGameSize(sizeResult.success ? sizeResult : null);
    };

    loadGameSize();
    return () => { cancelled = true; };
  }, [selectedGame]);

  const isInstalled = useCallback((gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId),
    [installedGames]
  );

  const getInstalledGameData = useCallback((gameId) =>
    installedGames.find((g) => g.serverGameId?._id === gameId),
    [installedGames]
  );

  const isGamePlaying = useCallback((gameId) => playingGames.has(gameId), [playingGames]);
  const isGameUninstalling = useCallback((gameId) => uninstalling.has(gameId), [uninstalling]);
  const isPendingUninstall = useCallback((gameId) => pendingUninstalls.has(gameId), [pendingUninstalls]);

  const handleLaunchGame = async (game) => {
    try {
      if (isPendingUninstall(game._id)) {
        toast.error(t('games.cannotLaunchTitle'), {
          description: `"${game.name}" ${t('games.cannotLaunchPendingSync')}`,
          duration: 5000,
        });
        return;
      }

      const installedData = getInstalledGameData(game._id);
      if (!installedData) {
        console.error("Installation data not found for", game.name);
        toast.error(t('games.gameNotFoundTitle'), {
          description: t('games.gameNotFoundDesc', { name: game.name }),
          duration: 4000,
        });
        return;
      }

      try {
        await launchGameAPI(game._id);
      } catch (error) {
        // Offline mode - continue anyway
      }

      setPlayingGames((prev) => new Set([...prev, game._id]));

      const cachedGames = await window.store.get("installedGamesCache", {});
      const cachedData = cachedGames[game._id];

      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        cachedData?.executable || null,
        game.name
      );

      if (!result.success) {
        console.error("Launch failed:", result.error);

        if (result.error && result.error.startsWith("WINE_NOT_INSTALLED:")) {
          const instructionsJson = result.error.replace("WINE_NOT_INSTALLED:", "");
          try {
            const instructions = JSON.parse(instructionsJson);
            modals.wineModal.open(instructions);
          } catch (e) {
            console.error("Error parsing Wine instructions:", e);
          }
        } else {
          toast.error(t('games.launchFailedTitle'), {
            description: t('games.launchFailedDesc', { name: game.name }),
          });
        }

        setPlayingGames((prev) => {
          const newSet = new Set(prev);
          newSet.delete(game._id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error launching", game.name, ":", error);
      toast.error(t('games.launchErrorTitle'), {
        description: t('games.launchErrorDesc', { name: game.name }),
      });
      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(game._id);
        return newSet;
      });
    }
  };

  const handleStopGame = async (game) => {
    try {
      const result = await gameManager.stopGame(game._id);
      if (!result.success) {
        console.error("Stop failed:", result.error);
        toast.error(t('games.stopFailedTitle'), {
          description: t('games.stopFailedDesc', { name: game.name }),
        });
      }
    } catch (error) {
      console.error("Error stopping", game.name, ":", error);
      toast.error(t('games.stopErrorTitle'), {
        description: t('games.stopErrorDesc', { name: game.name }),
      });
    }
  };

  const handleForceStopGame = async (game) => {
    try {
      const result = await gameManager.forceStopGame(game._id);
      if (!result.success) {
        console.error("Force stop failed:", result.error);
        toast.error(t('games.forceStopFailedTitle'), {
          description: t('games.forceStopFailedDesc', { name: game.name, error: result.error }),
        });
      } else {
        toast.success(t('games.forceStopSuccess', { name: game.name }));
      }
    } catch (error) {
      console.error("Error force stopping", game.name, ":", error);
      toast.error(t('games.forceStopErrorTitle'), {
        description: t('games.forceStopErrorDesc', { name: game.name }),
      });
    }
  };

  const isGameDownloading = useCallback((gameId) =>
    activeDownloads.some(dl => dl.gameId === gameId),
    [activeDownloads]
  );

  const isGameQueued = useCallback((gameId) =>
    queue.some(g => g._id === gameId),
    [queue]
  );

  const handleEnqueueResult = useCallback((game, result) => {
    if (result === "started") {
      navigate("/download");
    } else {
      toast.success(t('downloads.addedToQueue'), {
        description: t('downloads.queuedDesc', { name: game.name }),
        duration: 3000,
      });
    }
  }, [navigate, t]);

  const handleInstallGame = async (game) => {
    if (isGameDownloading(game._id) || isGameQueued(game._id)) return;

    const downloadPath = await window.store.get("downloadPath");

    if (!downloadPath) {
      modals.installPathModal.open(game);
      return;
    }

    handleEnqueueResult(game, enqueueGame(game));
  };

  const handleInstallPathConfirm = async () => {
    if (modals.installPathModal.game) {
      const game = modals.installPathModal.game;
      modals.installPathModal.close();
      handleEnqueueResult(game, enqueueGame(game));
    }
  };

  const handleUninstallGame = (game) => {
    modals.uninstallModal.open(game);
  };

  const confirmUninstall = async () => {
    if (!modals.uninstallModal.game) return;

    const game = modals.uninstallModal.game;
    const installedData = getInstalledGameData(game._id);
    if (!installedData) return;

    const serverAddress = await window.store.get("serverAddress");
    const serverStatus = await checkServerStatus(serverAddress);
    const isServerOnline = serverStatus.online;

    if (!isServerOnline) {
      await uninstallQueue.enqueue(game._id, game.name, installedData.path);
      modals.uninstallModal.close();
      modals.confirmationModal.showOfflineUninstall(game.name);
      return;
    }

    try {
      setUninstalling((prev) => new Set([...prev, game._id]));

      const result = await gameManager.uninstallGame(
        game._id,
        installedData.path,
        game.name
      );

      if (!result.success) {
        console.error("Uninstall failed:", result.error);
        toast.error(t('errors.uninstallFailed'), {
          description: `${t('games.launchFailedDesc', { name: game.name })} ${result.error || ''}`,
          duration: 5000,
        });
        setUninstalling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(game._id);
          return newSet;
        });
      } else {
        toast.success(t('games.uninstallSuccessTitle'), {
          description: t('games.uninstallSuccessDesc', { name: game.name }),
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Uninstall error:", error);
      toast.error(t('errors.uninstallFailed'), {
        description: t('games.launchErrorDesc', { name: game.name }),
        duration: 5000,
      });
      setUninstalling((prev) => {
        const newSet = new Set(prev);
        newSet.delete(game._id);
        return newSet;
      });
    }
  };

  const openGameFolder = async (game) => {
    const installedData = getInstalledGameData(game._id);
    if (installedData && installedData.path) {
      await gameManager.openGameFolder(installedData.path);
    } else {
      toast.error(t('games.cannotOpenFolderTitle'), {
        description: t('games.cannotOpenFolderDesc', { name: game.name }),
        duration: 3000,
      });
    }
  };

  const confirmDeleteGame = async () => {
    if (!modals.deleteGameModal.game) return;

    modals.deleteGameModal.setLoading(true);

    try {
      const response = await deleteServerGame(modals.deleteGameModal.game._id);

      modals.deleteGameModal.setResult({
        success: true,
        cleanup: response.cleanup,
        audit: response.audit,
      });

      setTimeout(async () => {
        const updatedGames = await getAllServerGames();
        setGames(updatedGames || []);

        if (selectedGame?._id === modals.deleteGameModal.game._id) {
          setSelectedGame(updatedGames && updatedGames.length > 0 ? updatedGames[0] : null);
        }
      }, 2000);
    } catch (error) {
      modals.deleteGameModal.setResult({
        error: error.message || t('games.unknownError'),
        details: error.response?.data?.message || "",
      });
    } finally {
      modals.deleteGameModal.setLoading(false);
    }
  };

  // Keyboard shortcuts for Games page
  useKeyboardShortcuts({
    'enter': () => {
      if (!selectedGame || isGameDownloading(selectedGame._id) || isGameQueued(selectedGame._id)) return;
      if (isInstalled(selectedGame._id) && !isGamePlaying(selectedGame._id)) {
        handleLaunchGame(selectedGame);
      } else if (!isInstalled(selectedGame._id)) {
        handleInstallGame(selectedGame);
      }
    },
    'escape': () => {
      // Close any open modal
      if (modals.uninstallModal.isOpen) modals.uninstallModal.close();
      if (modals.installPathModal.isOpen) modals.installPathModal.close();
      if (modals.deleteGameModal.isOpen) modals.deleteGameModal.close();
      if (modals.wineModal.isOpen) modals.wineModal.close();
    },
    'ctrl+r': async () => {
      try {
        const updatedGames = await getAllServerGames();
        setGames(updatedGames || []);
        toast.success(t('games.gamesListRefreshed'));
      } catch (error) {
        toast.error(t('errors.refreshGames'));
      }
    },
    'ctrl+f': (e) => {
      // Focus search input (will be implemented in GameLibrary if needed)
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    },
  }, !modals.deleteGameModal.isOpen); // Disable shortcuts when delete modal is open

  const handleAddGameSuccess = async () => {
    try {
      const updatedGames = await getAllServerGames();
      setGames(updatedGames || []);
      toast.success(t('success.gameListUpdated'));
    } catch (error) {
      console.error("Error reloading games:", error);
      toast.error(t('errors.refreshGames'), {
        description: t('games.failedReloadDesc'),
      });
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? 'bg-gray-50' : 'bg-gray-900'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className={`relative w-16 h-16 mx-auto mb-6 ${isLight ? 'bg-blue-100' : 'bg-blue-500/20'} rounded-2xl flex items-center justify-center`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
          <p className={`text-lg font-medium ${getTextClass('primary')}`}>{t('games.loadingLibrary')}</p>
          <p className={`text-sm mt-2 ${getTextClass('secondary')}`}>{t('games.pleaseWait')}</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full flex items-center justify-center ${isLight ? 'bg-gray-50' : 'bg-gray-900'}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`max-w-md w-full mx-4 rounded-2xl p-8 border ${isLight ? 'bg-white border-red-200' : 'bg-gray-800/50 border-red-500/30'}`}
        >
          <div className={`w-16 h-16 rounded-xl mx-auto mb-6 flex items-center justify-center ${isLight ? 'bg-red-100' : 'bg-red-500/20'}`}>
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className={`text-xl font-bold text-center mb-3 ${getTextClass('primary')}`}>
            {t('errors.loadingFailed')}
          </h2>
          <p className={`text-center mb-6 text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-blue-500/30'
            }`}
          >
            {t('games.retry')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-full flex ${isLight ? 'bg-gray-50' : 'bg-gray-900'}`}>
      <GameLibrary
        games={games}
        selectedGameId={selectedGame?._id}
        onSelectGame={setSelectedGame}
        searchTerm={searchTerm}
        debouncedSearchTerm={debouncedSearchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFiltersChange={setFilters}
        installedGames={installedGames}
        playingGames={playingGames}
        uninstallingGames={uninstalling}
        pendingUninstalls={pendingUninstalls}
        activeDownloads={activeDownloads}
        queue={queue}
        gameStats={gameStats}
        user={user}
        onAddGame={modals.addGameModal.open}
        getGenresArray={getGenresArray}
      />

      <GameDetails
        game={selectedGame}
        allGames={games}
        onSelectVersion={setSelectedGame}
        gameStats={selectedGame ? gameStats[selectedGame._id] : null}
        gameSize={gameSize}
        isInstalled={isInstalled(selectedGame?._id)}
        isPlaying={isGamePlaying(selectedGame?._id)}
        isUninstalling={isGameUninstalling(selectedGame?._id)}
        isPending={isPendingUninstall(selectedGame?._id)}
        isQueued={selectedGame ? isGameQueued(selectedGame._id) : false}
        activeDownload={selectedGame ? activeDownloads.find(dl => dl.gameId === selectedGame._id) : null}
        user={user}
        onLaunch={handleLaunchGame}
        onStop={handleStopGame}
        onForceStop={handleForceStopGame}
        onInstall={handleInstallGame}
        onUninstall={handleUninstallGame}
        onOpenFolder={openGameFolder}
        onDeleteFromServer={(game) => modals.deleteGameModal.open(game, user, isInstalled)}
        getGenresArray={getGenresArray}
        getPlatformsArray={getPlatformsArray}
      />

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
          modals.confirmationModal.data.onConfirm ? () => modals.confirmationModal.data.onConfirm() : modals.confirmationModal.close
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
  );
};

export default Games;
