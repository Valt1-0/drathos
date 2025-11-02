import React from "react";
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
} from "react-icons/fi";
import GameCover from "../GameCover";

const GameDetails = ({
  game,
  gameStats,
  gameSize,
  isInstalled,
  isPlaying,
  isUninstalling,
  isPending,
  isInstalling,
  user,
  onLaunch,
  onStop,
  onForceStop,
  onInstall,
  onUninstall,
  onOpenFolder,
  onDeleteFromServer,
  getGenresArray,
  getPlatformsArray,
}) => {
  if (!game) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-6xl mb-4">🎮</div>
          <h2 className="text-xl font-semibold mb-2">
            Sélectionnez un jeu
          </h2>
          <p>Choisissez un jeu dans la liste pour voir ses détails</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      
      <div className="relative h-64 bg-gray-800 overflow-hidden">
        {game.coverUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent">
            <GameCover
              src={game.coverUrl}
              alt={game.name}
              className="w-full h-full object-cover opacity-70"
              size="cover_big"
              blur={true}
            />
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6">
          <h1 className="text-4xl font-bold text-white mb-2">
            {game.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-300">
            <span>
              {getGenresArray(game).slice(0, 3).join(" • ") ||
                "Aucun genre"}
            </span>
            {game.releaseDate && (
              <span>
                • {dayjs(game.releaseDate).format("YYYY")}
              </span>
            )}
            {game.rating > 0 && (
              <span>• ⭐ {game.rating.toFixed(1)}/10</span>
            )}
          </div>
        </div>
      </div>

      
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2">
            
            <ActionButtons
              game={game}
              isInstalled={isInstalled}
              isPlaying={isPlaying}
              isUninstalling={isUninstalling}
              isPending={isPending}
              isInstalling={isInstalling}
              user={user}
              onLaunch={onLaunch}
              onStop={onStop}
              onForceStop={onForceStop}
              onInstall={onInstall}
              onUninstall={onUninstall}
              onOpenFolder={onOpenFolder}
              onDeleteFromServer={onDeleteFromServer}
            />

            
            {isInstalled && gameStats && gameStats.totalSessions > 0 && (
              <GameStatistics stats={gameStats} isPlaying={isPlaying} />
            )}

            
            <div className="mb-6 mt-6">
              <h2 className="text-xl font-bold mb-3">À propos</h2>
              <p className="text-gray-300 leading-relaxed">
                {game.summary ||
                  game.storyline ||
                  "Aucune description disponible."}
              </p>
            </div>
          </div>

          
          <GameInformation
            game={game}
            gameSize={gameSize}
            isInstalled={isInstalled}
            getGenresArray={getGenresArray}
            getPlatformsArray={getPlatformsArray}
          />
        </div>
      </div>
    </div>
  );
};

const ActionButtons = ({
  game,
  isInstalled,
  isPlaying,
  isUninstalling,
  isPending,
  isInstalling,
  user,
  onLaunch,
  onStop,
  onForceStop,
  onInstall,
  onUninstall,
  onOpenFolder,
  onDeleteFromServer,
}) => {
  // Jeu en attente de synchronisation
  if (isPending && !isUninstalling) {
    return (
      <div className="mb-6">
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-yellow-500/50">
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
      </div>
    );
  }

  // Jeu en cours de désinstallation
  if (isUninstalling) {
    return (
      <div className="mb-6">
        <div className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50">
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
      </div>
    );
  }

  // Jeu non installé
  if (!isInstalled) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => onInstall(game)}
            disabled={isInstalling}
            className={`group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border transition-all duration-300 ${
              user?.role === "admin" ? "md:col-span-2 lg:col-span-3" : "md:col-span-2 lg:col-span-4"
            } ${
              isInstalling
                ? "border-blue-500/70 scale-95"
                : "border-slate-700/50 hover:border-blue-500/50 hover:scale-[1.02]"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent transition-opacity duration-300 ${
              isInstalling ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`} />
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-xl mx-auto mb-4">
                {isInstalling ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent"></div>
                ) : (
                  <svg
                    className="w-8 h-8 text-blue-400 group-hover:animate-bounce"
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
                )}
              </div>
              <div className="text-xl font-bold text-white mb-2">
                {isInstalling ? "Démarrage..." : "Installer le jeu"}
              </div>
              <div className="text-sm text-slate-400">
                {isInstalling
                  ? "Redirection vers la page de téléchargements"
                  : `Télécharger et installer (${game.sizeMB} MB)`}
              </div>
            </div>
          </button>

          
          {user?.role === "admin" && (
            <button
              onClick={() => onDeleteFromServer(game)}
              className="group relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700/50 hover:border-red-500/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-xl mx-auto mb-4">
                  <FiTrash2 className="text-red-400 text-3xl" />
                </div>
                <div className="text-xl font-bold text-white mb-2">
                  Supprimer du serveur
                </div>
                <div className="text-sm text-slate-400">
                  Admin uniquement
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Jeu installé
  return (
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
        {isPlaying ? (
          <>
            <button
              onClick={() => onStop(game)}
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
              onClick={() => onForceStop(game)}
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
            onClick={() => onLaunch(game)}
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
          onClick={() => onOpenFolder(game)}
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
          onClick={() => onUninstall(game)}
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
  );
};

const GameStatistics = ({ stats, isPlaying }) => {
  return (
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
              {stats.totalPlayTime || "0h 0m"}
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full w-3/4" />
            </div>
          </div>
        </div>

        
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
              {stats.totalSessions || 0}
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full w-2/3" />
            </div>
          </div>
        </div>

        
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
              {stats.averageSessionTime || "0h 0m"}
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full w-1/2" />
            </div>
          </div>
        </div>
      </div>

      
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
            {stats.firstLaunchedFormatted || "Jamais"}
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
            {stats.lastPlayedFormatted || "Jamais"}
          </div>
        </div>
      </div>

      
      {isPlaying && (
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
  );
};

const GameInformation = ({
  game,
  gameSize,
  isInstalled,
  getGenresArray,
  getPlatformsArray,
}) => {
  return (
    <div>
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="font-bold mb-4">Informations</h3>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-400">Développeur:</span>
            <p className="text-white">{game.developer || "Inconnu"}</p>
          </div>

          <div>
            <span className="text-gray-400">Éditeur:</span>
            <p className="text-white">{game.publisher || "Inconnu"}</p>
          </div>

          <div>
            <span className="text-gray-400">Date de sortie:</span>
            <p className="text-white">
              {game.releaseDate
                ? dayjs(game.releaseDate).format("DD/MM/YYYY")
                : "Inconnue"}
            </p>
          </div>

          <div>
            <span className="text-gray-400">Genres:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {getGenresArray(game).map((genre, index) => (
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
              {getPlatformsArray(game).map((platform, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-600 text-xs rounded"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>

          {isInstalled && (
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

          {!isInstalled && (
            <div>
              <span className="text-gray-400">
                Taille téléchargement:
              </span>
              <p className="text-white">{game.sizeMB} MB</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetails;
