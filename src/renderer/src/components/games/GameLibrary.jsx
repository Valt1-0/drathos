import React, { useMemo } from "react";
import { FiSearch, FiClock, FiTrash2, FiPlus } from "react-icons/fi";
import GameCover from "../GameCover";

const GameLibrary = ({
  games,
  selectedGameId,
  onSelectGame,
  searchTerm,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  installedGames,
  playingGames,
  uninstallingGames,
  pendingUninstalls,
  gameStats,
  user,
  onAddGame,
  getGenresArray,
}) => {
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const gameGenres = getGenresArray(game);
      const matchesGenre =
        selectedGenre === "All" || gameGenres.includes(selectedGenre);

      return matchesSearch && matchesGenre;
    });
  }, [games, searchTerm, selectedGenre, getGenresArray]);

  const allGenres = useMemo(() => {
    return [
      "All",
      ...new Set(games.flatMap((game) => getGenresArray(game))),
    ];
  }, [games, getGenresArray]);

  const isInstalled = (gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId);

  const isGamePlaying = (gameId) => playingGames.has(gameId);
  const isGameUninstalling = (gameId) => uninstallingGames.has(gameId);
  const isPendingUninstall = (gameId) => pendingUninstalls.has(gameId);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 space-y-3">
        <h1 className="text-xl font-bold text-white">Bibliothèque</h1>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Rechercher un jeu..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-800 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all placeholder-gray-500"
          />
        </div>

        <select
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value)}
          className="w-full bg-gray-800 text-white text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 transition-all"
        >
          {allGenres.map((genre, index) => (
            <option key={`${genre}-${index}`} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </div>

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
              onClick={() => onSelectGame(game)}
              className={`group relative cursor-pointer transition-all duration-200 rounded-lg mb-2 p-3 ${
                selectedGameId === game._id
                  ? "bg-blue-600/20 border border-blue-500/50"
                  : "bg-gray-800/40 border border-transparent hover:bg-gray-800/60 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-gray-700 rounded-md flex-shrink-0 overflow-hidden">
                  <GameCover
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                    size="thumb"
                  />
                  {playing && (
                    <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate text-sm text-white mb-1">
                    {game.name}
                  </h3>

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

                    {stats && stats.totalPlayTime && stats.totalPlayTime !== "< 1 minute" && !stats.totalPlayTime.includes("NaN") && (
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

      <div className="p-4 border-t border-gray-800 space-y-3">
        {user?.role === "admin" && (
          <button
            onClick={onAddGame}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
          >
            <FiPlus className="text-lg" />
            Ajouter un jeu
          </button>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{games.length} jeux</span>
          <span className="text-green-400 font-medium">
            {installedGames.length} installés
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameLibrary;
