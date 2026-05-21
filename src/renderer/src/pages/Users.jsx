import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import logger from "../services/logger";
import {
  FiUser, FiClock, FiWifiOff, FiChevronLeft, FiChevronRight,
  FiGrid, FiList, FiFilter, FiChevronDown, FiX,
  FiCalendar, FiShield, FiLoader, FiCheck, FiUsers,
} from "react-icons/fi";
import { FaGamepad, FaStar, FaSortAmountDown, FaPlay } from "react-icons/fa";
import { getAllUsers, updateUserRole } from "../api/user";
import { useConnection } from "../contexts/connectionContext";
import { useAuth } from "../contexts/authContext";
import { getSocket } from "../services/socketService";
import { toast } from "sonner";
import ProfileAvatar from "../components/ProfileAvatar";
import { Button, SearchBar } from "../components/ui";
import { useDebounce } from "../hooks/useDebounce";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const formatPlayTime = (s) => {
  const h = Math.floor(s / 3600);
  return h < 1 ? `${Math.floor(s / 60)}m` : `${h}h`;
};

const formatLastActivity = (ts, t) => {
  if (!ts) return t("users.never");
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1)  return t("users.justNow");
  if (m < 60) return t("users.minutesAgo", { count: m });
  if (h < 24) return t("users.hoursAgo",   { count: h });
  if (d < 7)  return t("users.daysAgo",    { count: d });
  if (d < 30) return t("users.weeksAgo",   { count: Math.floor(d / 7) });
  return new Date(ts).toLocaleDateString();
};

const ROLE_CFG = {
  admin:     { color: "var(--app-error)",        bg: "color-mix(in srgb, var(--app-error) 12%, transparent)",        border: "color-mix(in srgb, var(--app-error) 30%, transparent)" },
  moderator: { color: "var(--app-warning)",       bg: "color-mix(in srgb, var(--app-warning) 12%, transparent)",      border: "color-mix(in srgb, var(--app-warning) 30%, transparent)" },
  member:    { color: "var(--app-textSecondary)", bg: "color-mix(in srgb, var(--app-textSecondary) 10%, transparent)", border: "color-mix(in srgb, var(--app-textSecondary) 20%, transparent)" },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CFG[role] || ROLE_CFG.member;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
    >
      <FiShield className="text-xs" />
      <span className="capitalize">{role}</span>
    </span>
  );
};

