import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  FiSettings,
  FiUser,
  FiDownload,
  FiMoon,
  FiSun,
  FiFolder,
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
} from "react-icons/fi";
import { SearchBar } from "../components/ui";
import { SiDiscord } from "react-icons/si";
import GB from "country-flag-icons/react/3x2/GB";
import FR from "country-flag-icons/react/3x2/FR";
import { useAuth } from "../contexts/authContext";
import { useUpdate } from "../contexts/updateContext";
import { useTheme } from "../contexts/themeContext";
import { getThemesList } from "../config/themes";
import imageCacheService from "../services/imageCacheService";
import logger from "../services/logger";
import BugReportModal from "../components/modals/BugReportModal";
import { Button, Card, Input, Toggle } from "../components/ui";

const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const [downloadPath, setDownloadPath] = useState("");
  const { user } = useAuth();
  const { checkForUpdates, updateStatus, updateInfo } = useUpdate();
  const { currentTheme, changeTheme: changeAppTheme, theme, getBackgroundStyle } = useTheme();
  const themesList = getThemesList();

  // Déterminer si le thème actuel est clair ou sombre
  const isLightTheme = theme?.colors?.background &&
    parseInt(theme.colors.background.replace('#', ''), 16) > 0x808080;

  // UI States
  const [activeCategory, setActiveCategory] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");

  // Discord RPC States
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [discordStatus, setDiscordStatus] = useState({
    isConnected: false,
    user: null,
  });
  const [discordLoading, setDiscordLoading] = useState(false);

  // Image Cache States
  const [cacheSize, setCacheSize] = useState(0);
  const [cacheLoading, setCacheLoading] = useState(false);

  // Bug Report Modal State
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);

  // Update States
  const [updateChecking, setUpdateChecking] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  // Categories
  const categories = [
    { id: 'general', name: t('settings.general'), icon: FiUser },
    { id: 'appearance', name: t('settings.appearance'), icon: FiMonitor },
    { id: 'downloads', name: t('settings.downloads'), icon: FiDownload },
    { id: 'advanced', name: t('settings.advanced'), icon: FiLayers },
  ];

  // Handle manual update check
  const handleCheckForUpdates = async () => {
    setUpdateChecking(true);
    try {
      await checkForUpdates();
    } catch (error) {
      logger.error("[Settings] Error checking for updates", error);
    } finally {
      setUpdateChecking(false);
    }
  };

  // Toggle entre Light Modern et Dark Modern
  const handleQuickThemeToggle = () => {
    const newTheme = isLightTheme ? 'darkModern' : 'lightModern';
    changeAppTheme(newTheme);
  };

  const selectDownloadPath = async () => {
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);
        window.store.set("downloadPath", newPath);
      }
    } catch (error) {
      logger.error("[Settings] Error selecting/creating folder", error);
      toast.error(t('common.error'), {
        description: t('settings.errorSelectFolder'),
      });
    }
  };

  // Discord RPC - Toggle
  const handleDiscordToggle = async () => {
    setDiscordLoading(true);

    try {
      if (discordEnabled) {
        // Disable Discord RPC
        await window.api.discordRPC.setEnabled({ enabled: false });
        setDiscordEnabled(false);
        await window.store.set("discordRPCEnabled", false);

        toast.success(t('success.discordDisabled'), {
          description: t('settings.discordDisabledDesc'),
        });
      } else {
        // Enable Discord RPC
        const result = await window.api.discordRPC.initialize({
          enabled: true,
        });

        if (result.success) {
          setDiscordEnabled(true);
          await window.store.set("discordRPCEnabled", true);

          // Get status
          const status = await window.api.discordRPC.getStatus();
          setDiscordStatus(status);

          toast.success(t('success.discordEnabled'), {
            description: result.connected
              ? t('settings.discordEnabledDesc', { username: status.user ? ` (${status.user.username})` : '' })
              : t('settings.discordEnabledNoConnection'),
          });
        } else {
          toast.error(t('settings.discordError'), {
            description: result.error || t('settings.discordErrorConnect'),
          });
        }
      }
    } catch (error) {
      logger.error("[Settings] Discord RPC error", error);
      toast.error(t('settings.discordError'), {
        description: error.message,
      });
    } finally {
      setDiscordLoading(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      toast.success(t('success.settingsSaved'), {
        description: t('settings.settingsSavedDesc'),
      });
    } catch (error) {
      toast.error(t('settings.saveError'), {
        description: t('settings.saveErrorDesc'),
      });
    }
  };

  // Clear Image Cache
  const handleClearImageCache = async () => {
    setCacheLoading(true);
    try {
      await imageCacheService.clearCache();
      const newSize = await imageCacheService.getCacheSize();
      setCacheSize(newSize);

      toast.success(t('success.cacheCleared'), {
        description: t('settings.cacheClearedDesc'),
      });
    } catch (error) {
      logger.error("[Settings] Error clearing cache", error);
      toast.error(t('common.error'), {
        description: t('settings.errorClearCache'),
      });
    } finally {
      setCacheLoading(false);
    }
  };

  // Clean Expired Images
  const handleCleanExpiredImages = async () => {
    setCacheLoading(true);
    try {
      const deletedCount = await imageCacheService.cleanExpiredImages();
      const newSize = await imageCacheService.getCacheSize();
      setCacheSize(newSize);

      toast.success(t('success.cleanupComplete'), {
        description: t('settings.cleanupCompleteDesc', { count: deletedCount }),
      });
    } catch (error) {
      logger.error("[Settings] Error cleaning cache", error);
      toast.error(t('common.error'), {
        description: t('settings.errorCleanCache'),
      });
    } finally {
      setCacheLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const storedPath = await window.store.get("downloadPath");
      const storedEnabled = await window.store.get("discordRPCEnabled");

      if (storedPath) setDownloadPath(storedPath);
      if (storedEnabled) {
        setDiscordEnabled(storedEnabled);
        // Get Discord status
        try {
          const status = await window.api.discordRPC.getStatus();
          setDiscordStatus(status);
        } catch (error) {
          logger.error("[Settings] Error fetching Discord status", error);
        }
      }

      // Get image cache size
      try {
        const size = await imageCacheService.getCacheSize();
        setCacheSize(size);
      } catch (error) {
        logger.error("[Settings] Error fetching cache size", error);
      }

      // Get current version
      try {
        const status = await window.api.updater.getStatus();
        if (status.success) {
          setCurrentVersion(status.currentVersion);
        }
      } catch (error) {
        logger.error("[Settings] Error fetching app version", error);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-background text-text">
      {/* Header with horizontal navigation */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="border-b backdrop-blur-xl"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-backgroundSecondary)' }}
      >
        <div className="px-8 py-6">
          {/* Title and Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl" style={{ background: 'var(--app-gradient-primary)', boxShadow: 'var(--app-shadow-primary)' }}>
                <FiSettings className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-text">
                  {t('settings.title')}
                </h1>
                <p className="text-sm text-text-secondary">{t('settings.subtitle')}</p>
              </div>
            </div>

            {/* Search Bar - Compact */}
            <SearchBar
              placeholder={t('settings.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="md"
              className="w-80"
            />
          </div>

          {/* Horizontal Tabs Navigation */}
          <div className="relative">
            {/* Right fade indicator for scroll hint */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background-secondary to-transparent z-10 pointer-events-none" />
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <motion.button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex items-center gap-2 px-5 py-3 rounded-xl transition-all whitespace-nowrap"
                  style={{
                    background: isActive ? 'var(--app-surface)' : 'transparent',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isActive ? 'var(--app-primary)' : 'transparent',
                  }}
                >
                  <Icon className="text-lg" style={{ color: isActive ? 'var(--app-primary)' : 'var(--app-textSecondary)' }} />
                  <span className="font-medium text-sm" style={{ color: isActive ? 'var(--app-text)' : 'var(--app-textSecondary)' }}>
                    {category.name}
                  </span>
                </motion.button>
              );
            })}

            {/* Bug Report Button - Moved to tabs */}
            <motion.button
              onClick={() => setIsBugReportOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="ml-auto flex items-center gap-2 px-5 py-3 rounded-xl border border-transparent hover:border-error/30 hover:bg-error/10 transition-all"
            >
              <FiAlertTriangle className="text-lg" style={{ color: 'var(--app-error)' }} />
              <span className="font-medium text-sm text-text-secondary">
                {t('settings.reportBug')}
              </span>
            </motion.button>
          </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Full Width */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface scrollbar-track-transparent">
        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* General Settings */}
              {activeCategory === 'general' && (
                <div className="space-y-6">
                  {/* Account Card */}
                  <Card variant="glass" hover>
                    <Card.Header
                      icon={<FiUser className="text-2xl" style={{ color: 'var(--app-text)' }} />}
                      title={t('settings.account')}
                      subtitle={t('settings.manageProfile')}
                    />
                    <Card.Body>
                      <Input
                        label={t('settings.username')}
                        value={user.username}
                        icon={<FiUser />}
                        disabled
                      />
                    </Card.Body>
                  </Card>

                  {/* Language Card */}
                  <Card variant="glass" hover>
                    <Card.Header
                      icon={<FiGlobe className="text-2xl" style={{ color: 'var(--app-text)' }} />}
                      title={t('settings.language')}
                      subtitle={t('settings.languageDesc')}
                    />
                    <Card.Body>
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => i18n.changeLanguage('en')}
                          className="relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all flex-1"
                          style={{
                            background: i18n.language === 'en' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: i18n.language === 'en' ? 'var(--app-success)' : 'rgba(255, 255, 255, 0.1)',
                            boxShadow: i18n.language === 'en' ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                          }}
                        >
                          <div className="w-8 h-6 rounded overflow-hidden shadow-md">
                            <GB className="w-full h-full" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm" style={{ color: 'var(--app-text)' }}>English</div>
                          </div>
                          {i18n.language === 'en' && (
                            <FiCheck className="text-lg" style={{ color: 'var(--app-success)' }} />
                          )}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => i18n.changeLanguage('fr')}
                          className="relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all flex-1"
                          style={{
                            background: i18n.language === 'fr' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: i18n.language === 'fr' ? 'var(--app-success)' : 'rgba(255, 255, 255, 0.1)',
                            boxShadow: i18n.language === 'fr' ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                          }}
                        >
                          <div className="w-8 h-6 rounded overflow-hidden shadow-md">
                            <FR className="w-full h-full" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm" style={{ color: 'var(--app-text)' }}>Français</div>
                          </div>
                          {i18n.language === 'fr' && (
                            <FiCheck className="text-lg" style={{ color: 'var(--app-success)' }} />
                          )}
                        </motion.button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Appearance Settings */}
              {activeCategory === 'appearance' && (
                <div className="space-y-6">
                  {/* Color Theme Selector Card */}
                  <Card variant="glass" hover>
                    <Card.Header
                      icon={<FiMonitor className="text-2xl" style={{ color: 'var(--app-text)' }} />}
                      title={t('settings.colorTheme')}
                      subtitle={t('settings.colorThemeDesc')}
                    />
                    <Card.Body>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {themesList.map((themeOption) => {
                          const isActive = currentTheme === themeOption.id;
                          return (
                            <motion.button
                              key={themeOption.id}
                              whileHover={{ scale: 1.03, y: -2 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => changeAppTheme(themeOption.id)}
                              className={`relative p-3 rounded-xl border-2 transition-all overflow-hidden ${
                                isActive
                                  ? 'border-secondary shadow-lg shadow-secondary/30'
                                  : 'border-white/10 hover:border-secondary/50'
                              }`}
                              style={{
                                background: isActive
                                  ? `linear-gradient(135deg, ${themeOption.colors.primary}15 0%, ${themeOption.colors.secondary}15 100%)`
                                  : 'rgba(255, 255, 255, 0.03)'
                              }}
                            >
                              {/* Preview circles */}
                              <div className="flex gap-1.5 mb-2 justify-center">
                                <div
                                  className="w-5 h-5 rounded-full shadow-lg"
                                  style={{
                                    background: themeOption.gradients.primary,
                                    boxShadow: `0 0 8px ${themeOption.colors.primary}60`
                                  }}
                                />
                                <div
                                  className="w-5 h-5 rounded-full shadow-lg"
                                  style={{
                                    background: themeOption.gradients.secondary,
                                    boxShadow: `0 0 8px ${themeOption.colors.secondary}60`
                                  }}
                                />
                              </div>

                              {/* Theme info */}
                              <div className="text-center">
                                <div className="text-xl mb-1">{themeOption.preview}</div>
                                <div className="font-semibold text-xs" style={{ color: 'var(--app-text)' }}>{themeOption.name}</div>
                              </div>

                              {/* Active indicator */}
                              {isActive && (
                                <motion.div
                                  layoutId="activeThemeIndicator"
                                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                  style={{
                                    background: themeOption.gradients.primary,
                                    boxShadow: `0 0 8px ${themeOption.colors.primary}80`
                                  }}
                                >
                                  <FiCheck className="text-xs" style={{ color: '#FFFFFF' }} />
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              {/* Downloads Settings */}
              {activeCategory === 'downloads' && (
                <div className="space-y-6">
                  {/* Download Path Card */}
                  <Card variant="glass" hover>
                    <Card.Header
                      icon={<FiDownload className="text-2xl" style={{ color: 'var(--app-text)' }} />}
                      title={t('settings.downloads')}
                      subtitle={t('settings.installPath')}
                    />
                    <Card.Body>
                      <div className="flex gap-3">
                        <Input
                          value={downloadPath || t('settings.noPathSelected')}
                          icon={<FiFolder />}
                          disabled
                          className="flex-1"
                        />
                        <Button
                          variant="success"
                          onClick={selectDownloadPath}
                          icon={<FiFolder />}
                          iconPosition="left"
                        >
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
              )}

              {/* Advanced Settings */}
              {activeCategory === 'advanced' && (
                <div className="space-y-6">
                  {/* Discord RPC Card */}
                  <Card variant="glass" hover>
                    <div className="flex items-center justify-between mb-6 px-6 pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: 'rgba(20, 184, 166, 0.2)' }}>
                          <SiDiscord className="text-2xl" style={{ color: 'var(--app-accent)' }} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('settings.discordRPC')}</h3>
                          <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>{t('settings.discordDisplayActivity')}</p>
                        </div>
                      </div>

                      <Toggle
                        checked={discordEnabled}
                        onChange={handleDiscordToggle}
                        disabled={discordLoading}
                      />
                    </div>

                    {discordEnabled && (
                      <Card.Body>
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>
                            {t('settings.discordEnableDesc')}
                          </p>

                          {discordStatus.isConnected && (
                            <div className="p-4 rounded-xl" style={{
                              background: 'rgba(20, 184, 166, 0.1)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'rgba(20, 184, 166, 0.3)'
                            }}>
                              <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--app-success)' }} />
                                <span className="text-sm font-medium" style={{ color: 'var(--app-accent)' }}>
                                  {t('settings.discordConnected')}
                                  {discordStatus.user && ` · ${discordStatus.user.username}`}
                                </span>
                              </div>
                            </div>
                          )}

                          {!discordStatus.isConnected && (
                            <div className="p-4 rounded-xl" style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'rgba(245, 158, 11, 0.3)'
                            }}>
                              <div className="flex items-start gap-3">
                                <FiCircle className="mt-0.5" style={{ color: 'var(--app-warning)' }} />
                                <div>
                                  <p className="text-sm font-medium" style={{ color: 'var(--app-warning)' }}>{t('settings.discordNotDetected')}</p>
                                  <p className="text-xs mt-1" style={{ color: 'var(--app-textSecondary)' }}>
                                    {t('settings.discordLaunchDesktop')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </Card.Body>
                    )}
                  </Card>

                  {/* Image Cache Card */}
                  <Card variant="glass" hover>
                    <div className="flex items-center justify-between mb-6 px-6 pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                          <FiImage className="text-2xl" style={{ color: 'var(--app-warning)' }} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('settings.imageCache')}</h3>
                          <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>{t('settings.imageCacheManagement')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
                        background: 'rgba(245, 158, 11, 0.2)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(245, 158, 11, 0.3)'
                      }}>
                        <FiImage style={{ color: 'var(--app-warning)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--app-warning)' }}>
                          {t('settings.cachedImages', { count: cacheSize, plural: cacheSize > 1 ? 's' : '' })}
                        </span>
                      </div>
                    </div>

                    <Card.Body>
                      <p className="text-sm mb-4" style={{ color: 'var(--app-textSecondary)' }}>
                        {t('settings.imageCacheDesc')}
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant="ghost"
                          onClick={handleCleanExpiredImages}
                          disabled={cacheLoading}
                          icon={<FiActivity />}
                          iconPosition="left"
                        >
                          {t('settings.cleanExpiredImages')}
                        </Button>

                        <Button
                          variant="danger"
                          onClick={handleClearImageCache}
                          disabled={cacheLoading}
                          icon={<FiTrash2 />}
                          iconPosition="left"
                        >
                          {t('settings.clearEntireCache')}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Updates Card */}
                  <Card variant="glass" hover>
                    <div className="flex items-center justify-between mb-6 px-6 pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                          <FiRefreshCw className="text-2xl" style={{ color: 'var(--app-primary)' }} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold" style={{ color: 'var(--app-text)' }}>{t('settings.updates')}</h3>
                          <p className="text-sm" style={{ color: 'var(--app-textSecondary)' }}>{t('settings.keepUpToDate')}</p>
                        </div>
                      </div>

                      {currentVersion && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
                          background: 'rgba(99, 102, 241, 0.2)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'rgba(99, 102, 241, 0.3)'
                        }}>
                          <FiCircle className="text-xs" style={{ color: 'var(--app-primary)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--app-primary)' }}>
                            v{currentVersion}
                          </span>
                        </div>
                      )}
                    </div>

                    <Card.Body>
                      <p className="text-sm mb-4" style={{ color: 'var(--app-textSecondary)' }}>
                        {t('settings.updatesAutoCheck')}
                      </p>

                      <Button
                        variant="ghost"
                        onClick={handleCheckForUpdates}
                        disabled={updateChecking || updateStatus === 'checking'}
                        icon={<FiRefreshCw className={updateChecking || updateStatus === 'checking' ? 'animate-spin' : ''} />}
                        iconPosition="left"
                        className="w-full"
                      >
                        {updateChecking || updateStatus === 'checking' ? t('settings.checkingUpdates') : t('settings.checkForUpdates')}
                      </Button>

                      {/* Update Status */}
                      <AnimatePresence>
                        {updateStatus === 'available' && updateInfo && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="mt-4 p-4 rounded-xl"
                            style={{
                              background: 'rgba(99, 102, 241, 0.1)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: 'rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <FiRefreshCw className="mt-0.5" style={{ color: 'var(--app-primary)' }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--app-primary)' }}>{t('settings.updateAvailable')}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--app-textSecondary)' }}>
                                  {t('settings.updateVersionReady', { version: updateInfo.version })}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card.Body>
                  </Card>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex justify-end"
          >
            <Button
              variant="primary"
              size="lg"
              gradient
              onClick={handleSaveSettings}
              icon={<FiCheck />}
              iconPosition="left"
            >
              {t('settings.saveSettings')}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Bug Report Modal */}
      <BugReportModal
        isOpen={isBugReportOpen}
        onClose={() => setIsBugReportOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
