import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
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
  FaPlus,
  FaDownload,
  FaRocket,
  FaHeart
} from "react-icons/fa";
import { FiTrendingUp, FiActivity, FiZap } from "react-icons/fi";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { getMergedStats, formatStats as formatStatsAPI } from "../api/gameStats";
import AddGameModal from "../components/modals/AddGameModal";
import GameCover from "../components/GameCover";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../contexts/themeContext";
import { useDownload } from "../contexts/downloadContext";
import { Button, Stat, LoadingSkeleton } from "../components/ui";

const Home = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getBackgroundStyle, getTextClass } = useTheme();
  const { downloads } = useDownload();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [stats, setStats] = useState(null);
  const [serverGames, setServerGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  // Check if user has any games
  const hasInstalledGames = installedGames.length > 0;
  const hasServerGames = serverGames.length > 0;
  const activeDownloads = downloads.filter(d => d.stage === 'downloading').length;

  // Get featured games (first 5 games from server)
  const featuredGames = serverGames.slice(0, 5);

  // Load games from server and installed games
  useEffect(() => {
    const loadGames = async () => {
      try {
        // Load installed games
        const installed = await getInstalledGames();
        setInstalledGames(installed || []);

        // Load server games
        const allGames = await getAllServerGames();
        setServerGames(allGames || []);

        setLoading(false);
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
        if (!installedGames || installedGames.length === 0) return;

        const gameIds = installedGames
          .map((g) => g.serverGameId?._id)
          .filter(Boolean);

        const allStats = {};
        let totalPlayTime = 0;
        let totalSessions = 0;

        // Parallelize getMergedStats calls
        const statsPromises = gameIds.map(gameId => getMergedStats(gameId));
        const allMergedStats = await Promise.all(statsPromises);

        allMergedStats.forEach((mergedStats, index) => {
          if (mergedStats) {
            const gameId = gameIds[index];
            allStats[gameId] = formatStatsAPI(mergedStats);
            totalPlayTime += mergedStats.totalPlayTime || 0;
            totalSessions += mergedStats.totalSessions || 0;
          }
        });

        // Get recent games
        const recentGames = installedGames
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
          totalSessions,
          recentGames,
        });
      } catch (error) {
        console.error("Error loading stats:", error);
      }
    };

    loadStats();
  }, [installedGames]);

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
      <div className="h-full overflow-y-auto" style={getBackgroundStyle('gradient')}>
        <div className="px-8 py-8 max-w-7xl mx-auto space-y-8">
          {/* Hero Skeleton */}
          <div className="h-[60vh] bg-surface rounded-3xl animate-pulse"></div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <LoadingSkeleton variant="stat" count={4} />
          </div>

          {/* Games Skeleton */}
          <div>
            <div className="h-8 bg-surface rounded w-64 mb-6 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LoadingSkeleton variant="game" count={3} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary" style={getBackgroundStyle('gradient')}>
      {/* Hero Section */}
      {hasServerGames ? (
        // Featured Games Carousel (when games available)
        <div className="relative w-full h-[55vh] md:h-[60vh] lg:h-[70vh] overflow-hidden">
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
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to top, var(--app-background), rgba(0,0,0,0.8), rgba(0,0,0,0.4))'
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, var(--app-background), transparent, rgba(0,0,0,0.6))'
                  }}
                />
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
                      <div
                        className="absolute inset-0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"
                        style={{
                          background: 'linear-gradient(135deg, var(--app-primary) 0%, var(--app-secondary) 100%)',
                          opacity: 0.3
                        }}
                      />
                      <GameCover
                        src={currentGame.coverUrl}
                        alt={currentGame.name}
                        className="relative w-40 md:w-56 lg:w-72 rounded-2xl shadow-2xl transform group-hover:scale-105 transition-transform duration-300 border"
                        style={{ borderColor: 'rgba(255,255,255,0.1)' }}
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
                    <div
                      className="inline-flex items-center gap-2 mb-3 px-4 py-2 rounded-full backdrop-blur-sm border"
                      style={{
                        background: 'rgba(var(--app-primary-rgb, 99, 102, 241), 0.2)',
                        borderColor: 'var(--app-primary)',
                        opacity: 0.9
                      }}
                    >
                      <FaStar style={{ color: 'var(--app-warning)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--app-primary)' }}>{t('home.featuredGame')}</span>
                    </div>

                    <h1
                      className="text-3xl md:text-5xl lg:text-7xl font-black leading-tight mb-3 md:mb-4 drop-shadow-2xl"
                      style={{ color: 'var(--app-text)' }}
                    >
                      {currentGame.name}
                    </h1>

                    <p
                      className="text-sm md:text-base lg:text-lg mb-4 md:mb-6 max-w-2xl leading-relaxed line-clamp-3 md:line-clamp-none"
                      style={{ color: 'var(--app-textSecondary)' }}
                    >
                      {currentGame.summary || currentGame.storyline || t('home.amazingExperience')}
                    </p>

                    <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                      <Link to="/games">
                        <Button
                          variant="primary"
                          size="lg"
                          gradient
                          icon={<FaPlay />}
                          iconPosition="left"
                        >
                          {t('home.playNow')}
                        </Button>
                      </Link>
                      <Link to="/games">
                        <Button
                          variant="ghost"
                          size="lg"
                        >
                          {t('home.learnMore')}
                        </Button>
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
                    ? "w-8 bg-gradient-to-r from-primary to-secondary"
                    : "w-1.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        // Welcome Hero (when no games available)
        <div
          className="relative w-full h-[60vh] md:h-[65vh] lg:h-[70vh] flex items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, var(--app-backgroundSecondary) 0%, var(--app-background) 100%)'
          }}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl"
              style={{ background: 'var(--app-gradient-primary)' }}
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, delay: 4 }}
              className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl"
              style={{ background: 'var(--app-gradient-secondary)' }}
            />
          </div>

          <div className="relative z-10 text-center px-6 max-w-4xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="mb-8"
            >
              <div className="text-8xl mb-4">🎮</div>
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`text-4xl md:text-6xl font-black mb-4 ${getTextClass('primary')}`}
            >
              {t('home.welcome')}, {user?.username}!
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`text-lg md:text-xl mb-8 ${getTextClass('secondary')}`}
            >
              {t('home.welcomeMessage')}
            </motion.p>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Link to="/games">
                <Button
                  variant="primary"
                  size="xl"
                  gradient
                  icon={<FaRocket />}
                  iconPosition="left"
                >
                  {t('home.browseGames')}
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="xl"
                  icon={<FaPlus />}
                  iconPosition="left"
                  onClick={() => setShowAddGameModal(true)}
                >
                  {t('home.addGame')}
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* Dashboard Stats Section */}
      <div className="px-6 md:px-16 py-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {hasInstalledGames && stats ? (
            // User has games - show personal stats
            <>
              <div className="flex items-center gap-3 mb-8">
                <FiActivity className="text-2xl text-primary" />
                <h2 className={`text-3xl font-bold ${getTextClass('primary')}`}>
                  {t('home.yourStats')}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Play Time */}
                <Stat
                  icon={<FaClock />}
                  label={t('home.totalPlayTime')}
                  value={`${stats.totalPlayTime}h`}
                  variant="primary"
                  gradient
                />

                {/* Total Games */}
                <Stat
                  icon={<FaGamepad />}
                  label={t('home.gamesInstalled')}
                  value={stats.totalGames}
                  variant="secondary"
                  gradient
                />

                {/* Total Sessions */}
                <Stat
                  icon={<FiTrendingUp />}
                  label={t('home.totalSessions')}
                  value={stats.totalSessions || 0}
                  variant="accent"
                  gradient
                />

                {/* Gaming Streak */}
                <Stat
                  icon={<FaFire />}
                  label={t('home.gamingStreak')}
                  value={`${stats.totalGames} ${t('home.days', { count: stats.totalGames })}`}
                  variant="warning"
                  gradient
                />
              </div>
            </>
          ) : (
            // No games - show recently added games instead of boring stats
            <>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <FaStar className="text-2xl text-warning" />
                  <h2 className={`text-3xl font-bold ${getTextClass('primary')}`}>
                    {t('home.recentlyAdded')}
                  </h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                  <FaGamepad className="text-primary" />
                  <span className={`font-semibold ${getTextClass('primary')}`}>
                    {serverGames.length} {t('home.gamesAvailable')}
                  </span>
                </div>
              </div>

              {serverGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {serverGames.slice(0, 4).map((game, index) => (
                    <motion.div
                      key={game._id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, var(--app-backgroundSecondary) 0%, var(--app-background) 100%)',
                        borderColor: 'var(--app-border)'
                      }}
                    >
                      <div className="relative h-56 overflow-hidden">
                        <GameCover
                          src={game.coverUrl}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          size="cover_small"
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            background: 'linear-gradient(to top, var(--app-background), rgba(0,0,0,0.6), transparent)'
                          }}
                        />

                        {/* Hover overlay */}
                        <Link to="/games">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
                            <div className="text-center">
                              <Button
                                variant="primary"
                                size="sm"
                                gradient
                                icon={<FaPlay />}
                                iconPosition="left"
                              >
                                {t('home.viewGame')}
                              </Button>
                            </div>
                          </div>
                        </Link>
                      </div>

                      <div className="p-4">
                        <h3 className={`text-lg font-bold truncate ${getTextClass('primary')}`}>
                          {game.name}
                        </h3>
                        {game.genres && game.genres.length > 0 && (
                          <p className={`text-sm mt-1 truncate ${getTextClass('secondary')}`}>
                            {typeof game.genres[0] === 'object' ? game.genres[0]?.name : game.genres[0]}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <p className={`text-lg ${getTextClass('secondary')}`}>
                    {t('home.noGamesYet')}
                  </p>
                  {user?.role === 'admin' && (
                    <Button
                      variant="primary"
                      size="lg"
                      gradient
                      icon={<FaPlus />}
                      iconPosition="left"
                      onClick={() => setShowAddGameModal(true)}
                      className="mt-4"
                    >
                      {t('home.addFirstGame')}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>

      {/* Continue Playing Section (only if user has games with stats) */}
      {stats && stats.recentGames && stats.recentGames.length > 0 && (
        <section className="px-6 md:px-16 py-12 max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <FaClock className="text-2xl text-primary" />
              <h2 className={`text-3xl md:text-4xl font-bold ${getTextClass('primary')}`}>
                {t('home.continuePlaying')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.recentGames.map((game, index) => (
                <motion.div
                  key={game._id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative overflow-hidden rounded-2xl border transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, var(--app-backgroundSecondary) 0%, var(--app-background) 100%)',
                    borderColor: 'var(--app-border)'
                  }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <GameCover
                      src={game.coverUrl}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      size="cover_small"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(to top, var(--app-background), rgba(0,0,0,0.6), transparent)'
                      }}
                    />

                    {/* Play Button Overlay */}
                    <Link to="/games">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
                        <Button
                          variant="primary"
                          iconOnly
                          size="lg"
                          icon={<FaPlay />}
                        />
                      </div>
                    </Link>
                  </div>

                  <div className="p-4">
                    <h3 className={`text-xl font-bold mb-2 truncate ${getTextClass('primary')}`}>
                      {game.name}
                    </h3>
                    <div className={`flex items-center gap-2 text-sm ${getTextClass('secondary')}`}>
                      <FaClock />
                      <span>
                        {game.totalPlayTime || t('home.recentlyPlayed')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      )}

      {/* Quick Actions Call-to-Action */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="px-6 md:px-16 py-16 max-w-7xl mx-auto"
      >
        <div
          className="backdrop-blur-sm border rounded-3xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(var(--app-primary-rgb, 99, 102, 241), 0.1), rgba(var(--app-secondary-rgb, 139, 92, 246), 0.1))',
            borderColor: 'var(--app-primary)',
            borderOpacity: 0.2
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <FiZap className="text-3xl text-primary" />
            <h2 className={`text-3xl md:text-4xl font-bold ${getTextClass('primary')}`}>
              {hasInstalledGames ? t('home.discoverMore') : t('home.readyToStart')}
            </h2>
          </div>
          <p className={`text-lg mb-8 max-w-2xl mx-auto ${getTextClass('secondary')}`}>
            {hasInstalledGames ? t('home.discoverMoreDesc') : t('home.exploreDescription')}
          </p>
          <Link to="/games">
            <Button
              variant="primary"
              size="xl"
              gradient
              icon={<FaHeart />}
              iconPosition="left"
            >
              {t('home.exploreAllGames')}
            </Button>
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
              setServerGames(allGames);
            }
          } catch (error) {
            console.error("Error reloading games:", error);
          }
        }}
      />
    </div>
  );
};

export default Home;
