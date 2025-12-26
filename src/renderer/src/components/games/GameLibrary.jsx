import React, { useMemo, useCallback, useState, useEffect } from "react";
import { FiSearch, FiClock, FiTrash2, FiPlus } from "react-icons/fi";
import GameCover from "../GameCover";

const GameLibrary = ({
  games,
  selectedGameId,
  onSelectGame,
  searchTerm,
  debouncedSearchTerm,
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
  const [FixedSizeList, setFixedSizeList] = useState(null);

  // Charger react-window de manière asynchrone pour éviter les problèmes d'imports
  useEffect(() => {
    import('react-window')
      .then((module) => {
        setFixedSizeList(() => module.FixedSizeList);
      })
      .catch((err) => {
        console.warn('[GameLibrary] Failed to load react-window, using fallback:', err);
      });
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name
        .toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase());

      const gameGenres = getGenresArray(game);
      const matchesGenre =
        selectedGenre === "All" || gameGenres.includes(selectedGenre);

      return matchesSearch && matchesGenre;
    });
  }, [games, debouncedSearchTerm, selectedGenre, getGenresArray]);

  const allGenres = useMemo(() => {
    return [
      "All",
      ...new Set(games.flatMap((game) => getGenresArray(game))),
    ];
  }, [games, getGenresArray]);

  const isInstalled = useCallback((gameId) =>
    installedGames.some((g) => g.serverGameId?._id === gameId),
    [installedGames]
  );

  const isGamePlaying = useCallback((gameId) => playingGames.has(gameId), [playingGames]);
  const isGameUninstalling = useCallback((gameId) => uninstallingGames.has(gameId), [uninstallingGames]);
  const isPendingUninstall = useCallback((gameId) => pendingUninstalls.has(gameId), [pendingUninstalls]);

  // Composant pour chaque ligne de jeu (virtualisé)
  const GameRow = ({ index, style }) => {
    const game = filteredGames[index];
    if (!game) return null; // Protection si index invalide

    const installed = isInstalled(game._id);
    const playing = isGamePlaying(game._id);
    const stats = gameStats[game._id];
    const uninstalling = isGameUninstalling(game._id);
    const pending = isPendingUninstall(game._id);
    const gameGenres = getGenresArray(game);
    const isSelected = selectedGameId === game._id;

    return (
      <div style={style} className="px-3 py-0.5">
        <div
          onClick={() => onSelectGame(game)}
          className={`group relative cursor-pointer transition-all duration-200 rounded-md p-2 ${
            isSelected
              ? "bg-blue-600/10 ring-1 ring-blue-500/50"
              : "hover:bg-gray-800/60"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {/* Cover compact */}
            <div className="relative w-12 h-12 bg-gray-700 rounded-md flex-shrink-0 overflow-hidden">
              <GameCover
                src={game.coverUrl}
                alt={game.name}
                className="w-full h-full object-cover"
                size="thumb"
              />

              {/* Badge playing */}
              {playing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Badge installed */}
              {installed && !playing && (
                <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              )}
            </div>

            {/* Info du jeu */}
            <div className="flex-1 min-w-0">
              <h3 className={`font-medium truncate text-sm mb-0.5 ${
                isSelected ? "text-white" : "text-gray-200"
              }`}>
                {game.name}
              </h3>

              {/* Statut */}
              <div className="flex items-center gap-1.5 text-xs">
                {stats && stats.totalPlayTime && stats.totalPlayTime !== "< 1 minute" && !stats.totalPlayTime.includes("NaN") && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <FiClock className="w-2.5 h-2.5" />
                    <span>{stats.totalPlayTime}</span>
                  </div>
                )}

                {uninstalling && (
                  <div className="flex items-center gap-1 text-orange-400">
                    <FiTrash2 className="w-2.5 h-2.5" />
                    <span>Removing</span>
                  </div>
                )}

                {pending && !uninstalling && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Pending</span>
                  </div>
                )}

                {!stats && !installed && !uninstalling && !pending && gameGenres.length > 0 && (
                  <span className="text-gray-500 truncate">{gameGenres[0]}</span>
                )}
              </div>
            </div>

            {/* Indicateur de sélection */}
            {isSelected && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l"></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-56 xl:w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-3 xl:p-4 space-y-3">
        <h1 className="text-lg xl:text-xl font-bold text-white">Library</h1>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search games..."
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

      <div className="flex-1 overflow-hidden">
        {filteredGames.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 text-center">
            <div className="text-gray-500">
              <p className="text-sm mb-1">No games found</p>
              <p className="text-xs">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : FixedSizeList ? (
          <FixedSizeList
            height={window.innerHeight - (user?.role === "admin" ? 340 : 280)}
            itemCount={filteredGames.length}
            itemSize={64}
            width="100%"
            className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
          >
            {GameRow}
          </FixedSizeList>
        ) : (
          <div
            className="overflow-y-auto py-2"
            style={{
              height: user?.role === "admin" ? `calc(100vh - 340px)` : `calc(100vh - 280px)`
            }}
          >
            {filteredGames.map((game, index) => (
              <GameRow key={game._id} index={index} style={{}} />
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 space-y-3">
        {user?.role === "admin" && (
          <button
            onClick={onAddGame}
            className="w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-750 text-gray-200 rounded-lg font-medium transition-all duration-200 border border-gray-700 hover:border-gray-600 flex items-center justify-center gap-2 group"
          >
            <FiPlus className="text-base group-hover:rotate-90 transition-transform duration-300" />
            Add Game
          </button>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">{games.length} games</span>
          <span className="text-green-400 font-medium">
            {installedGames.length} installed
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameLibrary;
