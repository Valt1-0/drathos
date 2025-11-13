import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { getAllServerGames, deleteServerGame } from "../api/serverGames";
import { getInstalledGames, launchGame as launchGameAPI } from "../api/installedGames";
import { formatStats as formatStatsAPI } from "../api/gameStats";
import uninstallQueue from "../utils/uninstallQueue";
import { useDownloadActions } from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { checkServerStatus } from "../api/server";
import gameManager from "../services/gameManager";
import { useGameStats } from "../hooks/games/useGameStats";
import { useGameModals } from "../hooks/games/useGameModals";
import { useDebounce } from "../hooks/useDebounce";
import GameLibrary from "../components/games/GameLibrary";
import GameDetails from "../components/games/GameDetails";
import UninstallModal from "../components/modals/UninstallModal";
import InstallPathModal from "../components/modals/InstallPathModal";
import DeleteGameModal from "../components/modals/DeleteGameModal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import AddGameModal from "../components/modals/AddGameModal";
import WineRequiredModal from "../components/modals/WineRequiredModal";
import { toast } from "sonner";

const Games = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameSize, setGameSize] = useState(null);
  const [playingGames, setPlayingGames] = useState(new Set());
  const [uninstalling, setUninstalling] = useState(new Set());
  const [pendingUninstalls, setPendingUninstalls] = useState(new Set());
  const [isInstalling, setIsInstalling] = useState(false);

  const { gameStats, updateSessionStats } = useGameStats();
  const modals = useGameModals();
  const { addDownload, updateDownloadProgress, removeDownload } = useDownloadActions();
  const { isOnline } = useConnection();
  const { user } = useAuth();

  const extractGenreName = (genre) => {
    if (!genre) return "Unknown";
    if (typeof genre === "string") return genre;
    return genre.name || genre.slug || genre.id || "Unknown";
  };

  const extractPlatformName = (platform) => {
    if (!platform) return "Unknown";
    if (typeof platform === "string") return platform;
    return platform.name || platform.slug || platform.id || "Unknown";
  };

  const getGenresArray = (game) => {
    if (!game || !game.genres) return [];
    if (!Array.isArray(game.genres)) return [];
    return game.genres.map(extractGenreName);
  };

  const getPlatformsArray = (game) => {
    if (!game || !game.platforms) return ["PC"];
    if (!Array.isArray(game.platforms)) return ["PC"];
    return game.platforms.map(extractPlatformName);
  };

  useEffect(() => {
    const loadGames = async () => {
      const cachedGamesObject = await window.store.get("installedGamesCache", {});
      const cachedGamesArray = Object.entries(cachedGamesObject).map(([gameId, data]) => ({
        _id: `installed_${gameId}`,
        serverGameId: {
          _id: gameId,
          name: data.name,
          summary: data.summary,
          storyline: data.storyline,
          coverUrl: data.coverUrl,
          genres: data.genres,
          platforms: data.platforms,
          rating: data.rating,
          aggregatedRating: data.aggregatedRating,
          releaseDate: data.releaseDate,
          developer: data.developer,
          publisher: data.publisher,
        },
        path: data.path,
        version: data.version,
        stats: data.stats,
        installedAt: data.installedAt,
      }));

      if (cachedGamesArray.length > 0) {
        setInstalledGames(cachedGamesArray);
        const gamesFromCache = cachedGamesArray.map(g => g.serverGameId);
        setGames(gamesFromCache);
        setSelectedGame(gamesFromCache[0]);
      }

      setLoading(false);

      try {
        const [allGames, installed, activeGames] = await Promise.all([
          getAllServerGames(),
          getInstalledGames(),
          gameManager.getActiveGames(),
        ]);

        if (installed) setInstalledGames(installed);

        if (allGames && allGames.length > 0) {
          setGames(allGames);
          if (!selectedGame) setSelectedGame(allGames[0]);
        }

        const playingSet = new Set(activeGames.map((game) => game.gameId));
        setPlayingGames(playingSet);
      } catch (err) {
        console.debug("[Games] Server unavailable:", err.message);
      }
    };

    loadGames();
  }, []);

  useEffect(() => {
    const refreshActiveGames = async () => {
      try {
        const activeGames = await gameManager.getActiveGames();
        const playingSet = new Set(activeGames.map((game) => game.gameId));
        setPlayingGames(playingSet);
      } catch (error) {
        console.error("[Games] Error refreshing active games:", error);
      }
    };

    refreshActiveGames();
  }, []);

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
          setUninstalling((prev) => {
            const newSet = new Set(prev);
            newSet.delete(item.gameId);
            return newSet;
          });
        }
      }

      try {
        const installed = await getInstalledGames();
        setInstalledGames(installed);
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

        getInstalledGames()
          .then((installed) => setInstalledGames(installed))
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
    const loadGameSize = async () => {
      if (selectedGame && isInstalled(selectedGame._id)) {
        const installedData = getInstalledGameData(selectedGame._id);
        if (installedData) {
          const sizeResult = await gameManager.getGameSize(installedData.path);
          setGameSize(sizeResult.success ? sizeResult : null);
        }
      } else {
        setGameSize(null);
      }
    };

    loadGameSize();
  }, [selectedGame]);

  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId);

  const getInstalledGameData = (gameId) =>
    installedGames.find((g) => g.serverGameId?._id === gameId);

  const isGamePlaying = (gameId) => playingGames.has(gameId);
  const isGameUninstalling = (gameId) => uninstalling.has(gameId);
  const isPendingUninstall = (gameId) => pendingUninstalls.has(gameId);

  const handleLaunchGame = async (game) => {
    try {
      if (isPendingUninstall(game._id)) {
        toast.error("Cannot Launch Game", {
          description: `"${game.name}" has been uninstalled but synchronization with the server is pending. Please reconnect to complete the synchronization.`,
          duration: 5000,
        });
        return;
      }

      const installedData = getInstalledGameData(game._id);
      if (!installedData) {
        console.error("Installation data not found for", game.name);
        toast.error("Game Not Found", {
          description: `Installation data not found for "${game.name}". Please try reinstalling the game.`,
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
          toast.error("Launch Failed", {
            description: `Unable to launch "${game.name}". Please verify the game is properly installed.`,
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
      toast.error("Launch Error", {
        description: `An error occurred while launching "${game.name}"`,
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
      }
    } catch (error) {
      console.error("Error stopping", game.name, ":", error);
    }
  };

  const handleForceStopGame = async (game) => {
    try {
      const result = await gameManager.forceStopGame(game._id);
      if (!result.success) {
        console.error("Force stop failed:", result.error);
      }
    } catch (error) {
      console.error("Error force stopping", game.name, ":", error);
    }
  };

  const handleInstallGame = async (game) => {
    const downloadPath = await window.store.get("downloadPath");

    if (!downloadPath) {
      modals.installPathModal.open(game);
      return;
    }

    await startGameInstallation(game);
  };

  const handleInstallPathConfirm = async () => {
    if (modals.installPathModal.game) {
      await startGameInstallation(modals.installPathModal.game);
      modals.installPathModal.close();
    }
  };

  const startGameInstallation = async (game) => {
    setIsInstalling(true);

    const downloadId = `${game._id}-${Date.now()}`;
    addDownload({
      id: downloadId,
      name: game.name,
      image: game.coverUrl,
      progress: 0,
      speed: 0,
      sizeDownloaded: 0,
      totalSize: game.sizeMB,
      stage: "downloading",
    });

    window.api.onDownloadProgress((data) => {
      if (data.id === game._id) {
        updateDownloadProgress(downloadId, {
          stage: data.stage,
          progress: data.progress,
          speed: data.speed,
          sizeDownloaded: data.sizeDownloaded,
          totalSize: data.totalSize,
          eta: data.eta,
        });

        if (data.stage === "completed" || data.stage === "failed") {
          setTimeout(async () => {
            removeDownload(downloadId);
            try {
              const installed = await getInstalledGames();
              setInstalledGames(installed);
            } catch (err) {
              console.warn("Could not refresh installed games:", err);
            }
          }, 2000);
        }
      }
    });

    setTimeout(() => {
      setIsInstalling(false);
      navigate("/download");
    }, 800);

    window.api.installGame(game).catch((error) => {
      console.error("Installation error:", error);
      removeDownload(downloadId);
    });
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
        toast.error("Uninstallation Failed", {
          description: `Unable to uninstall "${game.name}". ${result.error || ''}`,
          duration: 5000,
        });
        setUninstalling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(game._id);
          return newSet;
        });
      } else {
        toast.success("Uninstallation Successful", {
          description: `"${game.name}" has been uninstalled successfully`,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Uninstall error:", error);
      toast.error("Uninstallation Error", {
        description: `An error occurred while uninstalling "${game.name}"`,
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
      toast.error("Cannot Open Folder", {
        description: `No installation path found for "${game.name}".`,
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
        error: error.message || "Erreur inconnue",
        details: error.response?.data?.message || "",
      });
    } finally {
      modals.deleteGameModal.setLoading(false);
    }
  };

  const handleAddGameSuccess = async () => {
    try {
      const updatedGames = await getAllServerGames();
      setGames(updatedGames || []);
    } catch (error) {
      console.error("Error reloading games:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      <GameLibrary
        games={games}
        selectedGameId={selectedGame?._id}
        onSelectGame={setSelectedGame}
        searchTerm={searchTerm}
        debouncedSearchTerm={debouncedSearchTerm}
        onSearchChange={setSearchTerm}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        installedGames={installedGames}
        playingGames={playingGames}
        uninstallingGames={uninstalling}
        pendingUninstalls={pendingUninstalls}
        gameStats={gameStats}
        user={user}
        onAddGame={modals.addGameModal.open}
        getGenresArray={getGenresArray}
      />

      <GameDetails
        game={selectedGame}
        gameStats={selectedGame ? gameStats[selectedGame._id] : null}
        gameSize={gameSize}
        isInstalled={isInstalled(selectedGame?._id)}
        isPlaying={isGamePlaying(selectedGame?._id)}
        isUninstalling={isGameUninstalling(selectedGame?._id)}
        isPending={isPendingUninstall(selectedGame?._id)}
        isInstalling={isInstalling}
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
