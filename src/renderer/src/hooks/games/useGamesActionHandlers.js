import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import logger from "../../services/logger";
import { getAllServerGames, deleteServerGame } from "../../api/serverGames";
import { checkServerStatus } from "../../api/server";
import { launchGame as launchGameAPI } from "../../api/installedGames";
import { gamesCache } from "../../utils/gamesCache";
import uninstallQueue from "../../utils/uninstallQueue";
import gameManager from "../../services/gameManager";

export const useGamesActionHandlers = ({
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
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleEnqueueResult = useCallback(
    (game, result) => {
      if (result === "started") {
        navigate("/download");
      } else {
        toast.success(t("downloads.addedToQueue"), {
          description: t("downloads.queuedDesc", { name: game.name }),
          duration: 3000,
        });
      }
    },
    [navigate, t],
  );

  const handleLaunchGame = useCallback(
    async (game) => {
      try {
        if (isPendingUninstall(game._id)) {
          toast.error(t("games.cannotLaunchTitle"), {
            description: `"${game.name}" ${t("games.cannotLaunchPendingSync")}`,
            duration: 5000,
          });
          return;
        }

        const installedData = getInstalledGameData(game._id);
        if (!installedData) {
          logger.error("Installation data not found for", game.name);
          toast.error(t("games.gameNotFoundTitle"), {
            description: t("games.gameNotFoundDesc", { name: game.name }),
            duration: 4000,
          });
          return;
        }

        setPlayingGames((prev) => new Set([...prev, game._id]));

        try {
          await launchGameAPI(game._id);
        } catch {
          // Offline mode — continue anyway
        }

        const cachedGames = await window.store.get("installedGamesCache", {});
        const cachedData = cachedGames[game._id];

        const result = await gameManager.launchGame(
          game._id,
          installedData.path,
          cachedData?.executable || null,
          game.name,
        );

        if (!result.success) {
          logger.error("Launch failed:", result.error);

          if (result.error && result.error.startsWith("WINE_NOT_INSTALLED:")) {
            const instructionsJson = result.error.replace("WINE_NOT_INSTALLED:", "");
            try {
              const instructions = JSON.parse(instructionsJson);
              modals.wineModal.open(instructions);
            } catch (e) {
              logger.error("Error parsing Wine instructions:", e);
            }
          } else {
            toast.error(t("games.launchFailedTitle"), {
              description: t("games.launchFailedDesc", { name: game.name }),
              id: `launch-error-${game._id}`,
            });
          }

          setPlayingGames((prev) => {
            const next = new Set(prev);
            next.delete(game._id);
            return next;
          });
        } else {
          // Watchdog: if no status event in 15s, verify the game is still active
          const timerId = setTimeout(async () => {
            watchdogTimersRef.current.delete(timerId);
            try {
              const activeGames = await gameManager.getActiveGames();
              if (!activeGames.some((g) => g.gameId === game._id)) {
                setPlayingGames((prev) => {
                  const next = new Set(prev);
                  next.delete(game._id);
                  return next;
                });
              }
            } catch {
              /* best-effort */
            }
          }, 15000);
          watchdogTimersRef.current.add(timerId);
        }
      } catch (error) {
        logger.error("Error launching", game.name, ":", error);
        toast.error(t("games.launchErrorTitle"), {
          description: t("games.launchErrorDesc", { name: game.name }),
          id: `launch-error-${game._id}`,
        });
        setPlayingGames((prev) => {
          const next = new Set(prev);
          next.delete(game._id);
          return next;
        });
      }
    },
    [isPendingUninstall, getInstalledGameData, setPlayingGames, watchdogTimersRef, modals.wineModal, t],
  );

  const handleStopGame = useCallback(
    async (game) => {
      try {
        const result = await gameManager.stopGame(game._id);
        if (!result.success) {
          logger.error("Stop failed:", result.error);
          toast.error(t("games.stopFailedTitle"), {
            description: t("games.stopFailedDesc", { name: game.name }),
            id: `stop-error-${game._id}`,
          });
        }
      } catch (error) {
        logger.error("Error stopping", game.name, ":", error);
        toast.error(t("games.stopErrorTitle"), {
          description: t("games.stopErrorDesc", { name: game.name }),
          id: `stop-error-${game._id}`,
        });
      }
    },
    [t],
  );

  const handleForceStopGame = useCallback(
    async (game) => {
      try {
        const result = await gameManager.forceStopGame(game._id);
        if (!result.success) {
          logger.error("Force stop failed:", result.error);
          toast.error(t("games.forceStopFailedTitle"), {
            description: t("games.forceStopFailedDesc", { name: game.name, error: result.error }),
          });
        } else {
          toast.success(t("games.forceStopSuccess", { name: game.name }));
        }
      } catch (error) {
        logger.error("Error force stopping", game.name, ":", error);
        toast.error(t("games.forceStopErrorTitle"), {
          description: t("games.forceStopErrorDesc", { name: game.name }),
        });
      }
    },
    [t],
  );

  const handleInstallGame = useCallback(
    async (game) => {
      if (isGameDownloading(game._id) || isGameQueued(game._id)) return;

      const downloadPath = await window.store.get("downloadPath");
      if (!downloadPath) {
        modals.installPathModal.open(game);
        return;
      }

      handleEnqueueResult(game, enqueueGame(game));
    },
    [isGameDownloading, isGameQueued, modals.installPathModal, handleEnqueueResult, enqueueGame],
  );

  const handleInstallPathConfirm = useCallback(async () => {
    if (modals.installPathModal.game) {
      const game = modals.installPathModal.game;
      modals.installPathModal.close();
      handleEnqueueResult(game, enqueueGame(game));
    }
  }, [modals.installPathModal, handleEnqueueResult, enqueueGame]);

  const handleUninstallGame = useCallback(
    (game) => {
      modals.uninstallModal.open(game);
    },
    [modals.uninstallModal],
  );

  const confirmUninstall = useCallback(async () => {
    if (!modals.uninstallModal.game) return;

    const game = modals.uninstallModal.game;
    const installedData = getInstalledGameData(game._id);
    if (!installedData) return;

    if (installedData.path) gameSizeCacheRef.current.delete(installedData.path);

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

      const result = await gameManager.uninstallGame(game._id, installedData.path, game.name);

      if (!result.success) {
        logger.error("Uninstall failed:", result.error);
        toast.error(t("errors.uninstallFailed"), {
          description: `${game.name}${result.error ? ` — ${result.error}` : ""}`,
          duration: 5000,
        });
        setUninstalling((prev) => {
          const next = new Set(prev);
          next.delete(game._id);
          return next;
        });
      } else {
        toast.success(t("games.uninstallSuccessTitle"), {
          description: t("games.uninstallSuccessDesc", { name: game.name }),
          duration: 4000,
        });
      }
    } catch (error) {
      logger.error("Uninstall error:", error);
      toast.error(t("errors.uninstallFailed"), {
        description: game.name,
        duration: 5000,
      });
      setUninstalling((prev) => {
        const next = new Set(prev);
        next.delete(game._id);
        return next;
      });
    }
  }, [modals.uninstallModal, modals.confirmationModal, getInstalledGameData, gameSizeCacheRef, setUninstalling, t]);

  const openGameFolder = useCallback(
    async (game) => {
      const installedData = getInstalledGameData(game._id);
      if (installedData?.path) {
        await gameManager.openGameFolder(installedData.path);
      } else {
        toast.error(t("games.cannotOpenFolderTitle"), {
          description: t("games.cannotOpenFolderDesc", { name: game.name }),
          duration: 3000,
        });
      }
    },
    [getInstalledGameData, t],
  );

  const createShortcut = useCallback(
    async (game) => {
      const installedData = getInstalledGameData(game._id);
      if (!installedData?.path) return;

      let executable = installedData.executable;
      if (!executable) {
        const detected = await window.api.getBestExecutable({
          gamePath: installedData.path,
          gameName: game.name,
        });
        executable = detected.success ? detected.executable : null;
      }
      if (!executable) {
        toast.error(t("games.shortcutFailed"), { duration: 3000 });
        return;
      }

      const result = await window.api.createShortcut({
        gameName: game.name,
        gamePath: installedData.path,
        executable,
      });
      if (result.success) {
        toast.success(t("games.shortcutCreated", { name: game.name }), { duration: 3000 });
      } else {
        toast.error(t("games.shortcutFailed"), { duration: 3000 });
      }
    },
    [getInstalledGameData, t],
  );

  const confirmDeleteGame = useCallback(async () => {
    if (!modals.deleteGameModal.game) return;

    modals.deleteGameModal.setLoading(true);

    try {
      const response = await deleteServerGame(modals.deleteGameModal.game._id);
      const updatedGames = await getAllServerGames();
      setGames(updatedGames || []);

      if (selectedGame?._id === modals.deleteGameModal.game._id) {
        setSelectedGame(updatedGames?.length > 0 ? updatedGames[0] : null);
      }

      modals.deleteGameModal.setResult({
        success: true,
        cleanup: response.cleanup,
        audit: response.audit,
      });
    } catch (error) {
      modals.deleteGameModal.setResult({
        error: error.message || t("games.unknownError"),
        details: error.response?.data?.message || "",
      });
    } finally {
      modals.deleteGameModal.setLoading(false);
    }
  }, [modals.deleteGameModal, selectedGame, setGames, setSelectedGame, t]);

  const handleAddGameSuccess = useCallback(async () => {
    try {
      const updatedGames = await getAllServerGames();
      setGames(updatedGames || []);
      toast.success(t("success.gameListUpdated"), { id: "games-refreshed" });
    } catch (error) {
      logger.error("Error reloading games:", error);
      toast.error(t("errors.refreshGames"), {
        description: t("games.failedReloadDesc"),
      });
    }
  }, [setGames, t]);

  return {
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
  };
};
