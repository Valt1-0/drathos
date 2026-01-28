import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FaClock, FaGamepad, FaPlay, FaStar, FaPlus, FaRocket, FaFire } from "react-icons/fa";
import { FiTrendingUp, FiChevronRight, FiWifiOff } from "react-icons/fi";
import { getAllServerGames } from "../api/serverGames";
import { getInstalledGames } from "../api/installedGames";
import { getMergedStats, getLocalStats, formatStats as formatStatsAPI } from "../api/gameStats";
import { gamesCache } from "../utils/gamesCache";
import AddGameModal from "../components/modals/AddGameModal";
import GameCover from "../components/GameCover";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../contexts/themeContext";
import { useConnection } from "../contexts/connectionContext";
import { Button } from "../components/ui";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    variants={fadeIn}
    className="p-5 rounded-2xl border hover:scale-[1.02] transition-transform"
    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
  >
    <div className="flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
        style={{ background: `var(--app-${color})`, color: '#fff' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{value}</p>
        <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>{label}</p>
      </div>
    </div>
  </motion.div>
);

const GameCard = ({ game, t }) => (
  <motion.div
    variants={fadeIn}
    className="group rounded-2xl border overflow-hidden hover:scale-[1.02] transition-all"
    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
  >
    <div className="relative aspect-[3/4] overflow-hidden">
      <GameCover
        src={game.coverUrl}
        alt={game.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        size="cover_big"
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Link to="/games">
            <Button variant="primary" size="md" gradient icon={<FaPlay />}>
              {t('home.viewGame')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>{game.name}</h3>
    </div>
  </motion.div>
);

const SectionHeader = ({ icon, title, action }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--app-primary)', color: '#fff' }}
      >
        {icon}
      </div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--app-text)' }}>{title}</h2>
    </div>
    {action}
  </div>
);

const SkeletonLoader = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-48 rounded-2xl" style={{ background: 'var(--app-surface)' }} />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 rounded-2xl" style={{ background: 'var(--app-surface)' }} />
      ))}
    </div>
  </div>
);

