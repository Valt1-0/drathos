// src/renderer/src/pages/Games.jsx - Interface Steam-like 🎮

import { useState, useEffect } from "react";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { useDownload } from "../contexts/downloadContext";
import gameManager from "../services/gameManager";
import dayjs from "dayjs";

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
  const [gameStats, setGameStats] = useState(new Map());
  const [uninstalling, setUninstalling] = useState(new Set());

  const { addDownload, updateDownloadProgress, removeDownload } = useDownload();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const [allGames, installed] = await Promise.all([
          getAllServerGames(),
          getInstalledGames(),
        ]);

        setGames(allGames || []);
        setInstalledGames(installed || []);

        // Initialiser l'état des jeux en cours
        const activeGames = await gameManager.getActiveGames();
        const playingSet = new Set(activeGames.map((game) => game.gameId));
        setPlayingGames(playingSet);

        // Sélectionner le premier jeu par défaut
        if (allGames && allGames.length > 0) {
          setSelectedGame(allGames[0]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des jeux :", err);
        setError("Erreur lors du chargement des jeux.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Gestionnaire global de changement de statut des jeux
  useEffect(() => {
    const handleGameStatusChange = (status) => {
      console.log("[Games] Changement de statut:", status);

      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        if (status.status === "running") {
          newSet.add(status.gameId);
        } else if (status.status === "stopped" || status.status === "failed") {
          newSet.delete(status.gameId);
        }
        return newSet;
      });

      // Mettre à jour les stats du jeu
      if (status.sessionDuration) {
        setGameStats((prev) => {
          const newStats = new Map(prev);
          newStats.set(status.gameId, {
            ...newStats.get(status.gameId),
            currentSessionDuration: status.sessionDuration,
            lastActivity: Date.now(),
          });
          return newStats;
        });
      }
    };

    // Gestionnaire de progression de désinstallation
    const handleUninstallProgress = (progress) => {
      console.log("[Games] Progression désinstallation:", progress);

      if (progress.stage === "uninstalled") {
        // Recharger la liste des jeux installés
        getInstalledGames().then(setInstalledGames);
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
    installedGames.some((g) => g.serverGameId._id === gameId);

  const getInstalledGameData = (gameId) =>
    installedGames.find((g) => g.serverGameId._id === gameId);

  const isGamePlaying = (gameId) => playingGames.has(gameId);
  const isGameUninstalling = (gameId) => uninstalling.has(gameId);

  // Filtrer les jeux
  const filteredGames = games.filter((game) => {
    const matchesSearch = game.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesGenre =
      selectedGenre === "All" || game.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

  // Obtenir tous les genres
  const allGenres = ["All", ...new Set(games.flatMap((game) => game.genres))];

  // === GESTIONNAIRES D'ACTIONS ===

  const handleLaunchGame = async (game) => {
    try {
      const installedData = getInstalledGameData(game._id);
      if (!installedData) {
        console.error("Données d'installation non trouvées pour", game.name);
        return;
      }

      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        null,
        game.name
      );

      if (!result.success) {
        console.error("Échec du lancement:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors du lancement de", game.name, ":", error);
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
          setTimeout(() => {
            removeDownload(downloadId);
            getInstalledGames().then(setInstalledGames);
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
    if (installedData) {
      await gameManager.openGameFolder(installedData.path);
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
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header avec recherche */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold mb-3 text-blue-400">Bibliothèque</h1>

          {/* Barre de recherche */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="Rechercher un jeu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white pl-3 pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute right-3 top-2.5 text-gray-400">🔍</div>
          </div>

          {/* Filtre par genre */}
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        {/* Liste des jeux */}
        <div className="flex-1 overflow-y-auto">
          {filteredGames.map((game) => {
            const installed = isInstalled(game._id);
            const playing = isGamePlaying(game._id);
            const uninstalling = isGameUninstalling(game._id);

            return (
              <div
                key={game._id}
                onClick={() => setSelectedGame(game)}
                className={`p-3 cursor-pointer border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                  selectedGame?._id === game._id
                    ? "bg-blue-600 hover:bg-blue-600"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Miniature */}
                  <div className="w-12 h-12 bg-gray-600 rounded flex-shrink-0 overflow-hidden">
                    <img
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-medium truncate ${
                          installed ? "text-white" : "text-gray-400"
                        }`}
                      >
                        {game.name}
                      </h3>

                      {/* Statuts */}
                      {playing && (
                        <span className="text-green-400 text-xs">●</span>
                      )}
                      {uninstalling && (
                        <span className="text-orange-400 text-xs">🗑️</span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 truncate">
                      {Array.isArray(game.genres)
                        ? game.genres
                            .slice(0, 2)
                            .map((g) => (typeof g === "object" ? g.name : g))
                            .join(", ")
                        : "Inconnu"}
                    </div>

                    {installed && (
                      <div className="text-xs text-green-400">Installé</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer avec statistiques */}
        <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>{games.length} jeux</span>
            <span>{installedGames.length} installés</span>
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
                    className="w-full h-full object-cover opacity-30 blur-sm"
                  />
                </div>
              )}

              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-4xl font-bold text-white mb-2">
                  {selectedGame.name}
                </h1>
                <div className="flex items-center gap-4 text-gray-300">
                  <span>
                    {Array.isArray(selectedGame.genres)
                      ? selectedGame.genres
                          .slice(0, 3)
                          .map((g) => (typeof g === "object" ? g.name : g))
                          .join(" • ")
                      : "Inconnu"}
                  </span>{" "}
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

                      if (uninstalling) {
                        return (
                          <button className="px-6 py-3 bg-orange-600 rounded-lg font-medium cursor-not-allowed">
                            🗑️ Désinstallation...
                          </button>
                        );
                      }

                      if (!installed) {
                        return (
                          <button
                            onClick={() => handleInstallGame(selectedGame)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                          >
                            📥 Installer
                          </button>
                        );
                      }

                      return (
                        <>
                          {playing ? (
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleStopGame(selectedGame)}
                                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-medium transition-colors"
                              >
                                ⏹️ Arrêter
                              </button>
                              <button
                                onClick={() =>
                                  handleForceStopGame(selectedGame)
                                }
                                className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                              >
                                ⚡ Forcer l'arrêt
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleLaunchGame(selectedGame)}
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
                            >
                              ▶️ Jouer
                            </button>
                          )}

                          <button
                            onClick={() => openGameFolder(selectedGame)}
                            className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium transition-colors"
                          >
                            📁 Dossier
                          </button>

                          <button
                            onClick={() => handleUninstallGame(selectedGame)}
                            className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
                          >
                            🗑️ Désinstaller
                          </button>
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

                  {/* Captures d'écran (placeholder) */}
                  <div>
                    <h2 className="text-xl font-bold mb-3">Captures d'écran</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center"
                        >
                          <span className="text-gray-500">Image {i}</span>
                        </div>
                      ))}
                    </div>
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
                          {Array.isArray(selectedGame.genres) &&
                            selectedGame.genres.map((genre, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-600 text-xs rounded"
                              >
                                {typeof genre === "object"
                                  ? genre.name || genre.slug
                                  : genre}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400">Plateformes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedGame.platforms?.map((platform) => (
                            <span
                              key={platform}
                              className="px-2 py-1 bg-gray-600 text-xs rounded"
                            >
                              {platform}
                            </span>
                          )) || <span className="text-gray-500">PC</span>}
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
