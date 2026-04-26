import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import logger from "../services/logger";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiClock, FiArrowLeft, FiLock, FiWifiOff, FiShield, FiChevronDown, FiCheck } from "react-icons/fi";
import { FaGamepad, FaPlay, FaCalendarAlt } from "react-icons/fa";
import { getUserProfile, updateUserRole } from "../api/user";
import { useTheme } from "../contexts/themeContext";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { toast } from "sonner";
import { getSocket } from "../services/socketService";
import GameCover from "../components/GameCover";
import ProfileAvatar from "../components/ProfileAvatar";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const ROLES = [
  { value: 'admin', label: 'users.roleAdmin', color: 'var(--app-error)' },
  { value: 'moderator', label: 'users.roleModerator', color: 'var(--app-warning)' },
  { value: 'member', label: 'users.roleMember', color: 'var(--app-textSecondary)' },
];

const RoleSelector = ({ currentRole, userId, currentUserId, currentUserRole, onRoleChange, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Don't show selector for own profile
  if (userId === currentUserId) return null;

  // Moderators can't change an admin's role — show read-only badge
  if (currentUserRole === 'moderator' && currentRole === 'admin') {
    const cfg = ROLES[0]; // admin
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm w-fit" style={{ borderColor: cfg.color, color: cfg.color, background: 'var(--app-background)' }}>
        <FiShield className="text-sm" />
        <span className="capitalize">{t(cfg.label)}</span>
      </span>
    );
  }

  // admin role is exclusive to the first user — nobody can assign it
  const availableRoles = ROLES.filter(r => r.value !== 'admin');

  const currentRoleConfig = ROLES.find(r => r.value === currentRole) || ROLES[2];

  const handleRoleChange = async (newRole) => {
    if (newRole === currentRole) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      onRoleChange(newRole);
      toast.success(t('users.roleUpdated'));
    } catch (error) {
      logger.error("Failed to update role:", error);
      toast.error(t('users.roleUpdateError'));
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
        style={{
          borderColor: currentRoleConfig.color,
          color: currentRoleConfig.color,
          background: 'var(--app-background)'
        }}
      >
        <FiShield className="text-sm" />
        <span className="text-sm capitalize">{t(currentRoleConfig.label)}</span>
        <FiChevronDown className={`text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 min-w-40 rounded-xl border shadow-lg z-50 overflow-hidden"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <div className="p-2">
              {availableRoles.map(role => (
                <button
                  key={role.value}
                  onClick={() => handleRoleChange(role.value)}
                  disabled={loading}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    color: role.value === currentRole ? role.color : 'var(--app-text)'
                  }}
                >
                  <span className="capitalize">{t(role.label)}</span>
                  {role.value === currentRole && <FiCheck />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const formatPlayTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

const StatCard = ({ icon, label, value, color }) => (
  <motion.div
    variants={fadeIn}
    className="p-5 rounded-2xl border"
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
    className="group rounded-2xl border overflow-hidden"
    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
  >
    <div className="relative aspect-[3/4] overflow-hidden">
      <GameCover
        src={game.coverUrl}
        alt={game.name}
        className="w-full h-full object-cover"
        size="cover_big"
      />
      <div
        className="absolute bottom-0 left-0 right-0 p-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
      >
        <p className="text-white text-xs font-medium">
          {formatPlayTime(game.totalPlayTime || 0)}
        </p>
      </div>
    </div>
    <div className="p-3">
      <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--app-text)' }}>
        {game.name}
      </h3>
      <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
        {game.totalSessions || 0} {t('users.sessions')}
      </p>
    </div>
  </motion.div>
);

const SkeletonLoader = () => (
  <div className="space-y-6 animate-pulse">
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-2xl" style={{ background: 'var(--app-surface)' }} />
      <div className="flex-1">
        <div className="h-8 w-48 rounded mb-2" style={{ background: 'var(--app-surface)' }} />
        <div className="h-4 w-24 rounded" style={{ background: 'var(--app-surface)' }} />
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--app-surface)' }} />
      ))}
    </div>
  </div>
);

const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const { getBackgroundStyle } = useTheme();
  const { isOnline } = useConnection();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // Real-time role update from socket (another admin changed this user's role)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRoleUpdate = ({ userId: updatedUserId, newRole }) => {
      setProfile(prev => {
        if (!prev || prev.user._id !== updatedUserId) return prev;
        return { ...prev, user: { ...prev.user, role: newRole } };
      });
    };

    socket.on('user:roleUpdated', handleRoleUpdate);
    return () => { socket.off('user:roleUpdated', handleRoleUpdate); };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!isOnline) {
        setLoading(false);
        setError("offline");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getUserProfile(userId);
        if (result?.error === "private") {
          setError("private");
        } else if (result?.error === "not_found") {
          setError("not_found");
        } else if (result) {
          setProfile(result);
        } else {
          setError("error");
        }
      } catch (err) {
        logger.error("Error loading profile:", err);
        setError("error");
      } finally {
        setLoading(false);
      }
    };

    if (userId && isOnline !== null) {
      loadProfile();
    }
  }, [userId, isOnline]);

  // Offline state
  if (!isOnline) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-4xl mx-auto">
          <Link
            to="/users"
            className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
            style={{ color: 'var(--app-textSecondary)' }}
          >
            <FiArrowLeft /> {t('users.backToUsers')}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-warning)' }}
            >
              <FiWifiOff className="text-3xl" style={{ color: 'var(--app-warning)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>
              {t('users.offlineTitle')}
            </h2>
            <p style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.offlineMessage')}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-4xl mx-auto">
          <Link
            to="/users"
            className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
            style={{ color: 'var(--app-textSecondary)' }}
          >
            <FiArrowLeft /> {t('users.backToUsers')}
          </Link>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  // Error states
  if (error === "private") {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-4xl mx-auto">
          <Link
            to="/users"
            className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
            style={{ color: 'var(--app-textSecondary)' }}
          >
            <FiArrowLeft /> {t('users.backToUsers')}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
            >
              <FiLock className="text-3xl" style={{ color: 'var(--app-textSecondary)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>
              {t('users.privateProfile')}
            </h2>
            <p style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.privateProfileDesc')}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error === "not_found" || error === "error" || !profile) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-4xl mx-auto">
          <Link
            to="/users"
            className="inline-flex items-center gap-2 mb-6 text-sm hover:underline"
            style={{ color: 'var(--app-textSecondary)' }}
          >
            <FiArrowLeft /> {t('users.backToUsers')}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
            >
              <FiUser className="text-3xl" style={{ color: 'var(--app-textSecondary)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>
              {t('users.userNotFound')}
            </h2>
            <p style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.userNotFoundDesc')}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  const { user, stats, recentGames } = profile;

  const handleRoleChange = (newRole) => {
    setProfile(prev => ({
      ...prev,
      user: { ...prev.user, role: newRole }
    }));
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary" style={getBackgroundStyle('gradient')}>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Back Button */}
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm hover:underline"
          style={{ color: 'var(--app-textSecondary)' }}
        >
          <FiArrowLeft /> {t('users.backToUsers')}
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 rounded-2xl border"
          style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          <ProfileAvatar
            profilePicture={user.profilePicture}
            username={user.username}
            size="xl"
            className="rounded-2xl"
          />

          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--app-text)' }}>
              {user.username}
            </h1>
            {isPrivileged ? (
              <div className="mb-3">
                <RoleSelector
                  currentRole={user.role}
                  userId={user._id}
                  currentUserId={currentUser?.id || currentUser?._id}
                  currentUserRole={currentUser?.role}
                  onRoleChange={handleRoleChange}
                  t={t}
                />
              </div>
            ) : (
              <p className="text-sm capitalize mb-3" style={{ color: 'var(--app-textSecondary)' }}>
                {user.role}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--app-textSecondary)' }}>
              <FaCalendarAlt />
              <span>{t('users.memberSince')} {formatDate(new Date(user.createdAt).getTime())}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--app-text)' }}>
            {t('users.statistics')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FiClock />}
              label={t('users.totalPlayTime')}
              value={formatPlayTime(stats.totalPlayTime || 0)}
              color="primary"
            />
            <StatCard
              icon={<FaPlay />}
              label={t('users.totalSessions')}
              value={stats.totalSessions || 0}
              color="secondary"
            />
            <StatCard
              icon={<FaGamepad />}
              label={t('users.gamesInstalled')}
              value={stats.gamesInstalled || 0}
              color="success"
            />
            <StatCard
              icon={<FaGamepad />}
              label={t('users.gamesPlayedStat')}
              value={stats.gamesPlayed || 0}
              color="warning"
            />
          </div>
        </motion.div>

        {/* Recent Games */}
        {recentGames && recentGames.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--app-text)' }}>
              {t('users.recentGames')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {recentGames.map((game) => (
                <GameCard key={game._id} game={game} t={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* No games message */}
        {(!recentGames || recentGames.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <FaGamepad className="text-4xl mx-auto mb-4" style={{ color: 'var(--app-textSecondary)' }} />
            <p style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.noGamesPlayed')}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
