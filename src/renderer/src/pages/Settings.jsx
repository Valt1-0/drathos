import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  FiSettings,
  FiUser,
  FiDownload,
  FiCheck,
  FiActivity,
  FiCircle,
  FiImage,
  FiTrash2,
  FiAlertTriangle,
  FiRefreshCw,
  FiGlobe,
  FiMonitor,
  FiLayers,
  FiCamera,
  FiUpload,
  FiBell,
  FiPower,
  FiFolder,
  FiSearch,
  FiFileText,
} from "react-icons/fi";
import { SearchBar } from "../components/ui";
import GB from "country-flag-icons/react/3x2/GB";
import FR from "country-flag-icons/react/3x2/FR";
import DE from "country-flag-icons/react/3x2/DE";
import ES from "country-flag-icons/react/3x2/ES";
import { useAuth } from "../contexts/authContext";
import { useUpdate } from "../contexts/updateContext";
import { useTheme } from "../contexts/themeContext";
import { useConnection } from "../contexts/connectionContext";
import { useNotifications } from "../contexts/notificationContext";
import { getThemesList, isColorLight } from "../config/themes";
import imageCacheService from "../services/imageCacheService";
import logger from "../services/logger";
import { uploadProfilePicture, deleteProfilePicture } from "../api/user";
import BugReportModal from "../components/modals/BugReportModal";
import KeyboardShortcutsModal from "../components/modals/KeyboardShortcutsModal";
import CustomThemeModal from "../components/modals/CustomThemeModal";
import PatchNotesModal from "../components/modals/PatchNotesModal";
import { Button, Card, Input, Toggle } from "../components/ui";
import ProfileAvatar from "../components/ProfileAvatar";
import RegistrationCard from "../components/settings/RegistrationCard";
import { getServerLimits, updateServerLimits } from "../api/server";
import { FiServer } from "react-icons/fi";

const SETTINGS_ENTRIES = [
  {
    id: "account",
    category: "general",
    icon: FiUser,
    labelKey: "settings.account",
    keywords: ["account", "profile", "avatar", "username", "photo", "picture", "compte", "profil", "utilisateur"],
  },
  {
    id: "language",
    category: "general",
    icon: FiGlobe,
    labelKey: "settings.language",
    keywords: ["language", "langue", "english", "french", "anglais", "français", "german", "deutsch", "spanish", "español", "locale", "translation", "traduction"],
  },
  {
    id: "theme",
    category: "appearance",
    icon: FiMonitor,
    labelKey: "settings.colorTheme",
    keywords: ["theme", "color theme", "couleur", "appearance", "apparence", "dark mode", "light mode", "visuel"],
  },
  {
    id: "download-path",
    category: "downloads",
    icon: FiFolder,
    labelKey: "settings.downloads",
    keywords: ["download", "install path", "folder", "directory", "téléchargement", "dossier installation", "chemin", "répertoire"],
  },
  {
    id: "notifications",
    category: "advanced",
    icon: FiBell,
    labelKey: "settings.notifications",
    keywords: ["notification", "alert", "alerte", "notify", "push notification"],
  },
  {
    id: "startup",
    category: "advanced",
    icon: FiPower,
    labelKey: "settings.launchAtStartup",
    keywords: ["startup", "démarrage", "autostart", "auto launch", "login", "boot"],
  },
  {
    id: "cache",
    category: "advanced",
    icon: FiImage,
    labelKey: "settings.imageCache",
    keywords: ["cache", "image cache", "cached images", "vider cache", "nettoyer cache", "expired"],
  },
  {
    id: "updates",
    category: "advanced",
    icon: FiRefreshCw,
    labelKey: "settings.updates",
    keywords: ["update", "mise à jour", "version", "patch", "upgrade", "changelog"],
  },
  {
    id: "patchnotes",
    category: "advanced",
    icon: FiFileText,
    labelKey: "settings.patchNotes",
    keywords: ["patch notes", "changelog", "release", "notes", "historique", "nouveautés"],
  },
  {
    id: "server-limits",
    category: "advanced",
    icon: FiServer,
    labelKey: "settings.serverLimits",
    keywords: ["upload", "limit", "size", "gb", "mod", "game", "taille", "limite", "serveur", "server"],
  },
];

