import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaGamepad,
  FaTrophy,
  FaFire,
  FaPlay,
  FaStar,
  FaPlus
} from "react-icons/fa";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { getMergedStats, formatStats as formatStatsAPI } from "../api/gameStats";
import AddGameModal from "../components/modals/AddGameModal";
import GameCover from "../components/GameCover";
import { useAuth } from "../contexts/authContext";

const Home = () => {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  // Get featured games (first 5 games from the list)
  const featuredGames = games.slice(0, 5);

  // Load games from server
  useEffect(() => {
    const loadGames = async () => {
      try {
        // Charger les jeux installés immédiatement pour ne pas bloquer l'UI
        const installed = await getInstalledGames();

        if (installed && installed.length > 0) {
          const installedServerGames = installed
            .filter(g => g.serverGameId)
            .map(g => g.serverGameId);
          setGames(installedServerGames);
        }

        // Désactiver le loading immédiatement après les jeux installés
        setLoading(false);

        // Ensuite, essayer de charger depuis le serveur (sans bloquer)
        const allGames = await getAllServerGames();
        if (allGames && allGames.length > 0) {
          setGames(allGames);
        }
      } catch (error) {
        console.error("Error loading games:", error);
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  // Load user stats from local storage
  useEffect(() => {
    const loadStats = async () => {
      try {
        const installed = await getInstalledGames();
        if (!installed || installed.length === 0) return;

        const gameIds = installed
          .map((g) => g.serverGameId?._id)
          .filter(Boolean);

        const allStats = {};
        let totalPlayTime = 0;

        // Paralléliser les appels getMergedStats pour de meilleures performances
        const statsPromises = gameIds.map(gameId => getMergedStats(gameId));
        const allMergedStats = await Promise.all(statsPromises);

        allMergedStats.forEach((mergedStats, index) => {
          if (mergedStats) {
            const gameId = gameIds[index];
            allStats[gameId] = formatStatsAPI(mergedStats);
            totalPlayTime += mergedStats.totalPlayTime || 0;
          }
        });

        // Get recent games
        const recentGames = installed
          .map((installedGame) => {
            const gameId = installedGame.serverGameId?._id;
            if (!gameId || !allStats[gameId]) return null;

            return {
              ...installedGame.serverGameId,
              ...allStats[gameId],
            };
          })
          .filter(Boolean)
          .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
          .slice(0, 3);

        setStats({
          totalPlayTime: Math.floor(totalPlayTime / 3600), // Convert to hours
          totalGames: gameIds.length,
          recentGames,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    if (featuredGames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredGames.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredGames.length]);

  const nextSlide = () => {
    if (featuredGames.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % featuredGames.length);
  };

  const prevSlide = () => {
    if (featuredGames.length === 0) return;
    setCurrentSlide(
      (prev) => (prev - 1 + featuredGames.length) % featuredGames.length
    );
  };

  const currentGame = featuredGames[currentSlide];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your gaming hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
      {/* Featured Games Carousel Hero Section */}
      {featuredGames.length > 0 ? (
        <div className="relative w-full h-[60vh] md:h-[65vh] lg:h-[70vh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              <GameCover
                src={currentGame.coverUrl}
                alt={currentGame.name}
                className="w-full h-full object-cover scale-110"
                size="screenshot_big"
                blur={true}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/40"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900/60"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex items-center px-6 md:px-16 max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">
                {/* Game Cover */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="flex-shrink-0"
                >
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-600/30 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                    <GameCover
                      src={currentGame.coverUrl}
                      alt={currentGame.name}
                      className="relative w-48 md:w-64 lg:w-72 rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-300 border border-white/10"
                      size="cover_big"
                    />
                  </div>
                </motion.div>

                {/* Game Info */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="flex-1 text-center md:text-left"
                >
                  <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full backdrop-blur-sm">
                    <FaStar className="text-yellow-400" />
                    <span className="text-sm font-semibold text-blue-300">Featured Game</span>
                  </div>

                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
                    {currentGame.name}
                  </h1>

                  <p className="text-base md:text-lg text-gray-300 mb-6 max-w-2xl leading-relaxed">
                    {currentGame.summary || currentGame.storyline || "An amazing gaming experience awaits you."}
                  </p>

                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    <Link to="/games">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2"
                      >
                        <FaPlay /> Play Now
                      </motion.button>
                    </Link>
                    <Link to="/games">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-bold border border-white/20 hover:bg-white/20 transition-all duration-300"
                      >
                        Learn More
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all duration-300 border border-white/10"
        >
          <FaChevronLeft className="text-xl" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all duration-300 border border-white/10"
        >
          <FaChevronRight className="text-xl" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {featuredGames.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-gradient-to-r from-blue-500 to-purple-600"
                  : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
      ) : (
        <div className="relative w-full h-[60vh] md:h-[65vh] lg:h-[70vh] flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-3xl font-bold text-white mb-2">No Games Available</h2>
            <p className="text-gray-400">Start by adding games to your library</p>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="px-6 md:px-16 py-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats && stats.totalGames > 0 ? (
            <>
              {/* Total Play Time */}
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/30 rounded-xl">
                    <FaClock className="text-3xl text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Total Play Time</p>
                    <p className="text-3xl font-bold text-white">{stats.totalPlayTime}h</p>
                  </div>
                </div>
              </div>

              {/* Total Games */}
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-500/30 rounded-xl">
                    <FaGamepad className="text-3xl text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Games Played</p>
                    <p className="text-3xl font-bold text-white">{stats.totalGames}</p>
                  </div>
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-800/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-yellow-500/30 rounded-xl">
                    <FaTrophy className="text-3xl text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">Gaming Streak</p>
                    <p className="text-3xl font-bold text-white">
                      <FaFire className="inline text-orange-500 mr-2" />
                      {stats.totalGames} days
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {/* Add Game Button Card - Admin Only */}
          {user?.role === 'admin' && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddGameModal(true)}
              className="bg-gradient-to-br from-green-600/20 to-emerald-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 cursor-pointer h-full flex items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="p-4 bg-green-500/30 rounded-xl">
                  <FaPlus className="text-3xl text-green-400" />
                </div>
                <p className="text-xl font-bold text-white">Add Game</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Continue Playing Section */}
      {stats && stats.recentGames && stats.recentGames.length > 0 && (
        <section className="px-6 md:px-16 py-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <FaClock className="text-2xl text-blue-400" />
              <h2 className="text-3xl md:text-4xl font-bold text-white">
                Continue Playing
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.recentGames.map((game, index) => (
                <motion.div
                  key={game._id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="relative h-48 overflow-hidden">
                    <GameCover
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      size="cover_small"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent"></div>

                    {/* Play Button Overlay */}
                    <Link to="/games">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-4 rounded-full bg-blue-600 text-white shadow-lg"
                        >
                          <FaPlay className="text-2xl" />
                        </motion.button>
                      </div>
                    </Link>
                  </div>

                  <div className="p-4">
                    <h3 className="text-xl font-bold text-white mb-2 truncate">
                      {game.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <FaClock />
                      <span>
                        {game.totalPlayTime || "Recently played"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Quick Actions Footer */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="px-6 md:px-16 py-16 max-w-7xl mx-auto"
      >
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Your Gaming Journey?
          </h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Explore thousands of games, track your progress, and join a community of passionate gamers.
          </p>
          <Link to="/games">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg rounded-xl font-bold shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
            >
              Explore All Games
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Add Game Modal */}
      <AddGameModal
        isOpen={showAddGameModal}
        onClose={() => setShowAddGameModal(false)}
        onSuccess={async () => {
          try {
            const allGames = await getAllServerGames();
            if (allGames && allGames.length > 0) {
              setGames(allGames);
            }
          } catch (error) {
            console.error("Erreur lors du rechargement des jeux:", error);
          }
        }}
      />
    </div>
  );
};

export default Home;
