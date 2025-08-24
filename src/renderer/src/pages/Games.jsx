// drathos/src/renderer/src/pages/Games.jsx

import { useState, useEffect } from "react";
import { getAllServerGames } from "../api/serverGames";
import {
  getInstalledGames,
  launchGame,
  stopGame,
  getGameStats,
} from "../api/installedGames";
import { useDownload } from "../contexts/downloadContext";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

const Games = () => {
  const [games, setGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameStats, setGameStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingGames, setPlayingGames] = useState(new Set());

  const { addDownload, updateDownloadProgress, removeDownload } = useDownload();

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const token = await window.store.get("userToken");

        if (!token || typeof token !== "string") {
          throw new Error("Token utilisateur invalide.");
        }

        const decoded = jwtDecode(token);
        const userId = decoded.user.id;

        const [allGames, installed] = await Promise.all([
          getAllServerGames(),
          getInstalledGames(),
        ]);

        setGames(allGames || []);
        setInstalledGames(installed || []);

        // Détecter les jeux en cours de lecture
        const currentlyPlaying = installed
          .filter((game) => game.formattedStats?.isCurrentlyPlaying)
          .map((game) => game.serverGameId._id);
        setPlayingGames(new Set(currentlyPlaying));
      } catch (err) {
        console.error("Erreur lors du chargement des jeux :", err);
        setError("Erreur lors du chargement des jeux.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Charger les stats quand un jeu est sélectionné
  useEffect(() => {
    if (selectedGame && isInstalled(selectedGame._id)) {
      getGameStats(selectedGame._id)
        .then((stats) => setGameStats(stats))
        .catch((err) => console.error("Error loading stats:", err));
    } else {
      setGameStats(null);
    }
  }, [selectedGame, installedGames]);

  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId._id === gameId);

  const getInstalledGameData = (gameId) =>
    installedGames.find((g) => g.serverGameId._id === gameId);

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
      console.error("Installation error:", error);
    }
  };

  const handleLaunchGame = async (game) => {
    try {
      setPlayingGames((prev) => new Set([...prev, game._id]));

      const result = await launchGame(game._id);
      console.log("Game launched:", result);

      // Ici vous pouvez ajouter la logique pour lancer le jeu réellement
      // Par exemple: window.api.launchGameExecutable(result.gamePath)
    } catch (error) {
      console.error("Error launching game:", error);
      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(game._id);
        return newSet;
      });
    }
  };

  const handleStopGame = async (game) => {
    try {
      const result = await stopGame(game._id);
      console.log("Game stopped:", result);

      setPlayingGames((prev) => {
        const newSet = new Set(prev);
        newSet.delete(game._id);
        return newSet;
      });

      // Recharger les stats
      const updatedStats = await getGameStats(game._id);
      setGameStats(updatedStats);
    } catch (error) {
      console.error("Error stopping game:", error);
    }
  };

  const formatFileSize = (sizeInMB) => {
    if (sizeInMB >= 1024) {
      return `${(sizeInMB / 1024).toFixed(1)} GB`;
    }
    return `${sizeInMB} MB`;
  };

  const filteredGames = games.filter((game) => {
    const matchSearch = game.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchGenre =
      selectedGenre === "All" ||
      (game.genres && game.genres.some((g) => g.name === selectedGenre));
    return matchSearch && matchGenre;
  });

  const allGenres = [
    "All",
    ...new Set(
      games.flatMap((g) => g.genres?.map((genre) => genre.name)).filter(Boolean)
    ),
  ];

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Chargement...
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center h-screen text-red-400">
        {error}
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 border-r border-gray-700 flex flex-col">
        <input
          type="text"
          placeholder="🔍 Rechercher"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 mb-3 bg-gray-700 text-sm rounded placeholder-gray-400"
        />
        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          className="w-full mb-3 p-2 bg-gray-700 text-sm rounded"
        >
          {allGenres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <ul className="overflow-y-auto flex-1 text-sm space-y-1">
          {filteredGames.map((game) => {
            const installed = isInstalled(game._id);
            const isPlaying = playingGames.has(game._id);

            return (
              <li
                key={game._id}
                onClick={() => setSelectedGame(game)}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedGame?._id === game._id
                    ? "bg-gray-700"
                    : "hover:bg-gray-700"
                } ${
                  installed
                    ? "text-white border-l-2 border-green-500"
                    : "text-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{game.name}</span>
                  {isPlaying && (
                    <span className="text-green-400 text-xs">●</span>
                  )}
                  {installed && !isPlaying && (
                    <span className="text-blue-400 text-xs">✓</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Détails du jeu sélectionné */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedGame ? (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex gap-6">
              <img
                src={`https:${selectedGame.coverUrl}`}
                alt={selectedGame.name}
                className="w-80 h-48 object-cover rounded shadow-lg"
              />

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-blue-500">
                  {selectedGame.name}
                </h2>

                <div className="text-sm mt-2 space-y-1 text-gray-300">
                  <p>
                    <strong>Genres:</strong>{" "}
                    {selectedGame.genres?.map((g) => g.name).join(", ")}
                  </p>
                  <p>
                    <strong>Plateformes:</strong>{" "}
                    {selectedGame.platforms?.join(", ")}
                  </p>
                  <p>
                    <strong>Version:</strong> {selectedGame.version}
                  </p>
                  <p>
                    <strong>Taille:</strong>{" "}
                    {formatFileSize(selectedGame.sizeMB)}
                  </p>
                  <p>
                    <strong>Date de sortie:</strong>{" "}
                    {dayjs(selectedGame.releaseDate).format("DD/MM/YYYY")}
                  </p>
                  <p>
                    <strong>Note IGDB:</strong>{" "}
                    {selectedGame.aggregatedRating || "?"}/100
                  </p>
                </div>

                {/* Boutons d'action dynamiques */}
                <div className="mt-4 flex gap-2">
                  {!isInstalled(selectedGame._id) ? (
                    <button
                      onClick={() => handleInstall(selectedGame)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      📥 Installer
                    </button>
                  ) : (
                    <>
                      {!playingGames.has(selectedGame._id) ? (
                        <button
                          onClick={() => handleLaunchGame(selectedGame)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                        >
                          ▶️ Jouer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStopGame(selectedGame)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                        >
                          ⏹️ Arrêter
                        </button>
                      )}
                      <button
                        onClick={() =>
                          console.log("Désinstaller", selectedGame)
                        }
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
                      >
                        🗑️ Désinstaller
                      </button>
                    </>
                  )}
                </div>

                {/* Statistiques de jeu */}
                {gameStats && (
                  <div className="mt-4 bg-gray-800/50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-green-400">
                      📊 Statistiques
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Temps total:</span>
                        <span className="ml-2 text-white">
                          {gameStats.totalPlayTime}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Sessions:</span>
                        <span className="ml-2 text-white">
                          {gameStats.totalSessions}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Dernière partie:</span>
                        <span className="ml-2 text-white">
                          {gameStats.lastPlayed
                            ? new Date(
                                gameStats.lastPlayed
                              ).toLocaleDateString()
                            : "Jamais joué"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Moyenne/session:</span>
                        <span className="ml-2 text-white">
                          {gameStats.averageSessionTime}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reste du contenu... */}
            <div className="bg-gray-800 rounded p-4">
              <h3 className="text-lg font-semibold mb-2">Résumé</h3>
              <p className="text-gray-300 text-sm">
                {selectedGame.summary || "Aucun résumé."}
              </p>
            </div>

            {selectedGame.storyline && (
              <div className="bg-gray-800 rounded p-4">
                <h3 className="text-lg font-semibold mb-2">Histoire</h3>
                <p className="text-gray-400 text-sm italic">
                  {selectedGame.storyline}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-32 text-lg">
            Sélectionnez un jeu à gauche pour voir les détails.
          </div>
        )}
      </div>
    </div>
  );
};

export default Games;