const Home = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getBackgroundStyle } = useTheme();
  const { isOnline } = useConnection();

  const [stats, setStats] = useState(null);
  const [serverGames, setServerGames] = useState([]);
  const [installedGames, setInstalledGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddGameModal, setShowAddGameModal] = useState(false);

  // Load data
  useEffect(() => {
    if (isOnline === null) return;

    const load = async () => {
      // 1. Charger cache local (jeux installés)
      const localCache = await window.store.get("installedGamesCache", {});
      const localInstalled = Object.entries(localCache).map(([id, data]) => ({
        _id: `installed_${id}`,
        serverGameId: { _id: id, name: data.name, coverUrl: data.coverUrl, genres: data.genres },
        path: data.path,
      }));

      // 2. Offline: seulement jeux installés
      if (!isOnline) {
        gamesCache.clear();
        setInstalledGames(localInstalled);
        setServerGames([]);
        setLoading(false);
        return;
      }

      // 3. Online + cache valide: utiliser le cache
      if (gamesCache.isValid()) {
        const c = gamesCache.get();
        setInstalledGames(c.installedGames);
        setServerGames(c.serverGames);
        setLoading(false);
        return;
      }

      // 4. Online + pas de cache: fetch
      setLoading(true);
      try {
        const [installed, games] = await Promise.all([
          getInstalledGames(),
          getAllServerGames()
        ]);
        gamesCache.set({ installedGames: installed || [], serverGames: games || [] });
        setInstalledGames(installed || []);
        setServerGames(games || []);
      } catch (e) {
        console.error("Error loading:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOnline]);

  // Load stats - utilise les stats locales si offline
  useEffect(() => {
    if (!installedGames?.length) return;

    const loadStats = async () => {
      try {
        const gameIds = installedGames.map(g => g.serverGameId?._id).filter(Boolean);

        // Si offline, utiliser uniquement les stats locales
        const allMergedStats = isOnline
          ? await Promise.all(gameIds.map(id => getMergedStats(id)))
          : await Promise.all(gameIds.map(id => getLocalStats(id)));

        let totalPlayTime = 0, totalSessions = 0;
        const allStats = {};

        allMergedStats.forEach((s, i) => {
          if (s) {
            allStats[gameIds[i]] = formatStatsAPI(s);
            totalPlayTime += s.totalPlayTime || 0;
            totalSessions += s.totalSessions || 0;
          }
        });

        const recentGames = installedGames
          .map(g => {
            const id = g.serverGameId?._id;
            return id && allStats[id] ? { ...g.serverGameId, ...allStats[id] } : null;
          })
          .filter(Boolean)
          .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
          .slice(0, 4);

        setStats({
          totalPlayTime: Math.floor(totalPlayTime / 3600),
          totalGames: gameIds.length,
          totalSessions,
          recentGames
        });
      } catch (e) {
        console.error("Error loading stats:", e);
      }
    };
    loadStats();
  }, [installedGames, isOnline]);

  // Ce qui s'affiche dépend DIRECTEMENT de isOnline
  const games = isOnline ? serverGames : [];

  if (loading || isOnline === null) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-6xl mx-auto">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary" style={getBackgroundStyle('gradient')}>
      <div className="max-w-6xl mx-auto p-6 space-y-8">

        {/* Offline Banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-warning)' }}
          >
            <FiWifiOff className="text-xl" style={{ color: 'var(--app-warning)' }} />
            <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
              {t('home.offlineMessage')}
            </p>
          </motion.div>
        )}

        {/* Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="relative rounded-2xl border overflow-hidden"
          style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
                  style={{ background: 'var(--app-primary)', color: '#fff' }}
                >
                  <FaRocket className="w-3 h-3" />
                  {t('home.letsGo')}
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--app-text)' }}>
                  {t('home.welcome')}, <span style={{ color: 'var(--app-primary)' }}>{user?.username}</span>
                </h1>

                <p className="text-base mb-6 max-w-md" style={{ color: 'var(--app-textSecondary)' }}>
                  {t('home.welcomeMessage')}
                </p>

                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Link to="/games">
                    <Button variant="primary" size="md" gradient icon={<FaGamepad />}>
                      {t('home.browseGames')}
                    </Button>
                  </Link>
                  {user?.role === 'admin' && (
                    <Button variant="ghost" size="md" icon={<FaPlus />} onClick={() => setShowAddGameModal(true)}>
                      {t('home.addGame')}
                    </Button>
                  )}
                </div>
              </div>

              {games.length > 0 && (
                <Link to="/games" className="flex-shrink-0 group">
                  <div className="relative">
                    <div
                      className="absolute -inset-2 rounded-2xl opacity-50 blur-xl group-hover:opacity-70 transition-opacity"
                      style={{ background: 'var(--app-primary)' }}
                    />
                    <GameCover
                      src={games[0].coverUrl}
                      alt={games[0].name}
                      className="relative w-36 md:w-44 rounded-xl border group-hover:scale-105 transition-transform"
                      style={{ borderColor: 'var(--app-border)' }}
                      size="cover_big"
                    />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        {installedGames.length > 0 && stats && (
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <SectionHeader icon={<FiTrendingUp />} title={t('home.yourStats')} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<FaClock />} label={t('home.totalPlayTime')} value={`${stats.totalPlayTime}h`} color="primary" />
              <StatCard icon={<FaGamepad />} label={t('home.gamesInstalled')} value={stats.totalGames} color="secondary" />
              <StatCard icon={<FiTrendingUp />} label={t('home.totalSessions')} value={stats.totalSessions} color="success" />
              <StatCard icon={<FaFire />} label={t('home.gamingStreak')} value={`${stats.totalGames}j`} color="warning" />
            </div>
          </motion.div>
        )}

        {/* Recent Games */}
        {stats?.recentGames?.length > 0 && (
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <SectionHeader
              icon={<FaClock />}
              title={t('home.continuePlaying')}
              action={
                <Link to="/games">
                  <Button variant="ghost" size="sm" icon={<FiChevronRight />} iconPosition="right">
                    {t('home.viewAll')}
                  </Button>
                </Link>
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.recentGames.map(game => (
                <GameCard key={game._id} game={game} t={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Available Games (only if online and no recent games) */}
        {games.length > 0 && !stats?.recentGames?.length && (
          <motion.div initial="hidden" animate="visible" variants={fadeIn}>
            <SectionHeader
              icon={<FaStar />}
              title={t('home.recentlyAdded')}
              action={
                <Link to="/games">
                  <Button variant="ghost" size="sm" icon={<FiChevronRight />} iconPosition="right">
                    {t('home.viewAll')}
                  </Button>
                </Link>
              }
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {games.slice(0, 4).map(game => (
                <GameCard key={game._id} game={game} t={t} />
              ))}
            </div>
          </motion.div>
        )}

      </div>

      <AddGameModal
        isOpen={showAddGameModal}
        onClose={() => setShowAddGameModal(false)}
        onSuccess={async () => {
          const games = await getAllServerGames();
          setServerGames(games || []);
        }}
      />
    </div>
  );
};

export default Home;
