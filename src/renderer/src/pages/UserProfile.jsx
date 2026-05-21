import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { useTranslation } from "react-i18next";
import logger from "../services/logger";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft, FiLock, FiWifiOff, FiShield,
  FiChevronDown, FiCheck, FiClock, FiUser, FiCalendar,
} from "react-icons/fi";
import { FaGamepad, FaPlay } from "react-icons/fa";
import { getUserProfile, updateUserRole } from "../api/user";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { toast } from "sonner";
import { getSocket } from "../services/socketService";
import GameCover from "../components/GameCover";
import ProfileAvatar from "../components/ProfileAvatar";
import { Button } from "../components/ui";

const ROLE_CFG = {
  admin:     { color: "var(--app-error)",        bg: "color-mix(in srgb, var(--app-error) 12%, transparent)",        border: "color-mix(in srgb, var(--app-error) 30%, transparent)" },
  moderator: { color: "var(--app-warning)",       bg: "color-mix(in srgb, var(--app-warning) 12%, transparent)",      border: "color-mix(in srgb, var(--app-warning) 30%, transparent)" },
  member:    { color: "var(--app-textSecondary)", bg: "color-mix(in srgb, var(--app-textSecondary) 10%, transparent)", border: "color-mix(in srgb, var(--app-textSecondary) 20%, transparent)" },
};

