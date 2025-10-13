// src/renderer/src/pages/Games.jsx - Interface Steam-like 🎮
// Fixed: 401 error handling + Object rendering issues

import { useState, useEffect, useRef, useCallback } from "react";
import { getAllServerGames } from "../api/serverGames";
import {
  getInstalledGames,
  stopGame,
  launchGame as launchGameAPI,
  updateInstalledGamesCache,
} from "../api/installedGames";
import {
  getMergedStats,
  syncStatsToServer,
  formatStats as formatStatsAPI,
  saveLocalStats,
} from "../api/gameStats";
import syncQueue from "../utils/syncQueue";
import uninstallQueue from "../utils/uninstallQueue";
import { useDownload } from "../contexts/downloadContext";
import { useConnection } from "../contexts/connectionContext";
import gameManager from "../services/gameManager";
import dayjs from "dayjs";
import {
  FiBarChart2,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiPlay,
  FiActivity,
  FiFolder,
  FiTrash2,
  FiSquare,
  FiZap,
  FiSearch,
} from "react-icons/fi";

const Games = () => {
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameSize, setGameSize] = useState(null);

  // États pour le tracking des jeux
  const [playingGames, setPlayingGames] = useState(new Set());
  const [gameStats, setGameStats] = useState({});
  const [uninstalling, setUninstalling] = useState(new Set());
  const [pendingUninstalls, setPendingUninstalls] = useState(new Set());

  const { addDownload, updateDownloadProgress, removeDownload } = useDownload();
  const { isOnline } = useConnection();

  // === UTILITY FUNCTIONS ===

  // Safe genre extractor - handles both strings and objects
  const extractGenreName = (genre) => {
    if (!genre) return "Unknown";
    if (typeof genre === "string") return genre;
    return genre.name || genre.slug || genre.id || "Unknown";
  };

  // Safe platform extractor
  const extractPlatformName = (platform) => {
    if (!platform) return "Unknown";
    if (typeof platform === "string") return platform;
    return platform.name || platform.slug || platform.id || "Unknown";
  };

  // Get genres as array of strings
  const getGenresArray = (game) => {
    if (!game || !game.genres) return [];
    if (!Array.isArray(game.genres)) return [];
    return game.genres.map(extractGenreName);
  };

  // Get platforms as array of strings
  const getPlatformsArray = (game) => {
    if (!game || !game.platforms) return ["PC"];
    if (!Array.isArray(game.platforms)) return ["PC"];
    return game.platforms.map(extractPlatformName);
  };

  const loadGameStats = useCallback(async () => {
    console.log("[Games] 🔄 Loading stats for all installed games...");
    const gameIds = installedGames
      .map((g) => g.serverGameId?._id)
      .filter(Boolean);
    const stats = {};

    for (const gameId of gameIds) {
      // Utiliser l'API centralisée pour charger et merger les stats
      const mergedStats = await getMergedStats(gameId);
      if (mergedStats) {
        stats[gameId] = formatStatsAPI(mergedStats);
      }
    }

    console.log("[Games] ✅ Stats loaded:", stats);
    setGameStats(stats);
  }, [installedGames]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        // Fetch server games
        const allGames = await getAllServerGames();

        // Try to fetch installed games, but don't fail if unauthorized
        const installed = await getInstalledGames();
        setInstalledGames(installed || []);

        // Mode hors ligne : si aucun jeu serveur, extraire les jeux depuis les installed
        let finalGames = allGames || [];
        if ((!finalGames || finalGames.length === 0) && installed && installed.length > 0) {
          // Extraire les données serverGameId de chaque jeu installé
          finalGames = installed
            .filter(g => g.serverGameId) // S'assurer que serverGameId existe
            .map(g => g.serverGameId);
        }

        setGames(finalGames);

        // Initialiser l'état des jeux en cours
        const activeGames = await gameManager.getActiveGames();
        const playingSet = new Set(activeGames.map((game) => game.gameId));
        setPlayingGames(playingSet);

        // Sélectionner le premier jeu par défaut
        if (finalGames && finalGames.length > 0) {
          setSelectedGame(finalGames[0]);
        }
      } catch (err) {
        console.debug("[Games] Error loading games:", err.message);
        setError("Unable to load games. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  useEffect(() => {
    if (installedGames.length > 0) {
      loadGameStats();
    }
  }, [installedGames]);

  // Écouter les changements de la queue de désinstallation
  useEffect(() => {
    const handleQueueChange = (queueItems) => {
      const pendingIds = new Set(queueItems.map((item) => item.gameId));
      setPendingUninstalls(pendingIds);
    };

    const listenerId = uninstallQueue.addListener(handleQueueChange);
    const initialQueue = uninstallQueue.getAll();
    handleQueueChange(initialQueue);

    return () => {
      uninstallQueue.removeListener(listenerId);
    };
  }, []);

  // Traiter automatiquement la queue quand le serveur revient online
  useEffect(() => {
    const processUninstallQueue = async () => {
      if (!isOnline) return;

      const queue = uninstallQueue.getAll();
      if (queue.length === 0) return;

      console.log(`[Games] 🔄 Serveur online - Traitement de ${queue.length} désinstallation(s)`);

      for (const item of queue) {
        try {
          console.log(`[Games] 🗑️ Désinstallation de ${item.gameName}...`);
          setUninstalling((prev) => new Set([...prev, item.gameId]));

          const result = await gameManager.uninstallGame(
            item.gameId,
            item.gamePath,
            item.gameName
          );

          if (result.success) {
            await uninstallQueue.dequeue(item.gameId);
            console.log(`[Games] ✅ ${item.gameName} désinstallé`);
          } else {
            console.error(`[Games] ❌ Échec ${item.gameName}:`, result.error);
          }

          setUninstalling((prev) => {
            const newSet = new Set(prev);
            newSet.delete(item.gameId);
            return newSet;
          });
        } catch (error) {
          console.error(`[Games] ❌ Erreur ${item.gameName}:`, error);
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
        await updateInstalledGamesCache(installed);
      } catch (err) {
        console.warn("[Games] Erreur refresh:", err);
      }
    };

    processUninstallQueue();
  }, [isOnline]);

  // Utiliser useRef pour persister le flag entre les renders
  const isProcessingStats = useRef(false);

  useEffect(() => {
    const handleSaveStats = async (event, data) => {
      if (isProcessingStats.current) {
        console.debug("[Games] Stats update already in progress, skipping...");
        return;
      }

      isProcessingStats.current = true;
      console.log("[Games] 📊 Starting stats save process for", data.gameId);

      try {
        // 1️⃣ Toujours sauvegarder localement d'abord
        const saveResult = await saveLocalStats(data.gameId, data.sessionData);
        console.log("[Games] ✅ Local stats saved:", saveResult);

        // 2️⃣ Essayer de synchroniser avec le serveur (envoyer les stats locales complètes)
        try {
          if (saveResult.success && saveResult.stats) {
            // Récupérer les stats locales complètes après la sauvegarde
            const localStats = await window.api.getLocalStats({ gameId: data.gameId });

            // Envoyer au backend pour sync (via l'API centralisée)
            await syncStatsToServer(data.gameId, localStats, data.sessionData.duration);
            console.log("[Games] ✅ Stats synced to server");
          } else {
            // Fallback : appeler l'ancienne méthode stopGame
            await stopGame(data.gameId);
          }
        } catch (error) {
          console.debug("[Games] 📴 Server offline - stats saved locally");

          // 🔄 Ajouter à la queue de retry pour synchronisation ultérieure
          const localStats = await window.api.getLocalStats({ gameId: data.gameId });
          if (localStats) {
            await syncQueue.enqueue(data.gameId, localStats, data.sessionData.duration);
            console.log("[Games] ➕ Stats ajoutées à la queue de sync");
          }
        }

        // 3️⃣ Petit délai pour s'assurer que toutes les opérations sont terminées
        await new Promise(resolve => setTimeout(resolve, 500));

        // 4️⃣ Recharger les stats avec merge automatique
        await loadGameStats();
        console.log("[Games] ✅ Stats reloaded successfully");
        console.log("[Games] 📈 Current gameStats:", gameStats);
      } catch (error) {
        console.error("[Games] ❌ Erreur lors de la sauvegarde des stats:", error);
      } finally {
        // Augmentation du délai de protection à 2 secondes
        setTimeout(() => {
          isProcessingStats.current = false;
          console.log("[Games] 🔓 Stats processing lock released");
        }, 2000);
      }
    };

    if (window.api.onSaveGameStats) {
      window.api.onSaveGameStats(handleSaveStats);
    }

    return () => {
      // Cleanup listener
    };
  }, [loadGameStats]);

  // Gestionnaire global de changement de statut des jeux
  useEffect(() => {
    const handleGameStatusChange = (status) => {
      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        if (status.status === "running") {
          newSet.add(status.gameId);
        } else if (status.status === "stopped" || status.status === "failed") {
          newSet.delete(status.gameId);

          // Note: Le rechargement des stats est géré par save-game-stats, pas ici
          // pour éviter les race conditions et les doubles rechargements
        }
        return newSet;
      });

      // Mettre à jour les stats du jeu
      if (status.sessionDuration) {
        setGameStats((prev) => ({
          ...prev,
          [status.gameId]: {
            ...prev[status.gameId],
            currentSessionDuration: status.sessionDuration,
            lastActivity: Date.now(),
          },
        }));
      }
    };

    // Gestionnaire de progression de désinstallation
    const handleUninstallProgress = async (progress) => {
      if (progress.stage === "uninstalled") {
        // Si mode offline/pendingSync, ajouter à la queue
        if (progress.pendingSync || progress.offlineMode) {
          const installedData = installedGames.find(
            (g) => g.serverGameId?._id === progress.id
          );
          if (installedData) {
            await uninstallQueue.enqueue(
              progress.id,
              installedData.serverGameId?.name || "Unknown Game"
            );
            console.log(
              `[Games] 📴 Jeu ${progress.id} ajouté à la queue de désinstallation`
            );
          }
        }

        // Recharger la liste des jeux installés
        getInstalledGames()
          .then(async (installed) => {
            setInstalledGames(installed);
            // Mettre à jour le cache après désinstallation
            await updateInstalledGamesCache(installed);
          })
          .catch((err) => {
            console.warn("Could not refresh installed games:", err);
          });
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

  // Charger la taille du jeu sélectionné s'il est installé
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

  // Utilitaires
  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId);

  const getInstalledGameData = (gameId) =>
    installedGames.find((g) => g.serverGameId?._id === gameId);

  const isGamePlaying = (gameId) => playingGames.has(gameId);
  const isGameUninstalling = (gameId) => uninstalling.has(gameId);
  const isPendingUninstall = (gameId) => pendingUninstalls.has(gameId);

  // Filtrer les jeux
  const filteredGames = games.filter((game) => {
    const matchesSearch = game.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const gameGenres = getGenresArray(game);
    const matchesGenre =
      selectedGenre === "All" || gameGenres.includes(selectedGenre);

    return matchesSearch && matchesGenre;
  });

  // Obtenir tous les genres (safe extraction)
  const allGenres = [
    "All",
    ...new Set(games.flatMap((game) => getGenresArray(game))),
  ];

  // === GESTIONNAIRES D'ACTIONS ===

  const handleLaunchGame = async (game) => {
    try {
      // 🚫 Bloquer le lancement si le jeu est en attente de synchronisation de désinstallation
      if (isPendingUninstall(game._id)) {
        alert(
          `❌ Impossible de lancer "${game.name}".\n\nCe jeu a été désinstallé mais la synchronisation avec le serveur est en attente.\n\nVeuillez vous reconnecter au serveur pour terminer la synchronisation.`
        );
        return;
      }

      const installedData = getInstalledGameData(game._id);
      if (!installedData) {
        console.error("Données d'installation non trouvées pour", game.name);
        return;
      }

      // 1️⃣ Essayer de démarrer la session en base de données (mode en ligne)
      // Si le serveur n'est pas disponible, continuer quand même en mode hors ligne
      try {
        await launchGameAPI(game._id);
      } catch (error) {
        // Mode hors ligne - continuer sans bloquer
      }

      // 2️⃣ Mettre à jour l'interface
      setPlayingGames((prev) => new Set([...prev, game._id]));

      // 3️⃣ Lancer le processus du jeu (fonctionne hors ligne)
      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        null,
        game.name
      );

      if (!result.success) {
        console.error("Échec du lancement:", result.error);
        setPlayingGames((prev) => {
          const newSet = new Set(prev);
          newSet.delete(game._id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Erreur lors du lancement de", game.name, ":", error);
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
        console.error("Échec de l'arrêt:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt de", game.name, ":", error);
    }
  };

  const handleForceStopGame = async (game) => {
    try {
      const result = await gameManager.forceStopGame(game._id);
      if (!result.success) {
        console.error("Échec de l'arrêt forcé:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt forcé de", game.name, ":", error);
    }
  };

  const handleInstallGame = async (game) => {
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
              // Mettre à jour le cache après installation
              await updateInstalledGamesCache(installed);
            } catch (err) {
              console.warn("Could not refresh installed games:", err);
            }
          }, 2000);
        }
      }
    });

    try {
      await window.api.installGame(game);
    } catch (error) {
      console.error("Erreur lors de l'installation:", error);
      removeDownload(downloadId);
    }
  };

  const handleUninstallGame = async (game) => {
    const installedData = getInstalledGameData(game._id);
    if (!installedData) return;

    // Confirmer la désinstallation
    if (
      !confirm(
        `Êtes-vous sûr de vouloir désinstaller "${game.name}" ?\n\nCette action est irréversible.`
      )
    ) {
      return;
    }

    // CHECK IF SERVER IS OFFLINE FIRST
    if (!isOnline) {
      console.log(`[Games] 📴 Serveur offline - Ajout de ${game.name} à la queue`);
      await uninstallQueue.enqueue(game._id, game.name, installedData.path);
      alert(
        `⚠️ Serveur non disponible\n\n"${game.name}" a été ajouté à la file d'attente.\n\nLa désinstallation sera effectuée automatiquement lorsque le serveur sera disponible.\n\n🚫 Le jeu est maintenant bloqué.`
      );
      return;
    }

    // If online, proceed with normal uninstall
    try {
      setUninstalling((prev) => new Set([...prev, game._id]));

      const result = await gameManager.uninstallGame(
        game._id,
        installedData.path,
        game.name
      );

      if (!result.success) {
        console.error("Échec de la désinstallation:", result.error);
        setUninstalling((prev) => {
          const newSet = new Set(prev);
          newSet.delete(game._id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Erreur lors de la désinstallation:", error);
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
      const result = await gameManager.openGameFolder(installedData.path);
      console.log("Result:", result);
    } else {
      alert("Pas de chemin trouvé pour ce jeu");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de votre bibliothèque...</p>
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
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* === SIDEBAR GAUCHE - Liste des jeux === */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header avec recherche */}
        <div className="p-4 space-y-3">
          <h1 className="text-xl font-bold text-white">
            Bibliothèque
          </h1>

          {/* Barre de recherche */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Rechercher un jeu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all placeholder-gray-500"
            />
          </div>

          {/* Filtre par genre */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
          >
            {allGenres.map((genre, index) => (
              <option key={`${genre}-${index}`} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des jeux */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filteredGames.map((game) => {
            const installed = isInstalled(game._id);
            const playing = isGamePlaying(game._id);
            const stats = gameStats[game._id];
            const uninstalling = isGameUninstalling(game._id);
            const pending = isPendingUninstall(game._id);
            const gameGenres = getGenresArray(game);

            return (
              <div
                key={game._id}
                onClick={() => setSelectedGame(game)}
                className={`group relative cursor-pointer transition-all duration-200 rounded-lg mb-2 p-3 ${
                  selectedGame?._id === game._id
                    ? "bg-blue-600/20 border border-blue-500/50"
                    : "bg-gray-800/40 border border-transparent hover:bg-gray-800/60 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Miniature */}
                  <div className="relative w-12 h-12 bg-gray-700 rounded-md flex-shrink-0 overflow-hidden">
                    <img
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    {/* Badge de statut sur l'image */}
                    {playing && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                    )}
                  </div>

                  {/* Infos du jeu */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm text-white mb-1">
                      {game.name}
                    </h3>

                    {/* Stats et badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {installed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                          <span className="w-1 h-1 bg-green-400 rounded-full"></span>
                          Installé
                        </span>
                      )}

                      {uninstalling && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">
                          <FiTrash2 className="w-2.5 h-2.5" />
                          Suppression
                        </span>
                      )}

                      {pending && !uninstalling && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
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
                          Sync en attente
                        </span>
                      )}

                      {stats && stats.totalPlayTime !== "< 1 minute" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          <FiClock className="w-2.5 h-2.5" />
                          {stats.totalPlayTime}
                        </span>
                      )}

                      {!stats && !installed && gameGenres.length > 0 && (
                        <span className="text-gray-500 text-xs truncate">
                          {gameGenres[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer avec statistiques */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{games.length} jeux</span>
            <span className="text-green-400 font-medium">{installedGames.length} installés</span>
          </div>
        </div>
      </div>

      {/* === PANNEAU PRINCIPAL - Détails du jeu === */}
      <div className="flex-1 flex flex-col">
        {selectedGame ? (
          <>
            {/* Header avec image de fond */}
            <div className="relative h-64 bg-gray-800 overflow-hidden">
              {selectedGame.coverUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent">
                  <img
                    src={selectedGame.coverUrl}
                    alt={selectedGame.name}
                    className="w-full h-full object-cover opacity-70 blur-xs"
                  />
                </div>
              )}

              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-4xl font-bold text-white mb-2">
                  {selectedGame.name}
                </h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <span>
                    {getGenresArray(selectedGame).slice(0, 3).join(" • ") ||
                      "Aucun genre"}
                  </span>
                  {selectedGame.releaseDate && (
                    <span>
                      • {dayjs(selectedGame.releaseDate).format("YYYY")}
                    </span>
                  )}
                  {selectedGame.rating > 0 && (
                    <span>• ⭐ {selectedGame.rating.toFixed(1)}/10</span>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Colonne principale */}
                <div className="lg:col-span-2">
                  {/* Boutons d'action */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {(() => {
                      const installed = isInstalled(selectedGame._id);
                      const playing = isGamePlaying(selectedGame._id);
                      const uninstalling = isGameUninstalling(selectedGame._id);
                      const pending = isPendingUninstall(selectedGame._id);

                      // Jeu en attente de synchronisation
                      if (pending && !uninstalling) {
                        return (
                          <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-yellow-500/50 md:col-span-2 lg:col-span-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
                            <div className="relative z-10 text-center">
                              <div className="flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-xl mx-auto mb-4">
                                <svg
                                  className="w-8 h-8 text-yellow-400 animate-spin"
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
                              </div>
                              <div className="text-xl font-bold text-white mb-2">
                                Synchronisation en attente
                              </div>
                              <div className="text-sm text-slate-400 mb-3">
                                Ce jeu a été désinstallé mais attend la
                                synchronisation avec le serveur.
                              </div>
                              <div className="text-xs text-yellow-400">
                                🚫 Le jeu ne peut pas être lancé jusqu'à ce que la
                                synchronisation soit terminée.
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (uninstalling) {
                        return (
                          <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 md:col-span-2 lg:col-span-4">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
                            <div className="relative z-10 text-center">
                              <div className="flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-xl mx-auto mb-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-400 border-t-transparent"></div>
                              </div>
                              <div className="text-xl font-bold text-white mb-2">
                                Désinstallation en cours...
                              </div>
                              <div className="text-sm text-slate-400">
                                Suppression des fichiers du jeu
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (!installed) {
                        return (
                          <button
                            onClick={() => handleInstallGame(selectedGame)}
                            className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 md:col-span-2 lg:col-span-4"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10 text-center">
                              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-xl mx-auto mb-4">
                                <svg
                                  className="w-8 h-8 text-blue-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                                  />
                                </svg>
                              </div>
                              <div className="text-xl font-bold text-white mb-2">
                                Installer le jeu
                              </div>
                              <div className="text-sm text-slate-400">
                                Télécharger et installer ({selectedGame.sizeMB}{" "}
                                MB)
                              </div>
                            </div>
                          </button>
                        );
                      }

                      return (
                        <>
                          {/* Action Buttons Row */}
                          <div className="mb-8">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                                <FiPlay className="text-white text-lg" />
                              </div>
                              <h3 className="text-2xl font-bold text-white">
                                Actions
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              {playing ? (
                                <>
                                  <button
                                    onClick={() => handleStopGame(selectedGame)}
                                    className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-orange-500/50 transition-all duration-300"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10 text-center">
                                      <div className="flex items-center justify-center w-12 h-12 bg-orange-500/20 rounded-xl mx-auto mb-3">
                                        <FiSquare className="text-orange-400 text-2xl" />
                                      </div>
                                      <div className="text-lg font-bold text-white mb-1">
                                        Arrêter
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Terminer la session
                                      </div>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() =>
                                      handleForceStopGame(selectedGame)
                                    }
                                    className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-red-500/50 transition-all duration-300"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10 text-center">
                                      <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-xl mx-auto mb-3">
                                        <FiZap className="text-red-400 text-2xl" />
                                      </div>
                                      <div className="text-lg font-bold text-white mb-1">
                                        Forcer l'arrêt
                                      </div>
                                      <div className="text-sm text-slate-400">
                                        Arrêt forcé
                                      </div>
                                    </div>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleLaunchGame(selectedGame)}
                                  className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-green-500/50 transition-all duration-300 md:col-span-2"
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  <div className="relative z-10 text-center">
                                    <div className="flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-xl mx-auto mb-4">
                                      <FiPlay className="text-green-400 text-3xl" />
                                    </div>
                                    <div className="text-xl font-bold text-white mb-2">
                                      Jouer maintenant
                                    </div>
                                    <div className="text-sm text-slate-400">
                                      Lancer le jeu
                                    </div>
                                  </div>
                                </button>
                              )}

                              <button
                                onClick={() => openGameFolder(selectedGame)}
                                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative z-10 text-center">
                                  <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-xl mx-auto mb-3">
                                    <FiFolder className="text-blue-400 text-2xl" />
                                  </div>
                                  <div className="text-lg font-bold text-white mb-1">
                                    Dossier
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    Ouvrir le dossier
                                  </div>
                                </div>
                              </button>

                              <button
                                onClick={() =>
                                  handleUninstallGame(selectedGame)
                                }
                                className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-red-500/50 transition-all duration-300"
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <div className="relative z-10 text-center">
                                  <div className="flex items-center justify-center w-12 h-12 bg-red-500/20 rounded-xl mx-auto mb-3">
                                    <FiTrash2 className="text-red-400 text-2xl" />
                                  </div>
                                  <div className="text-lg font-bold text-white mb-1">
                                    Désinstaller
                                  </div>
                                  <div className="text-sm text-slate-400">
                                    Supprimer le jeu
                                  </div>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Statistics Section */}
                          {isInstalled(selectedGame._id) &&
                            gameStats[selectedGame._id] &&
                            gameStats[selectedGame._id].totalSessions > 0 && (
                              <div className="mt-8">
                                <div className="flex items-center gap-3 mb-6">
                                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                                    <FiBarChart2 className="text-white text-lg" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-white">
                                    Statistiques de jeu
                                  </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                  {/* Total Play Time */}
                                  <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-slate-400 text-sm font-medium">
                                          Temps total
                                        </span>
                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-lg">
                                          <FiClock className="text-blue-400 text-lg" />
                                        </div>
                                      </div>
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {gameStats[selectedGame._id]
                                          .totalPlayTime || "0h 0m"}
                                      </div>
                                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Total Sessions */}
                                  <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-slate-400 text-sm font-medium">
                                          Sessions
                                        </span>
                                        <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 rounded-lg">
                                          <FiTarget className="text-purple-400 text-lg" />
                                        </div>
                                      </div>
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {gameStats[selectedGame._id]
                                          .totalSessions || 0}
                                      </div>
                                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-2/3" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Average Session */}
                                  <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10">
                                      <div className="flex items-center justify-between mb-3">
                                        <span className="text-slate-400 text-sm font-medium">
                                          Temps moyen
                                        </span>
                                        <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 rounded-lg">
                                          <FiTrendingUp className="text-emerald-400 text-lg" />
                                        </div>
                                      </div>
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {gameStats[selectedGame._id]
                                          .averageSessionTime || "0h 0m"}
                                      </div>
                                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full w-1/2" />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Additional Info Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                                        <FiPlay className="text-white text-lg" />
                                      </div>
                                      <span className="text-slate-300 font-medium">
                                        Premier lancement
                                      </span>
                                    </div>
                                    <div className="text-white font-semibold text-lg">
                                      {gameStats[selectedGame._id]
                                        ?.firstLaunchedFormatted || "Jamais"}
                                    </div>
                                  </div>

                                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
                                    <div className="flex items-center gap-3 mb-3">
                                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl">
                                        <FiActivity className="text-white text-lg" />
                                      </div>
                                      <span className="text-slate-300 font-medium">
                                        Dernière session
                                      </span>
                                    </div>
                                    <div className="text-white font-semibold text-lg">
                                      {gameStats[selectedGame._id]
                                        .lastPlayedFormatted || "Jamais"}
                                    </div>
                                  </div>
                                </div>

                                {/* Live Gaming Badge */}
                                {isGamePlaying(selectedGame._id) && (
                                  <div className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 flex items-center justify-center gap-3 shadow-lg">
                                    <div className="flex items-center gap-2">
                                      <span className="animate-pulse text-2xl">
                                        🎮
                                      </span>
                                      <span className="font-bold text-lg text-white">
                                        Partie en cours...
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      <div
                                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                                        style={{ animationDelay: "0ms" }}
                                      ></div>
                                      <div
                                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                                        style={{ animationDelay: "150ms" }}
                                      ></div>
                                      <div
                                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                                        style={{ animationDelay: "300ms" }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold mb-3">À propos</h2>
                    <p className="text-gray-300 leading-relaxed">
                      {selectedGame.summary ||
                        selectedGame.storyline ||
                        "Aucune description disponible."}
                    </p>
                  </div>
                </div>

                {/* Sidebar droite - Infos détaillées */}
                <div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-bold mb-4">Informations</h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-400">Développeur:</span>
                        <p className="text-white">Inconnu</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Éditeur:</span>
                        <p className="text-white">Inconnu</p>
                      </div>

                      <div>
                        <span className="text-gray-400">Date de sortie:</span>
                        <p className="text-white">
                          {selectedGame.releaseDate
                            ? dayjs(selectedGame.releaseDate).format(
                                "DD/MM/YYYY"
                              )
                            : "Inconnue"}
                        </p>
                      </div>

                      <div>
                        <span className="text-gray-400">Genres:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getGenresArray(selectedGame).map((genre, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-600 text-xs rounded"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400">Plateformes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getPlatformsArray(selectedGame).map(
                            (platform, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-600 text-xs rounded"
                              >
                                {platform}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {isInstalled(selectedGame._id) && (
                        <>
                          <div>
                            <span className="text-gray-400">
                              Taille installée:
                            </span>
                            <p className="text-white">
                              {gameSize ? `${gameSize.sizeGB} GB` : "Calcul..."}
                            </p>
                          </div>

                          <div>
                            <span className="text-gray-400">
                              Dernière session:
                            </span>
                            <p className="text-white">Jamais</p>
                          </div>
                        </>
                      )}

                      {!isInstalled(selectedGame._id) && (
                        <div>
                          <span className="text-gray-400">
                            Taille téléchargement:
                          </span>
                          <p className="text-white">{selectedGame.sizeMB} MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-xl font-semibold mb-2">
                Sélectionnez un jeu
              </h2>
              <p>Choisissez un jeu dans la liste pour voir ses détails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Games;
