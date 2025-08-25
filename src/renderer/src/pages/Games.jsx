// drathos/src/renderer/src/pages/Games.jsx

import { useState, useEffect } from "react";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { useDownload } from "../contexts/downloadContext";
import gameManager from "../api/gameManager";
import dayjs from "dayjs";

const Games = () => {
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour le tracking des jeux en cours
  const [playingGames, setPlayingGames] = useState(new Set());
  const [gameStats, setGameStats] = useState(new Map());

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

    // Ajouter le listener global
    gameManager.addStatusListener("*", handleGameStatusChange);

    // Nettoyage à la désactivation du composant
    return () => {
      gameManager.removeStatusListener("*", handleGameStatusChange);
    };
  }, []);

  // Utilitaires
  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId._id === gameId);

  const getInstalledGameData = (gameId) =>
    installedGames.find((g) => g.serverGameId._id === gameId);

  const isGamePlaying = (gameId) => playingGames.has(gameId);

  // Gestionnaire de lancement de jeu
  const handleLaunchGame = async (game) => {
    try {
      const installedData = getInstalledGameData(game._id);
      if (!installedData) {
        console.error("Données d'installation non trouvées pour", game.name);
        return;
      }

      console.log("[Games] Lancement de", game.name);
      console.log("[Games] Chemin:", installedData.path);

      // Utiliser la détection automatique (pas besoin de spécifier l'exécutable)
      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        null, // Exécutable détecté automatiquement
        game.name // Nom du jeu pour aider la détection
      );

      if (!result.success) {
        console.error("Échec du lancement:", result.error);

        // Si la détection automatique échoue, proposer une sélection manuelle
        if (result.error.includes("détecter l'exécutable")) {
          await handleManualExecutableSelection(game, installedData);
        }
      }
    } catch (error) {
      console.error("Erreur lors du lancement de", game.name, ":", error);
    }
  };

  // Gestionnaire pour la sélection manuelle d'exécutable
  const handleManualExecutableSelection = async (game, installedData) => {
    try {
      // Détecter tous les exécutables disponibles
      const executables = await gameManager.detectExecutables(
        installedData.path,
        game.name
      );

      if (executables.length === 0) {
        console.error("Aucun exécutable trouvé pour", game.name);
        return;
      }

      // Pour l'instant, prendre le premier exécutable trouvé
      // TODO: Ouvrir un dialogue pour laisser l'utilisateur choisir
      const selectedExecutable = executables[0].fileName;

      console.log(`[Games] Sélection manuelle: ${selectedExecutable}`);

      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        selectedExecutable,
        game.name
      );

      if (!result.success) {
        console.error(
          "Échec du lancement même avec sélection manuelle:",
          result.error
        );
      }
    } catch (error) {
      console.error("Erreur lors de la sélection manuelle:", error);
    }
  };

  // Gestionnaire d'arrêt de jeu
  const handleStopGame = async (game) => {
    try {
      console.log("[Games] Arrêt de", game.name);

      const result = await gameManager.stopGame(game._id);

      if (!result.success) {
        console.error("Échec de l'arrêt:", result.error);
        // TODO: Afficher une notification d'erreur
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt de", game.name, ":", error);
    }
  };

  // Gestionnaire d'arrêt forcé
  const handleForceStopGame = async (game) => {
    try {
      console.log("[Games] Arrêt forcé de", game.name);

      const result = await gameManager.stopGame(game._id, true);

      if (!result.success) {
        console.error("Échec de l'arrêt forcé:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'arrêt forcé de", game.name, ":", error);
    }
  };

  // Gestionnaire d'installation
  const handleInstall = async (game) => {
    const downloadId = `${game._id}-${Date.now()}`;
    addDownload({
      id: downloadId,
      name: game.name,
      image: game.coverUrl,
      progress: 0,
      speed: 0,
      sizeDownloaded: 0,
      totalSize: game.sizeMB,
      stage: "Downloading",
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
            // Recharger les jeux installés
            getInstalledGames().then(setInstalledGames);
          }, 3000);
        }
      }
    });

    try {
      const response = await window.api.installGame(game);
      if (response.success) {
        // Recharger immédiatement les jeux installés
        const updated = await getInstalledGames();
        setInstalledGames(updated);
      }
    } catch (error) {
      console.error("Erreur d'installation:", error);
    }
  };

  // Gestionnaire pour ouvrir le dossier du jeu
  const handleOpenGameFolder = async (installedData) => {
    try {
      const result = await gameManager.openGameFolder(installedData.path);
      if (!result.success) {
        console.error("Impossible d'ouvrir le dossier:", result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'ouverture du dossier:", error);
    }
  };

  // Formatage des utilitaires
  const formatFileSize = (sizeInMB) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB} MB`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // Filtrage des jeux
  const filteredGames = games.filter((game) => {
    const matchSearch = game.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchGenre =
      selectedGenre === "All" ||
      (game.genres && game.genres.some((g) => g.name === selectedGenre));
    return matchSearch && matchGenre;
  });

  // Gestion du loading et des erreurs
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Chargement des jeux...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-900 text-white p-6">
      {/* Header avec recherche et filtres */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <input
            type="text"
            placeholder="Rechercher un jeu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">Tous les genres</option>
            {/* TODO: Extraire dynamiquement les genres */}
            <option value="Action">Action</option>
            <option value="Adventure">Aventure</option>
            <option value="RPG">RPG</option>
            <option value="Strategy">Stratégie</option>
          </select>
        </div>

        <div className="text-sm text-gray-400">
          {filteredGames.length} jeu(s) • {installedGames.length} installé(s) •{" "}
          {playingGames.size} en cours
        </div>
      </div>

      {/* Grille des jeux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredGames.map((game) => {
          const installed = isInstalled(game._id);
          const playing = isGamePlaying(game._id);
          const installedData = installed
            ? getInstalledGameData(game._id)
            : null;
          const stats = gameStats.get(game._id);

          return (
            <div
              key={game._id}
              className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl ${
                playing ? "ring-2 ring-green-500" : ""
              }`}
            >
              {/* Image du jeu */}
              <div className="relative">
                <img
                  src={game.coverUrl || "/placeholder-game.jpg"}
                  alt={game.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder-game.jpg";
                  }}
                />

                {playing && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                    EN COURS
                  </div>
                )}
              </div>

              {/* Informations du jeu */}
              <div className="p-4">
                <h3 className="text-lg font-bold mb-2 truncate">{game.name}</h3>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {game.genres?.slice(0, 2).map((genre, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-700 text-xs rounded"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>

                {/* Taille et note */}
                <div className="text-sm text-gray-400 mb-3">
                  <div>{formatFileSize(game.sizeMB)}</div>
                  {game.rating && (
                    <div>Note: {Math.round(game.rating)}/100</div>
                  )}
                </div>

                {/* Stats si installé et des stats existent */}
                {installed && installedData?.stats && (
                  <div className="text-sm text-gray-400 mb-3 border-t border-gray-700 pt-2">
                    <div>
                      Temps joué: {installedData.stats.totalPlayTime || 0}h
                    </div>
                    <div>
                      Sessions: {installedData.stats.totalSessions || 0}
                    </div>
                    {installedData.stats.lastPlayed && (
                      <div>
                        Dernière fois:{" "}
                        {dayjs(installedData.stats.lastPlayed).format(
                          "DD/MM/YY"
                        )}
                      </div>
                    )}
                    {stats?.currentSessionDuration && (
                      <div className="text-green-400">
                        Session: {formatDuration(stats.currentSessionDuration)}
                      </div>
                    )}
                  </div>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  {!installed ? (
                    <button
                      onClick={() => handleInstall(game)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                    >
                      Installer
                    </button>
                  ) : !playing ? (
                    <>
                      <button
                        onClick={() => handleLaunchGame(game)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
                      >
                        Jouer
                      </button>
                      <button
                        onClick={() => handleOpenGameFolder(installedData)}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        title="Ouvrir le dossier"
                      >
                        📁
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStopGame(game)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
                      >
                        Arrêter
                      </button>
                      <button
                        onClick={() => handleForceStopGame(game)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        title="Arrêt forcé"
                      >
                        ⏹️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message si aucun jeu */}
      {filteredGames.length === 0 && (
        <div className="text-center text-gray-400 mt-12">
          <div className="text-6xl mb-4">🎮</div>
          <div className="text-xl mb-2">Aucun jeu trouvé</div>
          <div>Essayez de modifier vos critères de recherche</div>
        </div>
      )}
    </div>
  );
};

export default Games;