// Scoring: 4=exact, 3=starts-with, 2=word-starts-with, 1=substring (3+ chars only)
const scoreText = (text, q) => {
  const lower = text.toLowerCase();
  if (lower === q) return 4;
  if (lower.startsWith(q)) return 3;
  if (lower.split(/[\s\-_]/).some(w => w.startsWith(q))) return 2;
  if (q.length >= 3 && lower.includes(q)) return 1;
  return 0;
};

const HighlightMatch = ({ text, query }) => {
  if (!query || query.length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--app-primary)', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
};

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const [downloadPath, setDownloadPath] = useState("");
  const { user, updateUser } = useAuth();
  const { checkForUpdates, updateStatus, updateInfo } = useUpdate();
  const { currentTheme, changeTheme: changeAppTheme, theme, customThemes, deleteCustomTheme } = useTheme();
  const { isOnline } = useConnection();
  const { enabled: notificationsEnabled, setNotificationsEnabled } = useNotifications();
  const themesList = getThemesList();

  const isLightTheme = theme?.colors?.background && isColorLight(theme.colors.background);

  const [activeCategory, setActiveCategory] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [openAtLogin, setOpenAtLogin] = useState(false);

  const [cacheSize, setCacheSize] = useState(0);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [customThemeModal, setCustomThemeModal] = useState({ open: false, edit: null });
  const [updateChecking, setUpdateChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [serverLimits, setServerLimits] = useState({ maxModSizeGB: 2, maxGameSizeGB: 50 });
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);
  const [limitUnits, setLimitUnits] = useState({ maxModSizeGB: 'GB', maxGameSizeGB: 'GB' });
  const [limitDrafts, setLimitDrafts] = useState({ maxModSizeGB: '', maxGameSizeGB: '' });

  const fileInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const contentRef = useRef(null);

  const categories = useMemo(() => [
    { id: 'general',    name: t('settings.general'),    icon: FiUser },
    { id: 'appearance', name: t('settings.appearance'), icon: FiMonitor },
    { id: 'downloads',  name: t('settings.downloads'),  icon: FiDownload },
    { id: 'advanced',   name: t('settings.advanced'),   icon: FiLayers },
  ], [t]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    return SETTINGS_ENTRIES
      .map(entry => {
        // Label match is weighted higher than keyword match
        const labelScore = scoreText(t(entry.labelKey), q) * 1.5;
        const kwScore = entry.keywords.reduce((best, kw) => Math.max(best, scoreText(kw, q)), 0);
        return { entry, score: Math.max(labelScore, kwScore) };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => entry);
  }, [searchQuery, t]);

  const matchingCategories = useMemo(
    () => [...new Set(searchResults.map(r => r.category))],
    [searchResults],
  );

  const showDropdown = searchFocused && searchQuery.trim().length >= 2;

  // Reset keyboard selection when results change
  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [searchQuery]);

  const navigateToSetting = useCallback((entry) => {
    setActiveCategory(entry.category);
    setSearchQuery('');
    setSearchFocused(false);
    setSelectedResultIndex(-1);
    setTimeout(() => {
      const el = document.getElementById(`setting-${entry.id}`);
      if (el && contentRef.current) {
        const offset = el.offsetTop - 24;
        contentRef.current.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }, 150);
  }, []);

  const handleSearchKeyDown = useCallback((e) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      navigateToSetting(searchResults[selectedResultIndex]);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      setSearchFocused(false);
    }
  }, [showDropdown, searchResults, selectedResultIndex, navigateToSetting]);

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateChecking(true);
    try {
      await checkForUpdates();
    } catch (error) {
      logger.error("[Settings] Error checking for updates", error);
    } finally {
      setUpdateChecking(false);
    }
  }, [checkForUpdates]);

  const handleProfilePictureUpload = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('common.error'), { description: t('settings.invalidImageType') });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('common.error'), { description: t('settings.imageTooLarge') });
      return;
    }

    setUploadingPicture(true);
    setUploadProgress(0);
    try {
      const result = await uploadProfilePicture(file, setUploadProgress);
      setProfilePicture(result.profilePicture);
      updateUser({ profilePicture: result.profilePicture });
      toast.success(t('settings.profilePictureUpdated'));
    } catch (error) {
      logger.error("[Settings] Error uploading profile picture", error);
      toast.error(t('common.error'), { description: error.message || t('settings.profilePictureError') });
    } finally {
      setUploadingPicture(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [t, updateUser]);

  const handleDeleteProfilePicture = useCallback(async () => {
    setUploadingPicture(true);
    try {
      await deleteProfilePicture();
      setProfilePicture(null);
      updateUser({ profilePicture: null });
      toast.success(t('settings.profilePictureDeleted'));
    } catch (error) {
      logger.error("[Settings] Error deleting profile picture", error);
      toast.error(t('common.error'), { description: error.message || t('settings.profilePictureError') });
    } finally {
      setUploadingPicture(false);
    }
  }, [t, updateUser]);

  const handleSaveLimits = useCallback(async () => {
    setLimitsSaving(true);
    try {
      const updated = await updateServerLimits(serverLimits);
      setServerLimits(updated);
      toast.success(t('settings.limitsUpdated'));
    } catch (error) {
      logger.error("[Settings] Error saving server limits", error);
      toast.error(t('common.error'), { description: t('settings.limitsError') });
    } finally {
      setLimitsSaving(false);
    }
  }, [serverLimits, t]);

  const handleQuickThemeToggle = useCallback(() => {
    changeAppTheme(isLightTheme ? 'darkModern' : 'lightModern');
  }, [changeAppTheme, isLightTheme]);

  const selectDownloadPath = useCallback(async () => {
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);
        window.store.set("downloadPath", newPath);
      }
    } catch (error) {
      logger.error("[Settings] Error selecting/creating folder", error);
      toast.error(t('common.error'), { description: t('settings.errorSelectFolder') });
    }
  }, [t]);

  const handleClearImageCache = useCallback(async () => {
    setCacheLoading(true);
    try {
      await imageCacheService.clearCache();
      setCacheSize(await imageCacheService.getCacheSize());
      toast.success(t('success.cacheCleared'), { description: t('settings.cacheClearedDesc') });
    } catch (error) {
      logger.error("[Settings] Error clearing cache", error);
      toast.error(t('common.error'), { description: t('settings.errorClearCache') });
    } finally {
      setCacheLoading(false);
    }
  }, [t]);

  const handleCleanExpiredImages = useCallback(async () => {
    setCacheLoading(true);
    try {
      const deletedCount = await imageCacheService.cleanExpiredImages();
      setCacheSize(await imageCacheService.getCacheSize());
      toast.success(t('success.cleanupComplete'), { description: t('settings.cleanupCompleteDesc', { count: deletedCount }) });
    } catch (error) {
      logger.error("[Settings] Error cleaning cache", error);
      toast.error(t('common.error'), { description: t('settings.errorCleanCache') });
    } finally {
      setCacheLoading(false);
    }
  }, [t]);

  // Static settings — only need to load once on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      const storedPath = await window.store.get("downloadPath");
      if (isMounted && storedPath) setDownloadPath(storedPath);

      const loginItem = await window.api.app.getLoginItem();
      if (isMounted) setOpenAtLogin(loginItem ?? false);

      try {
        setCacheLoading(true);
        const size = await imageCacheService.getCacheSize();
        if (isMounted) setCacheSize(size);
      } catch (error) {
        logger.error("[Settings] Error fetching cache size", error);
      } finally {
        if (isMounted) setCacheLoading(false);
      }

      try {
        const status = await window.api.updater.getStatus();
        if (isMounted && status.success) setCurrentVersion(status.currentVersion);
      } catch (error) {
        logger.error("[Settings] Error fetching app version", error);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, []);

  // Server limits — re-fetch whenever auth state or connectivity changes
  useEffect(() => {
    if (user?.role !== 'admin' || !isOnline) return;
    let isMounted = true;
    const fetchServerLimits = async () => {
      try {
        setLimitsLoading(true);
        const limits = await getServerLimits();
        if (isMounted) setServerLimits(limits);
      } catch (error) {
        logger.error("[Settings] Error fetching server limits", error);
      } finally {
        if (isMounted) setLimitsLoading(false);
      }
    };
    fetchServerLimits();
    return () => { isMounted = false; };
  }, [user?.role, isOnline]);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-background text-text">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="border-b backdrop-blur-xl z-10 relative"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-backgroundSecondary)' }}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'var(--app-gradient-primary)', boxShadow: 'var(--app-shadow-primary)' }}>
                <FiSettings className="text-base text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text">{t('settings.title')}</h1>
                <p className="text-xs text-text-secondary">{t('settings.subtitle')}</p>
              </div>
            </div>

            {/* Search with dropdown */}
            <div
              ref={searchContainerRef}
              className="relative w-56"
              onFocus={() => setSearchFocused(true)}
              onBlur={(e) => {
                if (!searchContainerRef.current?.contains(e.relatedTarget)) {
                  setSearchFocused(false);
                }
              }}
            >
              <SearchBar
                placeholder={t('settings.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="md"
                onKeyDown={handleSearchKeyDown}
              />

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden"
                    style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                  >
                    {searchResults.length === 0 ? (
                      <div className="flex items-center gap-2.5 px-4 py-3">
                        <FiSearch className="text-sm shrink-0" style={{ color: 'var(--app-textSecondary)' }} />
                        <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                          {t('settings.noResults', { query: searchQuery })}
                        </p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {searchResults.map((entry, index) => {
                          const Icon = entry.icon;
                          const isSelected = index === selectedResultIndex;
                          const categoryName = categories.find(c => c.id === entry.category)?.name;

                          return (
                            <button
                              key={entry.id}
                              onClick={() => navigateToSetting(entry)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                              style={{
                                background: isSelected ? 'color-mix(in srgb, var(--app-primary) 12%, transparent)' : 'transparent',
                              }}
                              onMouseEnter={() => setSelectedResultIndex(index)}
                            >
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'color-mix(in srgb, var(--app-primary) 15%, transparent)' }}
                              >
                                <Icon className="text-sm" style={{ color: 'var(--app-primary)' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--app-text)' }}>
                                  <HighlightMatch text={t(entry.labelKey)} query={searchQuery.trim()} />
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--app-textSecondary)' }}>
                                  {categoryName}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <div className="absolute right-0 top-0 bottom-0 w-12 bg-linear-to-l from-background-secondary to-transparent z-10 pointer-events-none" />
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  const hasMatch = matchingCategories.includes(category.id);

                  return (
                    <motion.button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap"
                      style={{
                        background: isActive ? 'var(--app-surface)' : 'transparent',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: isActive || hasMatch ? 'var(--app-primary)' : 'transparent',
                        opacity: searchQuery && !hasMatch ? 0.4 : 1,
                      }}
                    >
                      <Icon className="text-lg" style={{ color: isActive || hasMatch ? 'var(--app-primary)' : 'var(--app-textSecondary)' }} />
                      <span className="font-medium text-sm" style={{ color: isActive ? 'var(--app-text)' : 'var(--app-textSecondary)' }}>
                        {category.name}
                      </span>
                      {hasMatch && searchQuery && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1">
              <motion.button
                onClick={() => setIsShortcutsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/10 transition-all"
                title={t('keyboard.shortcuts')}
              >
                <kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[11px] font-mono leading-none text-text-secondary">?</kbd>
              </motion.button>

              <motion.button
                onClick={() => setIsBugReportOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-transparent hover:border-error/30 hover:bg-error/10 transition-all"
                title={t('settings.reportBug')}
              >
                <FiAlertTriangle className="text-base" style={{ color: 'var(--app-error)' }} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-transparent">
        <div className="p-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* General */}
              {activeCategory === 'general' && (
                <div className="grid grid-cols-2 gap-3">
                  <div id="setting-account">
                    <Card variant="glass" hover>
                      <Card.Header
                        icon={<FiUser className="text-sm" />}
                        title={t('settings.account')}
                        subtitle={t('settings.manageProfile')}
                      />
                      <Card.Body>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2 shrink-0">
                            <div className="relative group">
                              <ProfileAvatar
                                profilePicture={profilePicture}
                                username={user.username}
                                size="lg"
                                className="rounded-xl"
                              />
                              <motion.div
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: isOnline ? 1 : 0 }}
                                className={`absolute inset-0 rounded-xl flex items-center justify-center ${isOnline ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                                style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                                onClick={() => isOnline && !uploadingPicture && fileInputRef.current?.click()}
                              >
                                {uploadingPicture ? (
                                  uploadProgress !== null && uploadProgress < 100 ? (
                                    <span className="text-white text-xs font-bold">{uploadProgress}%</span>
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  )
                                ) : (
                                  <FiCamera className="text-base text-white" />
                                )}
                              </motion.div>
                            </div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleProfilePictureUpload}
                              className="hidden"
                              disabled={!isOnline}
                            />
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPicture || !isOnline} icon={<FiUpload />} iconPosition="left">
                                {t('settings.uploadPicture')}
                              </Button>
                              {profilePicture && (
                                <Button variant="danger" size="sm" onClick={handleDeleteProfilePicture} disabled={uploadingPicture || !isOnline} icon={<FiTrash2 />} iconPosition="left">
                                  {t('settings.deletePicture')}
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 space-y-3 min-w-0">
                            <Input label={t('settings.username')} value={user.username} icon={<FiUser />} disabled />
                            {user.role && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--app-background)' }}>
                                <span className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>{t('settings.role')}:</span>
                                <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded" style={{ background: user.role === 'admin' ? 'var(--app-primary)' : 'var(--app-secondary)', color: '#fff' }}>
                                  {user.role}
                                </span>
                              </div>
                            )}
                            <p className="text-xs" style={{ color: 'var(--app-textSecondary)' }}>
                              {isOnline ? t('settings.pictureHint') : t('settings.offlineNoChanges')}
                            </p>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>

                  <div id="setting-language">
                    <Card variant="glass" hover>
                      <Card.Header
                        icon={<FiGlobe className="text-sm" />}
                        title={t('settings.language')}
                        subtitle={t('settings.languageDesc')}
                      />
                      <Card.Body>
                        <div className="flex flex-col gap-2">
                          {[
                            { code: 'en', Flag: GB, label: t('settings.languageEnglish') },
                            { code: 'fr', Flag: FR, label: t('settings.languageFrench') },
                            { code: 'de', Flag: DE, label: t('settings.languageGerman') },
                            { code: 'es', Flag: ES, label: t('settings.languageSpanish') },
                          ].map(({ code, Flag, label }) => (
                            <motion.button
                              key={code}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => i18n.changeLanguage(code)}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg border transition-all"
                              style={{
                                background: i18n.language === code ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                borderColor: i18n.language === code ? 'var(--app-success)' : 'var(--app-border)',
                              }}
                            >
                              <div className="w-7 h-5 rounded overflow-hidden shadow-sm shrink-0">
                                <Flag className="w-full h-full" />
                              </div>
                              <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--app-text)' }}>{label}</span>
                              {i18n.language === code && <FiCheck className="text-sm shrink-0" style={{ color: 'var(--app-success)' }} />}
                            </motion.button>
                          ))}
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeCategory === 'appearance' && (
                <div className="space-y-2">
                  <div id="setting-theme">
                    <Card variant="glass" hover>
                      <Card.Header
                        icon={<FiMonitor className="text-sm" />}
                        title={t('settings.colorTheme')}
                        subtitle={t('settings.colorThemeDesc')}
                      />
                      <Card.Body>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {/* Built-in themes */}
                          {themesList.map((themeOption) => {
                            const isActive = currentTheme === themeOption.id;
                            return (
                              <motion.button
                                key={themeOption.id}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => changeAppTheme(themeOption.id)}
                                className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${isActive ? 'border-secondary shadow-lg shadow-secondary/30' : 'border-white/10 hover:border-secondary/50'}`}
                                style={{
                                  background: isActive
                                    ? `linear-gradient(135deg, ${themeOption.colors.primary}15 0%, ${themeOption.colors.secondary}15 100%)`
                                    : 'rgba(255, 255, 255, 0.03)',
                                }}
                              >
                                <div className="flex gap-1.5 mb-2 justify-center">
                                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}60` }} />
                                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.secondary, boxShadow: `0 0 8px ${themeOption.colors.secondary}60` }} />
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-xs" style={{ color: 'var(--app-text)' }}>{themeOption.name}</div>
                                </div>
                                {isActive && (
                                  <motion.div
                                    layoutId="activeThemeIndicator"
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}80` }}
                                  >
                                    <FiCheck className="text-xs" style={{ color: '#FFFFFF' }} />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}

                          {/* Custom themes */}
                          {customThemes.map((themeOption) => {
                            const isActive = currentTheme === themeOption.id;
                            return (
                              <motion.button
                                key={themeOption.id}
                                whileHover={{ scale: 1.03, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => changeAppTheme(themeOption.id)}
                                className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${isActive ? 'border-secondary shadow-lg shadow-secondary/30' : 'border-white/10 hover:border-secondary/50'}`}
                                style={{
                                  background: isActive
                                    ? `linear-gradient(135deg, ${themeOption.colors.primary}15 0%, ${themeOption.colors.secondary}15 100%)`
                                    : 'rgba(255, 255, 255, 0.03)',
                                }}
                              >
                                <div className="flex gap-1.5 mb-2 justify-center">
                                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}60` }} />
                                  <div className="w-5 h-5 rounded-full shadow-lg" style={{ background: themeOption.gradients.secondary, boxShadow: `0 0 8px ${themeOption.colors.secondary}60` }} />
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-xs truncate" style={{ color: 'var(--app-text)' }}>{themeOption.name}</div>
                                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--app-textSecondary)' }}>{t('settings.customTheme')}</div>
                                </div>
                                {isActive && (
                                  <motion.div
                                    layoutId="activeThemeIndicator"
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{ background: themeOption.gradients.primary, boxShadow: `0 0 8px ${themeOption.colors.primary}80` }}
                                  >
                                    <FiCheck className="text-xs" style={{ color: '#FFFFFF' }} />
                                  </motion.div>
                                )}
                                {/* Edit + Delete buttons on hover */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCustomThemeModal({ open: true, edit: themeOption }); }}
                                    className="px-3 py-1.5 rounded-lg bg-primary/80 text-white text-xs font-medium hover:bg-primary transition-colors"
                                  >
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteCustomTheme(themeOption.id); if (isActive) changeAppTheme('default'); }}
                                    className="px-3 py-1.5 rounded-lg bg-error/80 text-white text-xs font-medium hover:bg-error transition-colors"
                                  >
                                    {t('common.delete')}
                                  </button>
                                </div>
                              </motion.button>
                            );
                          })}

                          {/* Add custom theme card */}
                          <motion.button
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setCustomThemeModal({ open: true, edit: null })}
                            className="relative p-3 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 min-h-20"
                          >
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center text-text-secondary">
                              <span className="text-lg leading-none">+</span>
                            </div>
                            <div className="text-xs font-medium text-text-secondary text-center">{t('settings.addCustomTheme')}</div>
                          </motion.button>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              )}

              {/* Downloads */}
              {activeCategory === 'downloads' && (
                <div className="space-y-2">
                  <div id="setting-download-path">
                    <Card variant="glass" hover>
                      <Card.Header
                        icon={<FiDownload className="text-sm" />}
                        title={t('settings.downloads')}
                        subtitle={t('settings.installPath')}
                      />
                      <Card.Body>
                        <div className="flex gap-3">
                          <Input value={downloadPath || t('settings.noPathSelected')} icon={<FiFolder />} disabled className={`flex-1 ${!downloadPath ? '[&_input]:italic [&_input]:opacity-50' : ''}`} />
                          <Button variant="success" onClick={selectDownloadPath} icon={<FiFolder />} iconPosition="left">
                            {t('settings.browse')}
                          </Button>
                        </div>
                        {downloadPath && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs flex items-center gap-2 mt-4"
                            style={{ color: 'var(--app-textSecondary)' }}
                          >
                            <FiCheck style={{ color: 'var(--app-success)' }} />
                            {t('settings.gamesWillBeInstalled')}
                          </motion.p>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              )}

              {/* Advanced */}
              {activeCategory === 'advanced' && (
                <div className="space-y-2">

                  {/* Tous les réglages dans une seule card unifiée */}
                  <Card variant="glass">
                    <Card.Body>
                      {[
                        {
                          id: 'setting-notifications',
                          Icon: FiBell,
                          iconColor: 'var(--app-primary)',
                          label: t('settings.notifications'),
                          desc: t('settings.notificationsDesc'),
                          control: <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />,
                        },
                        {
                          id: 'setting-startup',
                          Icon: FiPower,
                          iconColor: 'var(--app-primary)',
                          label: t('settings.launchAtStartup'),
                          desc: t('settings.launchAtStartupDesc'),
                          control: <Toggle checked={openAtLogin} onChange={(v) => { setOpenAtLogin(v); window.api.app.setLoginItem(v); }} />,
                        },
                        {
                          id: 'setting-cache',
                          Icon: FiImage,
                          iconColor: 'var(--app-warning)',
                          iconBg: 'color-mix(in srgb, var(--app-warning) 12%, transparent)',
                          label: (
                            <span className="flex items-center gap-2">
                              {t('settings.imageCache')}
                              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full tabular-nums" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--app-warning)' }}>
                                {cacheLoading ? '…' : cacheSize}
                              </span>
                            </span>
                          ),
                          desc: t('settings.imageCacheDesc'),
                          control: (
                            <div className="flex items-center gap-1.5">
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={handleCleanExpiredImages} disabled={cacheLoading}
                                title={t('settings.cleanExpiredImages')}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                                style={{ color: 'var(--app-primary)', background: 'color-mix(in srgb, var(--app-primary) 10%, transparent)' }}>
                                <FiActivity className="text-sm" />
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={handleClearImageCache} disabled={cacheLoading}
                                title={t('settings.clearEntireCache')}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                                style={{ color: 'var(--app-error)', background: 'color-mix(in srgb, var(--app-error) 10%, transparent)' }}>
                                <FiTrash2 className="text-sm" />
                              </motion.button>
                            </div>
                          ),
                        },
                        {
                          id: 'setting-updates',
                          Icon: FiRefreshCw,
                          iconColor: 'var(--app-primary)',
                          iconClass: updateChecking || updateStatus === 'checking' ? 'animate-spin' : '',
                          label: (
                            <span className="flex items-center gap-2">
                              {t('settings.updates')}
                              {currentVersion && (
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--app-primary)' }}>
                                  v{currentVersion}
                                </span>
                              )}
                            </span>
                          ),
                          desc: t('settings.updatesDesc'),
                          extra: updateStatus === 'available' && updateInfo ? (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-1.5">
                              <div className="ml-10 py-1.5 px-3 rounded-lg" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <p className="text-xs font-semibold" style={{ color: 'var(--app-primary)' }}>{t('settings.updateAvailable')} — v{updateInfo.version}</p>
                              </div>
                            </motion.div>
                          ) : null,
                          control: (
                            <Button size="sm" variant="ghost" onClick={handleCheckForUpdates} disabled={updateChecking || updateStatus === 'checking'}>
                              {updateChecking || updateStatus === 'checking' ? '…' : t('settings.checkForUpdates')}
                            </Button>
                          ),
                        },
                        {
                          id: 'setting-patchnotes',
                          Icon: FiFileText,
                          iconColor: 'var(--app-primary)',
                          label: t('settings.patchNotes'),
                          desc: t('settings.patchNotesDesc'),
                          control: (
                            <Button size="sm" variant="ghost" onClick={() => setIsPatchNotesOpen(true)}>
                              {t('settings.viewPatchNotes')}
                            </Button>
                          ),
                        },
                      ].map(({ id, Icon, iconColor, iconBg, iconClass = '', label, desc, control, extra }, i, arr) => (
                        <div key={id} id={id}>
                          <div
                            className="flex items-center gap-3 py-2.5"
                            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--app-border)' : 'none' }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: iconBg ?? 'color-mix(in srgb, var(--app-primary) 10%, transparent)' }}
                            >
                              <Icon className={`text-base ${iconClass}`} style={{ color: iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight" style={{ color: 'var(--app-text)' }}>{label}</p>
                              <p className="text-xs mt-0.5" style={{ color: 'var(--app-textSecondary)' }}>{desc}</p>
                            </div>
                            <div className="shrink-0">{control}</div>
                          </div>
                          {extra && <AnimatePresence>{extra}</AnimatePresence>}
                        </div>
                      ))}
                    </Card.Body>
                  </Card>

                  {/* Limites serveur (admin uniquement) */}
                  {user?.role === 'admin' && (() => {
                    const configs = [
                      { key: 'maxModSizeGB',  icon: <FiUpload />,  label: t('settings.maxModSize'),  ranges: { GB: { min: 0.1, max: 100,  step: 0.5 }, MB: { min: 100,  max: 102400,  step: 100 } } },
                      { key: 'maxGameSizeGB', icon: <FiMonitor />, label: t('settings.maxGameSize'), ranges: { GB: { min: 1,   max: 2000, step: 1   }, MB: { min: 1000, max: 2048000, step: 500 } } },
                    ];
                    const toDisplay = (gb, unit) => unit === 'MB' ? Math.round(gb * 1024) : gb;
                    const toGB = (val, unit) => unit === 'MB' ? val / 1024 : val;
                    return (
                      <div id="setting-server-limits">
                        <Card variant="glass" hover>
                          <Card.Header
                            icon={<FiServer className="text-sm" />}
                            title={t('settings.serverLimits')}
                            subtitle={t('settings.serverLimitsDesc')}
                            action={
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={handleSaveLimits}
                                disabled={limitsSaving || !isOnline}
                                icon={limitsSaving
                                  ? <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin border-white" />
                                  : <FiCheck />}
                                iconPosition="left"
                              >
                                {limitsSaving ? t('settings.savingLimits') : t('settings.saveLimits')}
                              </Button>
                            }
                          />
                          <Card.Body>
                            {limitsLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--app-primary)', borderTopColor: 'transparent' }} />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                {configs.map(({ key, icon, label, ranges }) => {
                                  const unit = limitUnits[key];
                                  const { min, max, step } = ranges[unit];
                                  const displayVal = toDisplay(serverLimits[key], unit);
                                  const draft = limitDrafts[key];
                                  return (
                                    <div
                                      key={key}
                                      className="rounded-xl p-3"
                                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--app-border)' }}
                                    >
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                          <span style={{ color: 'var(--app-primary)' }}>{icon}</span>
                                          <span className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{label}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={draft !== '' ? draft : String(unit === 'GB' ? parseFloat(displayVal.toFixed(key === 'maxModSizeGB' ? 1 : 0)) : displayVal)}
                                            onFocus={() => setLimitDrafts(prev => ({ ...prev, [key]: String(unit === 'GB' ? parseFloat(displayVal.toFixed(key === 'maxModSizeGB' ? 1 : 0)) : displayVal) }))}
                                            onChange={(e) => setLimitDrafts(prev => ({ ...prev, [key]: e.target.value }))}
                                            onBlur={(e) => {
                                              const parsed = parseFloat(e.target.value.replace(',', '.'));
                                              const clamped = isNaN(parsed) ? min : Math.min(max, Math.max(min, parsed));
                                              setServerLimits(prev => ({ ...prev, [key]: toGB(clamped, unit) }));
                                              setLimitDrafts(prev => ({ ...prev, [key]: '' }));
                                            }}
                                            disabled={limitsSaving || !isOnline}
                                            className="w-16 text-sm font-bold text-right bg-transparent outline-none"
                                            style={{
                                              color: 'var(--app-primary)',
                                              borderBottom: '1px solid var(--app-border)',
                                            }}
                                          />
                                          <button
                                            onClick={() => {
                                              setLimitUnits(prev => ({ ...prev, [key]: unit === 'GB' ? 'MB' : 'GB' }));
                                              setLimitDrafts(prev => ({ ...prev, [key]: '' }));
                                            }}
                                            disabled={limitsSaving || !isOnline}
                                            className="text-xs font-semibold px-1.5 py-0.5 rounded-md transition-colors"
                                            style={{ color: 'var(--app-primary)', background: 'rgba(99,102,241,0.15)' }}
                                          >
                                            {unit}
                                          </button>
                                        </div>
                                      </div>
                                      <input
                                        type="range"
                                        min={min} max={max} step={step}
                                        value={Math.min(max, Math.max(min, displayVal))}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          setServerLimits(prev => ({ ...prev, [key]: toGB(val, unit) }));
                                          setLimitDrafts(prev => ({ ...prev, [key]: '' }));
                                        }}
                                        disabled={limitsSaving || !isOnline}
                                        className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                                        style={{ accentColor: 'var(--app-primary)', height: '4px' }}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </div>
                    );
                  })()}

                  {/* Inscriptions & codes d'invitation (admin uniquement) */}
                  {user?.role === 'admin' && <RegistrationCard isOnline={isOnline} />}

                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <BugReportModal isOpen={isBugReportOpen} onClose={() => setIsBugReportOpen(false)} />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <PatchNotesModal isOpen={isPatchNotesOpen} onClose={() => setIsPatchNotesOpen(false)} />
      <CustomThemeModal
        isOpen={customThemeModal.open}
        onClose={() => setCustomThemeModal({ open: false, edit: null })}
        editTheme={customThemeModal.edit}
      />
    </div>
  );
};

export default SettingsPage;
