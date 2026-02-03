import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch, FiUser, FiClock, FiWifiOff, FiChevronLeft, FiChevronRight,
  FiGrid, FiList, FiFilter, FiChevronDown, FiX, FiCalendar
} from "react-icons/fi";
import { FaGamepad, FaStar, FaSortAmountDown, FaPlay } from "react-icons/fa";
import { getAllUsers } from "../api/user";
import { useTheme } from "../contexts/themeContext";
import { useConnection } from "../contexts/connectionContext";
import ProfileAvatar from "../components/ProfileAvatar";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const formatPlayTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  if (hours < 1) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }
  return `${hours}h`;
};

const formatLastActivity = (timestamp, t) => {
  if (!timestamp) return t('users.never');
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('users.justNow');
  if (minutes < 60) return t('users.minutesAgo', { count: minutes });
  if (hours < 24) return t('users.hoursAgo', { count: hours });
  if (days < 7) return t('users.daysAgo', { count: days });
  if (days < 30) return t('users.weeksAgo', { count: Math.floor(days / 7) });
  return new Date(timestamp).toLocaleDateString();
};

// Grid Card View
const UserCard = ({ user, t }) => (
  <Link to={`/users/${user._id}`}>
    <motion.div
      variants={fadeIn}
      className="group p-5 rounded-2xl border hover:scale-[1.02] transition-all cursor-pointer"
      style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      whileHover={{ borderColor: 'var(--app-primary)' }}
    >
      <div className="flex items-center gap-4 mb-4">
        <ProfileAvatar profilePicture={user.profilePicture} username={user.username} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>
            {user.username}
          </h3>
          <p className="text-xs capitalize" style={{ color: 'var(--app-textSecondary)' }}>
            {user.role}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FiClock className="text-sm" style={{ color: 'var(--app-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
            {formatPlayTime(user.stats?.totalPlayTime || 0)}
          </span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FaGamepad className="text-sm" style={{ color: 'var(--app-secondary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>
            {user.stats?.gamesPlayed || 0} {t('users.gamesPlayed')}
          </span>
        </div>
      </div>

      {/* Last Activity & Favorite Game */}
      <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--app-border)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--app-textSecondary)' }}>
          <FiCalendar className="flex-shrink-0" />
          <span className="truncate">{t('users.lastActivity')}: {formatLastActivity(user.stats?.lastActivity, t)}</span>
        </div>
        {user.stats?.favoriteGame && (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--app-textSecondary)' }}>
            <FaStar className="flex-shrink-0" style={{ color: 'var(--app-warning)' }} />
            <span className="truncate">{user.stats.favoriteGame}</span>
          </div>
        )}
      </div>
    </motion.div>
  </Link>
);

// List Row View
const UserRow = ({ user, t }) => (
  <Link to={`/users/${user._id}`}>
    <motion.div
      variants={fadeIn}
      className="group flex items-center gap-4 p-4 rounded-xl border hover:scale-[1.01] transition-all cursor-pointer"
      style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      whileHover={{ borderColor: 'var(--app-primary)' }}
    >
      <ProfileAvatar profilePicture={user.profilePicture} username={user.username} size="sm" />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate" style={{ color: 'var(--app-text)' }}>
          {user.username}
        </h3>
        <p className="text-xs capitalize" style={{ color: 'var(--app-textSecondary)' }}>
          {user.role}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FiClock className="text-xs" style={{ color: 'var(--app-primary)' }} />
          <span className="text-xs" style={{ color: 'var(--app-text)' }}>{formatPlayTime(user.stats?.totalPlayTime || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FaPlay className="text-xs" style={{ color: 'var(--app-secondary)' }} />
          <span className="text-xs" style={{ color: 'var(--app-text)' }}>{user.stats?.totalSessions || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FaGamepad className="text-xs" style={{ color: 'var(--app-success)' }} />
          <span className="text-xs" style={{ color: 'var(--app-text)' }}>{user.stats?.gamesInstalled || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--app-background)' }}>
          <FaGamepad className="text-xs" style={{ color: 'var(--app-warning)' }} />
          <span className="text-xs" style={{ color: 'var(--app-text)' }}>{user.stats?.gamesPlayed || 0}</span>
        </div>
      </div>

      <div className="text-xs text-right" style={{ color: 'var(--app-textSecondary)' }}>
        {formatLastActivity(user.stats?.lastActivity, t)}
      </div>
    </motion.div>
  </Link>
);

const SkeletonCard = () => (
  <div
    className="p-5 rounded-2xl border animate-pulse"
    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-14 h-14 rounded-xl" style={{ background: 'var(--app-background)' }} />
      <div className="flex-1">
        <div className="h-5 w-24 rounded mb-2" style={{ background: 'var(--app-background)' }} />
        <div className="h-3 w-16 rounded" style={{ background: 'var(--app-background)' }} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 mb-3">
      <div className="h-10 rounded-lg" style={{ background: 'var(--app-background)' }} />
      <div className="h-10 rounded-lg" style={{ background: 'var(--app-background)' }} />
    </div>
    <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--app-border)' }}>
      <div className="h-3 w-32 rounded" style={{ background: 'var(--app-background)' }} />
      <div className="h-3 w-24 rounded" style={{ background: 'var(--app-background)' }} />
    </div>
  </div>
);

const SkeletonRow = () => (
  <div
    className="flex items-center gap-4 p-4 rounded-xl border animate-pulse"
    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
  >
    <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--app-background)' }} />
    <div className="flex-1">
      <div className="h-4 w-28 rounded mb-1" style={{ background: 'var(--app-background)' }} />
      <div className="h-3 w-16 rounded" style={{ background: 'var(--app-background)' }} />
    </div>
    <div className="hidden sm:flex gap-6">
      <div className="h-4 w-12 rounded" style={{ background: 'var(--app-background)' }} />
      <div className="h-4 w-8 rounded" style={{ background: 'var(--app-background)' }} />
    </div>
    <div className="h-3 w-20 rounded" style={{ background: 'var(--app-background)' }} />
  </div>
);

// Filter/Sort Dropdown Component
const Dropdown = ({ isOpen, onToggle, label, icon: Icon, children }) => (
  <div className="relative">
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
      style={{
        background: isOpen ? 'var(--app-primary)' : 'var(--app-surface)',
        borderColor: isOpen ? 'var(--app-primary)' : 'var(--app-border)',
        color: isOpen ? '#fff' : 'var(--app-text)'
      }}
    >
      <Icon className="text-sm" />
      <span className="text-sm">{label}</span>
      <FiChevronDown className={`text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-2 min-w-48 rounded-xl border shadow-lg z-50 overflow-hidden"
          style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const SORT_OPTIONS = [
  { value: 'username_asc', label: 'users.sortNameAsc' },
  { value: 'username_desc', label: 'users.sortNameDesc' },
  { value: 'playtime_desc', label: 'users.sortPlaytimeDesc' },
  { value: 'playtime_asc', label: 'users.sortPlaytimeAsc' },
  { value: 'created_desc', label: 'users.sortNewest' },
  { value: 'created_asc', label: 'users.sortOldest' },
];

const ROLE_OPTIONS = [
  { value: 'all', label: 'users.filterAllRoles' },
  { value: 'admin', label: 'users.filterAdmin' },
  { value: 'user', label: 'users.filterUser' },
];

const Users = () => {
  const { t } = useTranslation();
  const { getBackgroundStyle } = useTheme();
  const { isOnline } = useConnection();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // New states for filters, sort and view
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('username_asc');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const loadUsers = useCallback(async (page = 1, searchQuery = "") => {
    if (!isOnline) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getAllUsers({ search: searchQuery, page, limit: 20 });
      if (result) {
        setUsers(result.users || []);
        setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    if (isOnline !== null) {
      loadUsers(1, search);
    }
  }, [isOnline, search, loadUsers]);

  // Filter and sort users client-side
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'username_asc':
          return a.username.localeCompare(b.username);
        case 'username_desc':
          return b.username.localeCompare(a.username);
        case 'playtime_desc':
          return (b.stats?.totalPlayTime || 0) - (a.stats?.totalPlayTime || 0);
        case 'playtime_asc':
          return (a.stats?.totalPlayTime || 0) - (b.stats?.totalPlayTime || 0);
        case 'created_desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'created_asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        default:
          return 0;
      }
    });

    return result;
  }, [users, roleFilter, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      loadUsers(newPage, search);
    }
  };

  const clearFilters = () => {
    setRoleFilter('all');
    setSortBy('username_asc');
  };

  const hasActiveFilters = roleFilter !== 'all' || sortBy !== 'username_asc';

  // Offline state
  if (!isOnline) {
    return (
      <div className="h-full overflow-y-auto p-6" style={getBackgroundStyle('gradient')}>
        <div className="max-w-6xl mx-auto">
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
            <p className="text-center" style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.offlineMessage')}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-primary" style={getBackgroundStyle('gradient')}>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>
              {t('users.title')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
              {t('users.subtitle', { count: pagination.total })}
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <FiSearch
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--app-textSecondary)' }}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="w-full md:w-72 pl-11 pr-4 py-3 rounded-xl border outline-none transition-all focus:border-primary"
              style={{
                background: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)'
              }}
            />
          </form>
        </motion.div>

        {/* Filters & Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          {/* Filter Dropdown */}
          <Dropdown
            isOpen={showFilters}
            onToggle={() => { setShowFilters(!showFilters); setShowSort(false); }}
            label={t('users.filters')}
            icon={FiFilter}
          >
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold uppercase" style={{ color: 'var(--app-textSecondary)' }}>
                {t('users.filterByRole')}
              </p>
              {ROLE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => { setRoleFilter(option.value); setShowFilters(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: roleFilter === option.value ? 'var(--app-primary)' : 'transparent',
                    color: roleFilter === option.value ? '#fff' : 'var(--app-text)'
                  }}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
          </Dropdown>

          {/* Sort Dropdown */}
          <Dropdown
            isOpen={showSort}
            onToggle={() => { setShowSort(!showSort); setShowFilters(false); }}
            label={t('users.sortBy')}
            icon={FaSortAmountDown}
          >
            <div className="p-2">
              {SORT_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => { setSortBy(option.value); setShowSort(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background: sortBy === option.value ? 'var(--app-primary)' : 'transparent',
                    color: sortBy === option.value ? '#fff' : 'var(--app-text)'
                  }}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>
          </Dropdown>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--app-error)' }}
            >
              <FiX className="text-sm" />
              {t('users.clearFilters')}
            </motion.button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div
            className="flex rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 transition-colors"
              style={{
                background: viewMode === 'grid' ? 'var(--app-primary)' : 'var(--app-surface)',
                color: viewMode === 'grid' ? '#fff' : 'var(--app-text)'
              }}
              title={t('users.viewGrid')}
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 transition-colors"
              style={{
                background: viewMode === 'list' ? 'var(--app-primary)' : 'var(--app-surface)',
                color: viewMode === 'list' ? '#fff' : 'var(--app-text)'
              }}
              title={t('users.viewList')}
            >
              <FiList />
            </button>
          </div>
        </motion.div>

        {/* Users Grid/List */}
        {loading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          )
        ) : filteredAndSortedUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}
            >
              <FiUser className="text-3xl" style={{ color: 'var(--app-textSecondary)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--app-text)' }}>
              {t('users.noUsersFound')}
            </h2>
            <p style={{ color: 'var(--app-textSecondary)' }}>
              {search || hasActiveFilters ? t('users.tryAnotherSearch') : t('users.noUsersYet')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--app-primary)', color: '#fff' }}
              >
                {t('users.clearFilters')}
              </button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredAndSortedUsers.map((user) => (
              <UserCard key={user._id} user={user} t={t} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
            className="space-y-3"
          >
            {filteredAndSortedUsers.map((user) => (
              <UserRow key={user._id} user={user} t={t} />
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 pt-4"
          >
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg border transition-all disabled:opacity-50"
              style={{
                background: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)'
              }}
            >
              <FiChevronLeft />
            </button>

            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                let pageNum;
                if (pagination.pages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 2) {
                  pageNum = pagination.pages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className="w-10 h-10 rounded-lg border transition-all"
                    style={{
                      background: pageNum === pagination.page ? 'var(--app-primary)' : 'var(--app-surface)',
                      borderColor: pageNum === pagination.page ? 'var(--app-primary)' : 'var(--app-border)',
                      color: pageNum === pagination.page ? '#fff' : 'var(--app-text)'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-2 rounded-lg border transition-all disabled:opacity-50"
              style={{
                background: 'var(--app-surface)',
                borderColor: 'var(--app-border)',
                color: 'var(--app-text)'
              }}
            >
              <FiChevronRight />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Users;
