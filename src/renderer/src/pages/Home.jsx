import { useState, useEffect, useCallback, memo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { toast } from "sonner";
import logger from "../services/logger";
import { FaClock, FaGamepad, FaPlay, FaStar, FaPlus, FaRocket } from "react-icons/fa";
import { FiTrendingUp, FiChevronRight, FiWifiOff } from "react-icons/fi";
import { getAllServerGames } from "../api/serverGames";
import { getMergedStats, getLocalStats, formatStats as formatStatsAPI } from "../api/gameStats";
import { launchGame as launchGameAPI } from "../api/installedGames";
import { useGamesLoader } from "../hooks/useGamesLoader";
import AddGameModal from "../components/modals/AddGameModal";
import GameCover from "../components/GameCover";
import { useAuth } from "../contexts/authContext";
import { useTheme } from "../contexts/themeContext";
import { useConnection } from "../contexts/connectionContext";
import { Button } from "../components/ui";
import gameManager from "../services/gameManager";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const StatCard = memo(({ icon, label, value, color }) => (
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
));
StatCard.displayName = 'StatCard';

const GameCard = memo(({ game, t, isInstalled, isPlaying, onLaunch, playtimeSeconds, maxPlaytimeSeconds }) => {
  const progressPercent = maxPlaytimeSeconds > 0
    ? Math.min(100, (playtimeSeconds / maxPlaytimeSeconds) * 100)
    : 0;

  const formattedTime = playtimeSeconds > 0
    ? playtimeSeconds >= 3600
      ? `${Math.floor(playtimeSeconds / 3600)}h ${Math.floor((playtimeSeconds % 3600) / 60)}m`
      : `${Math.floor(playtimeSeconds / 60)}m`
    : null;

  return (
    <motion.div
      variants={fadeIn}
      className="group rounded-2xl border overflow-hidden hover:scale-[1.02] transition-all"
      style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="relative aspect-3/4 overflow-hidden">
        <GameCover
          src={game.coverUrl}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          size="cover_big"
        />

        {/* Playtime bar — always visible at bottom of cover */}
        {formattedTime && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div
              className="px-2.5 pb-2 pt-8"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}
            >
              <span className="text-xs text-white/80 font-medium block mb-1.5 leading-none">
                {formattedTime}
              </span>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--app-gradient-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          {isInstalled ? (
            <>
              <motion.button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLaunch(game); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isPlaying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white disabled:opacity-60"
                style={{ background: 'var(--app-gradient-primary)', boxShadow: 'var(--app-shadow-primary)' }}
              >
                {isPlaying ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    {t('home.playing')}
                  </>
                ) : (
                  <>
                    <FaPlay className="text-xs" />
                    {t('home.play')}
                  </>
                )}
              </motion.button>
              <Link
                to="/games"
                state={{ selectGameId: game._id }}
                className="text-xs text-white/60 hover:text-white/90 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {t('home.viewGame')}
              </Link>
            </>
          ) : (
            <Link to="/games" state={{ selectGameId: game._id }}>
              <Button variant="primary" size="sm" gradient icon={<FaPlay />}>
                {t('home.viewGame')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold truncate text-sm" style={{ color: 'var(--app-text)' }}>
          {game.name}
        </h3>
        {isPlaying && (
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--app-success)' }}>
            ● {t('home.playing')}
          </p>
        )}
      </div>
    </motion.div>
  );
});
GameCard.displayName = 'GameCard';

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

  const { games: serverGames, installedGames, loading, setGames: setServerGames } = useGamesLoader();

  const [stats, setStats] = useState(null);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [playingGames, setPlayingGames] = useState(new Set());

  // Sync playing state with gameManager events
  useEffect(() => {
    const handleStatus = (status) => {
      setPlayingGames((prev) => {
        const next = new Set(prev);
        if (status.status === 'running') next.add(status.gameId);
        else if (status.status === 'stopped' || status.status === 'failed') next.delete(status.gameId);
        return next;
      });
    };
    gameManager.addStatusListener('*', handleStatus);
    return () => gameManager.removeStatusListener('*', handleStatus);
  }, []);

  // Load stats - use local stats if offline
  useEffect(() => {
    if (!installedGames?.length) return;

    const loadStats = async () => {
      try {
        const gameIds = installedGames.map(g => g.serverGameId?._id).filter(Boolean);

        const fetchFn = isOnline ? getMergedStats : getLocalStats;
        const allMergedStats = await (async () => {
          const results = new Array(gameIds.length);
          let idx = 0;
          await Promise.all(Array.from({ length: Math.min(3, gameIds.length) }, async () => {
            while (idx < gameIds.length) {
              const i = idx++;
              results[i] = await fetchFn(gameIds[i]);
            }
          }));
          return results;
        })();

        let totalPlayTime = 0, totalSessions = 0;
        const allStats = {};
        const rawStatsMap = {};

        allMergedStats.forEach((s, i) => {
          if (s) {
            allStats[gameIds[i]] = formatStatsAPI(s);
            rawStatsMap[gameIds[i]] = s;
            totalPlayTime += s.totalPlayTime || 0;
            totalSessions += s.totalSessions || 0;
          }
        });

        const recentGames = installedGames
          .map(g => {
            const id = g.serverGameId?._id;
            return id && allStats[id] ? {
              ...g.serverGameId,
              ...allStats[id],
              playtimeSeconds: rawStatsMap[id]?.totalPlayTime || 0,
            } : null;
          })
          .filter(Boolean)
          .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0))
          .slice(0, 4);

        setStats({
          totalPlayTime: Math.floor(totalPlayTime / 3600),
          totalGames: gameIds.length,
          totalSessions,
          recentGames,
        });
      } catch (e) {
        logger.error("Error loading stats:", e);
      }
    };
    loadStats();
  }, [installedGames, isOnline]);

  const handleLaunchGame = useCallback(async (game) => {
    const installedData = installedGames.find(g => g.serverGameId?._id === game._id);
    if (!installedData) return;

    setPlayingGames(prev => new Set([...prev, game._id]));

    try {
      await launchGameAPI(game._id).catch(() => {}); // offline-safe

      const cachedGames = await window.store.get("installedGamesCache", {});
      const result = await gameManager.launchGame(
        game._id,
        installedData.path,
        cachedGames?.[game._id]?.executable || null,
        game.name,
      );

      if (!result.success) {
        setPlayingGames(prev => { const s = new Set(prev); s.delete(game._id); return s; });
        if (result.error?.startsWith('WINE_NOT_INSTALLED:')) return; // handled by Games page
        toast.error(t('games.launchFailedTitle'), {
          description: t('games.launchFailedDesc', { name: game.name }),
        });
      }
    } catch (err) {
      logger.error('[Home] Launch error:', err);
      setPlayingGames(prev => { const s = new Set(prev); s.delete(game._id); return s; });
    }
  }, [installedGames, t]);

  const games = isOnline ? serverGames : [];

  const maxPlaytime = stats?.recentGames?.length > 0
    ? Math.max(...stats.recentGames.map(g => g.playtimeSeconds || 0))
    : 0;

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
      <div className="p-6 space-y-6">

        {/* Offline Banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-warning)' }}
          >
            <FiWifiOff className="text-xl shrink-0" style={{ color: 'var(--app-warning)' }} />
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
          style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}
        >
          <div className="px-8 py-7">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ background: 'var(--app-primary)', color: '#fff' }}
            >
              <FaRocket className="w-3 h-3" />
              {t('home.letsGo')}
            </div>

            <h1 className="text-3xl font-bold mb-1 text-text">
              {t('home.welcome')}, <span style={{ color: 'var(--app-primary)' }}>{user?.username}</span>
            </h1>
            <p className="text-sm mb-5 text-text-secondary">{t('home.welcomeMessage')}</p>

            <div className="flex flex-wrap gap-3 mb-6">
              <Link to="/games">
                <Button variant="primary" size="sm" gradient icon={<FaGamepad />}>
                  {t('home.browseGames')}
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Button variant="ghost" size="sm" icon={<FaPlus />} onClick={() => setShowAddGameModal(true)}>
                  {t('home.addGame')}
                </Button>
              )}
            </div>

            {stats && (
              <div className="flex gap-6">
                {[
                  { icon: <FaClock />, value: `${stats.totalPlayTime}h`, label: t('home.totalPlayTime') },
                  { icon: <FaGamepad />, value: stats.totalGames, label: t('home.gamesInstalled') },
                  { icon: <FiTrendingUp />, value: stats.totalSessions, label: t('home.totalSessions') },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">{icon}</span>
                    <span className="font-bold text-sm text-text">{value}</span>
                    <span className="text-xs text-text-secondary">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Continue Playing */}
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
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {stats.recentGames.map(game => (
                <GameCard
                  key={game._id}
                  game={game}
                  t={t}
                  isInstalled={installedGames.some(g => g.serverGameId?._id === game._id)}
                  isPlaying={playingGames.has(game._id)}
                  onLaunch={handleLaunchGame}
                  playtimeSeconds={game.playtimeSeconds || 0}
                  maxPlaytimeSeconds={maxPlaytime}
                />
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
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {games.slice(0, 8).map(game => (
                <GameCard
                  key={game._id}
                  game={game}
                  t={t}
                  isInstalled={installedGames.some(g => g.serverGameId?._id === game._id)}
                  isPlaying={playingGames.has(game._id)}
                  onLaunch={handleLaunchGame}
                  playtimeSeconds={0}
                  maxPlaytimeSeconds={0}
                />
              ))}
            </div>
          </motion.div>
        )}

      </div>

      <AddGameModal
        isOpen={showAddGameModal}
        onClose={() => setShowAddGameModal(false)}
        onSuccess={async () => {
          const updated = await getAllServerGames();
          setServerGames(updated || []);
        }}
      />
    </div>
  );
};

export default Home;