const RoleToggleButton = ({ user, currentUserId, currentUserRole, onRoleChange, t }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cfg = ROLE_CFG[user.role] || ROLE_CFG.member;
  const readOnly = user._id === currentUserId || (currentUserRole === "moderator" && user.role === "admin");

  if (readOnly) return <RoleBadge role={user.role} />;

  const handleSelect = async (e, newRole) => {
    e.preventDefault(); e.stopPropagation();
    setOpen(false);
    if (newRole === user.role) return;
    setLoading(true);
    try {
      await updateUserRole(user._id, newRole);
      onRoleChange(user._id, newRole);
      toast.success(t("users.roleUpdated"));
    } catch { toast.error(t("users.roleUpdateError")); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative" onClick={(e) => e.preventDefault()}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-all disabled:opacity-50"
        style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}
      >
        {loading
          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><FiLoader className="text-xs" /></motion.div>
          : <FiShield className="text-xs" />
        }
        <span className="capitalize">{user.role}</span>
        <FiChevronDown className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 p-1.5 rounded-xl border border-border shadow-xl z-50 min-w-32 bg-surface"
          >
            {["moderator", "member"].map((role) => {
              const rc = ROLE_CFG[role];
              const active = role === user.role;
              return (
                <motion.button key={role} onClick={(e) => handleSelect(e, role)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                  style={{ background: active ? rc.bg : "transparent", color: active ? rc.color : "var(--app-text)" }}
                  whileHover={!active ? { backgroundColor: "color-mix(in srgb, var(--app-primary) 8%, transparent)" } : {}}
                  whileTap={{ scale: 0.97 }}
                >
                  <FiShield className="shrink-0" style={{ color: rc.color }} />
                  <span className="capitalize flex-1 text-left">{role}</span>
                  {active && <FiCheck className="text-xs" />}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserCard = ({ user, t, isPrivileged, currentUserId, currentUserRole, onRoleChange }) => {
  const cfg = ROLE_CFG[user.role] || ROLE_CFG.member;
  return (
    <Link to={`/users/${user._id}`}>
      <motion.div variants={fadeIn}
        className="group rounded-2xl border border-border overflow-hidden hover:scale-[1.02] transition-all cursor-pointer bg-surface"
        whileHover={{ borderColor: "var(--app-primary)" }}
      >
        <div className="h-1 w-full" style={{ background: cfg.color }} />
        <div className="p-4 flex flex-col items-center text-center gap-2">
          <ProfileAvatar profilePicture={user.profilePicture} username={user.username} size="md"
            className="group-hover:scale-105 transition-transform duration-300"
          />
          <div>
            <p className="font-bold text-text text-sm truncate">{user.username}</p>
            <div className="mt-1">
              {isPrivileged
                ? <RoleToggleButton user={user} currentUserId={currentUserId} currentUserRole={currentUserRole} onRoleChange={onRoleChange} t={t} />
                : <RoleBadge role={user.role} />
              }
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 w-full">
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background">
              <FiClock className="text-xs shrink-0" style={{ color: "var(--app-primary)" }} />
              <span className="text-xs font-semibold text-text">{formatPlayTime(user.stats?.totalPlayTime || 0)}</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background">
              <FaGamepad className="text-xs shrink-0" style={{ color: "var(--app-secondary)" }} />
              <span className="text-xs font-semibold text-text">{user.stats?.gamesPlayed || 0}</span>
            </div>
          </div>
          <div className="w-full space-y-4 pt-2 border-t border-border text-xs text-text-secondary">
            <p className="flex items-center gap-1.5 truncate"><FiCalendar className="shrink-0" />{formatLastActivity(user.stats?.lastActivity, t)}</p>
            {user.stats?.favoriteGame && (
              <p className="flex items-center gap-1.5 truncate">
                <FaStar className="shrink-0" style={{ color: "var(--app-warning)" }} />{user.stats.favoriteGame}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const LIST_COLS = "grid-cols-[2fr_1fr_repeat(3,_1fr)_1fr]";

const ListHeader = ({ t }) => (
  <div className={`grid ${LIST_COLS} px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary`}>
    <span>{t("users.columnUser")}</span>
    <span>{t("users.columnRole")}</span>
    <span className="hidden sm:block"><FiClock className="inline mr-1" />{t("users.totalPlayTime")}</span>
    <span className="hidden sm:block"><FaPlay className="inline mr-1" />{t("users.totalSessions")}</span>
    <span className="hidden sm:block"><FaGamepad className="inline mr-1" />{t("users.gamesPlayedStat")}</span>
    <span className="text-right">{t("users.lastActivity")}</span>
  </div>
);

const UserRow = ({ user, t, isPrivileged, currentUserId, currentUserRole, onRoleChange }) => (
  <Link to={`/users/${user._id}`} className="block">
    <motion.div variants={fadeIn}
      className={`group grid ${LIST_COLS} items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary transition-all cursor-pointer bg-surface hover:bg-surface`}
      whileHover={{ x: 2 }}
    >
      {/* User */}
      <div className="flex items-center gap-3 min-w-0">
        <ProfileAvatar profilePicture={user.profilePicture} username={user.username} size="sm"
          className="shrink-0 group-hover:scale-105 transition-transform duration-200"
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-text truncate">{user.username}</p>
          {user.stats?.favoriteGame && (
            <p className="text-xs text-text-secondary truncate flex items-center gap-1">
              <FaStar className="shrink-0 text-[10px]" style={{ color: "var(--app-warning)" }} />
              {user.stats.favoriteGame}
            </p>
          )}
        </div>
      </div>

      {/* Role */}
      <div>
        {isPrivileged
          ? <RoleToggleButton user={user} currentUserId={currentUserId} currentUserRole={currentUserRole} onRoleChange={onRoleChange} t={t} />
          : <RoleBadge role={user.role} />
        }
      </div>

      {/* Stats */}
      <p className="hidden sm:block text-sm font-medium text-text">
        {formatPlayTime(user.stats?.totalPlayTime || 0)}
      </p>
      <p className="hidden sm:block text-sm text-text">
        {user.stats?.totalSessions || 0}
      </p>
      <p className="hidden sm:block text-sm text-text">
        {user.stats?.gamesPlayed || 0}
      </p>

      {/* Last activity */}
      <p className="text-xs text-text-secondary text-right shrink-0">
        {formatLastActivity(user.stats?.lastActivity, t)}
      </p>
    </motion.div>
  </Link>
);

const SkeletonCard = () => (
  <div className="rounded-2xl border border-border bg-surface animate-pulse overflow-hidden">
    <div className="h-1 bg-background" />
    <div className="p-4 flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-full bg-background" />
      <div className="h-3.5 w-20 rounded bg-background" />
      <div className="h-3 w-14 rounded bg-background" />
      <div className="grid grid-cols-2 gap-1.5 w-full">
        <div className="h-8 rounded-lg bg-background" />
        <div className="h-8 rounded-lg bg-background" />
      </div>
      <div className="w-full space-y-2.5 pt-2 border-t border-border">
        <div className="h-3 w-28 rounded bg-background" />
        <div className="h-3 w-20 rounded bg-background" />
      </div>
    </div>
  </div>
);

const SkeletonRow = () => (
  <div className={`grid ${LIST_COLS} items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface animate-pulse`}>
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-background shrink-0" />
      <div className="space-y-2.5 flex-1">
        <div className="h-3.5 w-24 rounded bg-background" />
        <div className="h-3 w-16 rounded bg-background" />
      </div>
    </div>
    <div className="h-5 w-20 rounded-full bg-background" />
    <div className="hidden sm:block h-4 w-10 rounded bg-background" />
    <div className="hidden sm:block h-4 w-8 rounded bg-background" />
    <div className="hidden sm:block h-4 w-8 rounded bg-background" />
    <div className="h-3 w-16 rounded bg-background ml-auto" />
  </div>
);

const Dropdown = ({ isOpen, onToggle, label, icon: Icon, children }) => (
  <div className="relative">
    <motion.button onClick={onToggle}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm font-medium"
      style={{
        background:  isOpen ? "var(--app-primary)" : "var(--app-surface)",
        borderColor: isOpen ? "var(--app-primary)" : "var(--app-border)",
        color:       isOpen ? "#fff"               : "var(--app-text)",
      }}
      onMouseEnter={!isOpen ? (e) => { e.currentTarget.style.borderColor = "var(--app-primary)"; } : undefined}
      onMouseLeave={!isOpen ? (e) => { e.currentTarget.style.borderColor = "var(--app-border)"; } : undefined}
    >
      <Icon className="text-sm" />
      {label}
      <FiChevronDown className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </motion.button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.95, y: -8 }}
          className="absolute top-full left-0 mt-2 min-w-48 rounded-xl border border-border shadow-xl z-50 bg-surface"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const SORT_OPTIONS = [
  { value: "username_asc",  label: "users.sortNameAsc" },
  { value: "username_desc", label: "users.sortNameDesc" },
  { value: "playtime_desc", label: "users.sortPlaytimeDesc" },
  { value: "playtime_asc",  label: "users.sortPlaytimeAsc" },
  { value: "created_desc",  label: "users.sortNewest" },
  { value: "created_asc",   label: "users.sortOldest" },
];

const ROLE_OPTIONS = [
  { value: "all",       label: "users.filterAllRoles" },
  { value: "admin",     label: "users.filterAdmin" },
  { value: "moderator", label: "users.filterModerator" },
  { value: "member",    label: "users.filterUser" },
];

const Users = () => {
  const { t } = useTranslation();
  const { isOnline } = useConnection();
  const { user: currentUser } = useAuth();

  const currentUserRole = currentUser?.role;
  const isPrivileged    = currentUserRole === "admin" || currentUserRole === "moderator";
  const currentUserId   = currentUser?.id || currentUser?._id;

  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searching,   setSearching]   = useState(false);
  const [fetchError,  setFetchError]  = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0 });
  const [viewMode,    setViewMode]    = useState("grid");
  const [sortBy,      setSortBy]      = useState("username_asc");
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort,    setShowSort]    = useState(false);

  const handleRoleChange = useCallback((userId, newRole) => {
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const fn = ({ userId, newRole }) => handleRoleChange(userId, newRole);
    socket.on("user:roleUpdated", fn);
    return () => { socket.off("user:roleUpdated", fn); };
  }, [handleRoleChange]);

  const loadUsers = useCallback(async (page = 1, q = "", isInitial = false) => {
    if (!isOnline) { setLoading(false); return; }
    if (isInitial) setLoading(true); else setSearching(true);
    setFetchError(null);
    try {
      const result = await getAllUsers({ search: q, page, limit: 20 });
      if (result) { setUsers(result.users || []); setPagination(result.pagination || { page: 1, pages: 1, total: 0 }); }
    } catch (err) {
      logger.error("Error loading users:", err);
      setFetchError(err.message || t("errors.loadingFailed"));
    } finally { setLoading(false); setSearching(false); }
  }, [isOnline, t]);

  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isOnline === null) return;
    const first = isFirstLoad.current;
    isFirstLoad.current = false;
    loadUsers(1, search, first);
  }, [isOnline, search, loadUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    const result = roleFilter !== "all" ? users.filter((u) => u.role === roleFilter) : [...users];
    return result.sort((a, b) => {
      switch (sortBy) {
        case "username_asc":  return a.username.localeCompare(b.username);
        case "username_desc": return b.username.localeCompare(a.username);
        case "playtime_desc": return (b.stats?.totalPlayTime || 0) - (a.stats?.totalPlayTime || 0);
        case "playtime_asc":  return (a.stats?.totalPlayTime || 0) - (b.stats?.totalPlayTime || 0);
        case "created_desc":  return new Date(b.createdAt) - new Date(a.createdAt);
        case "created_asc":   return new Date(a.createdAt) - new Date(b.createdAt);
        default: return 0;
      }
    });
  }, [users, roleFilter, sortBy]);

  const clearFilters     = () => { setRoleFilter("all"); setSortBy("username_asc"); };
  const hasActiveFilters = roleFilter !== "all" || sortBy !== "username_asc";

  const heroStats = useMemo(() => ({
    admins:     users.filter((u) => u.role === "admin").length,
    moderators: users.filter((u) => u.role === "moderator").length,
    members:    users.filter((u) => u.role === "member").length,
  }), [users]);

  const cardProps = (user) => ({
    user, t, isPrivileged, currentUserId, currentUserRole, onRoleChange: handleRoleChange,
  });

  if (!isOnline) return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="flex flex-col items-center justify-center py-32 px-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-surface border border-border" style={{ borderColor: "var(--app-warning)" }}>
          <FiWifiOff className="text-2xl" style={{ color: "var(--app-warning)" }} />
        </div>
        <h2 className="text-xl font-bold mb-2 text-text">{t("users.offlineTitle")}</h2>
        <p className="text-text-secondary text-center">{t("users.offlineMessage")}</p>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary">
      <div className="px-8 py-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "var(--app-gradient-primary)" }}>
                <FiUsers className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-text">{t("users.title")}</h1>
                <p className="text-sm text-text-secondary">{t("users.subtitle", { count: pagination.total })}</p>
              </div>
            </div>

            {!loading && (
              <div className="flex items-center gap-2 shrink-0 mt-1">
                {[
                  { label: t("users.filterAdmin"),     value: heroStats.admins,     cfg: ROLE_CFG.admin },
                  { label: t("users.filterModerator"), value: heroStats.moderators, cfg: ROLE_CFG.moderator },
                  { label: t("users.filterUser"),      value: heroStats.members,    cfg: ROLE_CFG.member },
                ].map(({ label, value, cfg }) => (
                  <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                    style={{ background: cfg.bg, borderColor: cfg.border }}
                  >
                    <FiShield className="text-xs shrink-0" style={{ color: cfg.color }} />
                    <span className="font-semibold text-text">{value}</span>
                    <span className="text-xs text-text-secondary">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {fetchError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            <span className="flex-1">{fetchError}</span>
            <button onClick={() => loadUsers(1, search)} className="underline hover:no-underline shrink-0">{t("games.retry")}</button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <SearchBar
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("users.searchPlaceholder")}
              className="w-full"
            />
            {searching && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <FiLoader className="text-xs text-text-secondary" />
              </motion.div>
            )}
          </div>

          <Dropdown isOpen={showFilters} onToggle={() => { setShowFilters(!showFilters); setShowSort(false); }}
            label={t("users.filters")} icon={FiFilter}
          >
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold uppercase text-text-secondary">{t("users.filterByRole")}</p>
              {ROLE_OPTIONS.map(({ value, label }) => {
                const active = roleFilter === value;
                return (
                  <motion.button key={value} onClick={() => { setRoleFilter(value); setShowFilters(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: active ? "var(--app-primary)" : "transparent", color: active ? "#fff" : "var(--app-text)" }}
                    whileHover={!active ? { backgroundColor: "color-mix(in srgb, var(--app-primary) 10%, transparent)" } : {}}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t(label)}
                  </motion.button>
                );
              })}
            </div>
          </Dropdown>

          <Dropdown isOpen={showSort} onToggle={() => { setShowSort(!showSort); setShowFilters(false); }}
            label={t("users.sortBy")} icon={FaSortAmountDown}
          >
            <div className="p-2">
              {SORT_OPTIONS.map(({ value, label }) => {
                const active = sortBy === value;
                return (
                  <motion.button key={value} onClick={() => { setSortBy(value); setShowSort(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={{ background: active ? "var(--app-primary)" : "transparent", color: active ? "#fff" : "var(--app-text)" }}
                    whileHover={!active ? { backgroundColor: "color-mix(in srgb, var(--app-primary) 10%, transparent)" } : {}}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t(label)}
                  </motion.button>
                );
              })}
            </div>
          </Dropdown>

          {hasActiveFilters && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              onClick={clearFilters}
              whileHover={{ scale: 1.02, backgroundColor: "color-mix(in srgb, var(--app-error) 10%, transparent)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
              style={{ color: "var(--app-error)" }}
            >
              <FiX className="text-sm" />{t("users.clearFilters")}
            </motion.button>
          )}

          <div className="flex rounded-xl border border-border overflow-hidden ml-auto">
            {[{ mode: "grid", Icon: FiGrid }, { mode: "list", Icon: FiList }].map(({ mode, Icon }) => {
              const active = viewMode === mode;
              return (
                <motion.button key={mode} onClick={() => setViewMode(mode)}
                  className="p-2.5 transition-colors"
                  style={{ background: active ? "var(--app-primary)" : "var(--app-surface)", color: active ? "#fff" : "var(--app-text)" }}
                  whileHover={!active ? { backgroundColor: "color-mix(in srgb, var(--app-primary) 15%, var(--app-surface))" } : {}}
                  whileTap={{ scale: 0.92 }}
                >
                  <Icon />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading && !searching ? (
          viewMode === "grid"
            ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}</div>
            : <div className="space-y-3"><ListHeader t={t} />{[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : filteredAndSortedUsers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-surface border border-border">
              <FiUser className="text-2xl text-text-secondary" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-text">{t("users.noUsersFound")}</h2>
            <p className="text-text-secondary">{search || hasActiveFilters ? t("users.tryAnotherSearch") : t("users.noUsersYet")}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-4 px-4 py-2 rounded-xl text-sm text-white" style={{ background: "var(--app-primary)" }}>
                {t("users.clearFilters")}
              </button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredAndSortedUsers.map((user) => <UserCard key={user._id} {...cardProps(user)} />)}
          </motion.div>
        ) : (
          <div>
            <ListHeader t={t} />
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
              className="space-y-3"
            >
              {filteredAndSortedUsers.map((user) => <UserRow key={user._id} {...cardProps(user)} />)}
            </motion.div>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 pt-4">
            <Button variant="ghost" size="sm" iconOnly icon={<FiChevronLeft />}
              onClick={() => { if (pagination.page > 1) loadUsers(pagination.page - 1, search); }}
              disabled={pagination.page <= 1}
            />
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                const { page, pages } = pagination;
                const p = pages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= pages - 2 ? pages - 4 + i : page - 2 + i;
                const active = p === page;
                return (
                  <button key={p} onClick={() => loadUsers(p, search)}
                    className="w-10 h-10 rounded-xl border transition-all text-sm font-medium"
                    style={{ background: active ? "var(--app-primary)" : "var(--app-surface)", borderColor: active ? "var(--app-primary)" : "var(--app-border)", color: active ? "#fff" : "var(--app-text)" }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" iconOnly icon={<FiChevronRight />}
              onClick={() => { if (pagination.page < pagination.pages) loadUsers(pagination.page + 1, search); }}
              disabled={pagination.page >= pagination.pages}
            />
          </motion.div>
        )}

      </div>
    </div>
  );
};

export default Users;