const formatPlayTime = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/* ─── Role selector (admin/mod only) ─── */
const RoleSelector = ({ currentRole, userId, currentUserId, currentUserRole, onRoleChange, t }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (userId === currentUserId) return null;

  const cfg = ROLE_CFG[currentRole] || ROLE_CFG.member;
  const readOnly = currentUserRole === "moderator" && currentRole === "admin";

  if (readOnly) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
      >
        <FiShield className="text-xs" /><span className="capitalize">{currentRole}</span>
      </span>
    );
  }

  const handleSelect = async (newRole) => {
    if (newRole === currentRole) { setOpen(false); return; }
    setLoading(true);
    try {
      await updateUserRole(userId, newRole);
      onRoleChange(newRole);
      toast.success(t("users.roleUpdated"));
    } catch (err) {
      logger.error("Failed to update role:", err);
      toast.error(t("users.roleUpdateError"));
    } finally { setLoading(false); setOpen(false); }
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80 disabled:opacity-50"
        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
      >
        <FiShield className="text-xs" />
        <span className="capitalize">{currentRole}</span>
        <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            className="absolute top-full left-0 mt-1.5 p-1.5 rounded-xl border border-border shadow-xl z-50 min-w-36 bg-surface"
          >
            {["moderator", "member"].map((role) => {
              const rc = ROLE_CFG[role];
              const active = role === currentRole;
              return (
                <button key={role} onClick={() => handleSelect(role)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                  style={{ background: active ? rc.bg : "transparent", color: active ? rc.color : "var(--app-text)" }}
                >
                  <FiShield className="shrink-0" style={{ color: rc.color }} />
                  <span className="capitalize flex-1 text-left">{role}</span>
                  {active && <FiCheck className="text-xs" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Game card ─── */
const GameCard = ({ game, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="group rounded-xl border border-border overflow-hidden hover:scale-[1.02] hover:border-primary transition-all cursor-pointer bg-surface"
  >
    <div className="relative aspect-3/4 overflow-hidden">
      <GameCover src={game.coverUrl} alt={game.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        size="cover_big"
      />
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2 pt-6"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
      >
        <p className="text-white text-xs font-medium">{formatPlayTime(game.totalPlayTime || 0)}</p>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.5)" }}
      >
        <Link to="/games" state={{ selectGameId: game._id }}>
          <Button variant="primary" size="sm" gradient icon={<FaPlay />}>{t("home.viewGame")}</Button>
        </Link>
      </div>
    </div>
    <div className="px-3 py-2.5">
      <p className="font-semibold text-xs truncate text-text">{game.name}</p>
      <p className="text-xs text-text-secondary">{game.totalSessions || 0} {t("users.sessions")}</p>
    </div>
  </motion.div>
);

/* ─── State screens ─── */
const StateScreen = ({ icon, title, desc }) => (
  <div className="flex flex-col items-center justify-center py-32 text-center">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-surface border border-border">{icon}</div>
    <h2 className="text-xl font-bold mb-2 text-text">{title}</h2>
    <p className="text-text-secondary">{desc}</p>
  </div>
);

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-8">
    <div className="flex items-center gap-6">
      <div className="w-24 h-24 rounded-full bg-surface shrink-0" />
      <div className="space-y-3 flex-1">
        <div className="h-8 w-48 rounded-lg bg-surface" />
        <div className="h-4 w-24 rounded bg-surface" />
        <div className="flex gap-4">
          <div className="h-8 w-24 rounded-lg bg-surface" />
          <div className="h-8 w-24 rounded-lg bg-surface" />
          <div className="h-8 w-24 rounded-lg bg-surface" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface" />)}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="aspect-3/4 rounded-xl bg-surface" />)}
    </div>
  </div>
);

/* ─── Page ─── */
const UserProfile = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const { isOnline } = useConnection();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isPrivileged = currentUser?.role === "admin" || currentUser?.role === "moderator";

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const fn = ({ userId: uid, newRole }) => {
      setProfile((prev) => {
        if (!prev || prev.user._id !== uid) return prev;
        return { ...prev, user: { ...prev.user, role: newRole } };
      });
    };
    socket.on("user:roleUpdated", fn);
    return () => { socket.off("user:roleUpdated", fn); };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!isOnline) { setLoading(false); setError("offline"); return; }
      setLoading(true); setError(null);
      try {
        const result = await getUserProfile(userId);
        if (result?.error === "private") setError("private");
        else if (result?.error === "not_found") setError("not_found");
        else if (result) setProfile(result);
        else setError("error");
      } catch (err) {
        logger.error("Error loading profile:", err);
        setError("error");
      } finally { setLoading(false); }
    };
    if (userId && isOnline !== null) load();
  }, [userId, isOnline]);

  const back = (
    <Link to="/users">
      <Button variant="ghost" size="sm" icon={<FiArrowLeft />}>{t("users.backToUsers")}</Button>
    </Link>
  );

  if (!isOnline) return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="px-8 py-8 max-w-5xl mx-auto">{back}<StateScreen icon={<FiWifiOff className="text-2xl" style={{ color: "var(--app-warning)" }} />} title={t("users.offlineTitle")} desc={t("users.offlineMessage")} /></div>
    </div>
  );

  if (loading) return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">{back}<SkeletonLoader /></div>
    </div>
  );

  if (error === "private") return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="px-8 py-8 max-w-5xl mx-auto">{back}<StateScreen icon={<FiLock className="text-2xl text-text-secondary" />} title={t("users.privateProfile")} desc={t("users.privateProfileDesc")} /></div>
    </div>
  );

  if (error || !profile) return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="px-8 py-8 max-w-5xl mx-auto">{back}<StateScreen icon={<FiUser className="text-2xl text-text-secondary" />} title={t("users.userNotFound")} desc={t("users.userNotFoundDesc")} /></div>
    </div>
  );

  const { user, stats, recentGames } = profile;
  const cfg = ROLE_CFG[user.role] || ROLE_CFG.member;

  return (
    <div className="h-full bg-background text-text overflow-hidden flex flex-col">
      <div className="px-8 py-6 max-w-5xl mx-auto w-full flex flex-col gap-5 h-full">

        {/* Back */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {back}
        </motion.div>

        {/* Profile header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="flex items-center gap-5"
        >
          <div className="p-1 rounded-full shrink-0" style={{ background: cfg.color }}>
            <div className="rounded-full overflow-hidden bg-background p-0.5">
              <ProfileAvatar profilePicture={user.profilePicture} username={user.username} size="lg" className="rounded-full! border-0!" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h1 className="text-3xl font-black text-text truncate">{user.username}</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
              >
                <FiShield className="text-xs" /><span className="capitalize">{user.role}</span>
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-text-secondary mb-3">
              <FiCalendar className="shrink-0" />
              {t("users.memberSince")} {new Date(user.createdAt).toLocaleDateString()}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { icon: <FiClock />,   value: formatPlayTime(stats.totalPlayTime || 0),  label: t("users.totalPlayTime"),  color: "var(--app-primary)" },
                { icon: <FaPlay />,    value: stats.totalSessions || 0,                  label: t("users.totalSessions"),  color: "var(--app-secondary)" },
                { icon: <FaGamepad />, value: stats.gamesPlayed || 0,                    label: t("users.gamesPlayedStat"), color: "var(--app-success)" },
              ].map(({ icon, value, label, color }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface text-sm">
                  <span style={{ color }}>{icon}</span>
                  <span className="font-bold text-text">{value}</span>
                  <span className="text-xs text-text-secondary">{label}</span>
                </div>
              ))}
              {isPrivileged && (
                <RoleSelector
                  currentRole={user.role}
                  userId={user._id}
                  currentUserId={currentUser?.id || currentUser?._id}
                  currentUserRole={currentUser?.role}
                  onRoleChange={(newRole) => setProfile((p) => ({ ...p, user: { ...p.user, role: newRole } }))}
                  t={t}
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="grid grid-cols-4 gap-3"
        >
          {[
            { icon: <FiClock />,   label: t("users.totalPlayTime"),   value: formatPlayTime(stats.totalPlayTime || 0), color: "primary" },
            { icon: <FaPlay />,    label: t("users.totalSessions"),   value: stats.totalSessions || 0,                 color: "secondary" },
            { icon: <FaGamepad />, label: t("users.gamesInstalled"),  value: stats.gamesInstalled || 0,                color: "success" },
            { icon: <FaGamepad />, label: t("users.gamesPlayedStat"), value: stats.gamesPlayed || 0,                   color: "warning" },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-surface">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: `var(--app-${color})` }}
              >
                {icon}
              </div>
              <div>
                <p className="text-xl font-bold text-text">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Recent games */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex-1 min-h-0 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: "var(--app-gradient-primary)" }}
            >
              <FaGamepad className="text-base" />
            </div>
            <h2 className="text-lg font-bold text-text">{t("users.recentGames")}</h2>
          </div>

          {recentGames?.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary">
              {recentGames.map((game) => (
                <div key={game._id} className="shrink-0 w-32">
                  <GameCard game={game} t={t} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <FaGamepad className="text-4xl mb-3 text-text-secondary" />
              <p className="text-text-secondary">{t("users.noGamesPlayed")}</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default UserProfile;
