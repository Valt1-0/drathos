import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  useDownloadStats,
  useActiveDownloads,
  useDownloadsByStage,
  useDownloadCount,
  useDownloadActions,
  useDownloadQueue,
} from "../contexts/downloadContext";
import EnhancedDownloadProgress from "../components/EnhancedDownloadProgress";
import GameCover from "../components/GameCover";
import {
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiActivity,
  FiHardDrive,
  FiZap,
  FiSettings,
  FiLoader,
  FiList,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
import { toast } from "sonner";

const LOW_DISK_THRESHOLD_GB = 5;

const Download = () => {
  const { t } = useTranslation();

  // Use optimized hooks instead of useDownload()
  const downloadStats = useDownloadStats();
  const activeDownloads = useActiveDownloads();
  const completedDownloads = useDownloadsByStage("completed");
  const failedDownloads = useDownloadsByStage("failed");
  const totalDownloads = useDownloadCount();
  const { removeDownload, updateDownloadProgress } = useDownloadActions();
  const { queue, removeFromQueue, enqueueGame } = useDownloadQueue();

  const [diskSpace, setDiskSpace] = useState({
    freeSpace: 0,
    totalSpace: 0,
    usedPercent: 0,
  });
  const [diskSpaceLoading, setDiskSpaceLoading] = useState(true);
  const [diskSpaceError, setDiskSpaceError] = useState(false);

  // Load disk space on mount
  useEffect(() => {
    const loadDiskSpace = async () => {
      try {
        setDiskSpaceLoading(true);
        const result = await window.api.getDiskSpace();
        if (result.success) {
          setDiskSpace({
            freeSpace: result.freeGB,
            totalSpace: result.totalGB,
            usedPercent: result.usedPercent,
          });
          setDiskSpaceError(false);
        } else {
          setDiskSpaceError(true);
          toast.error(t('errors.diskSpace'));
        }
      } catch (error) {
        console.error("Error loading disk space:", error);
        setDiskSpaceError(true);
        toast.error(t('errors.diskSpace'));
      } finally {
        setDiskSpaceLoading(false);
      }
    };

    loadDiskSpace();
    // Refresh disk space every 30 seconds
    const interval = setInterval(loadDiskSpace, 30000);
    return () => clearInterval(interval);
  }, [t]);

  // Cancel an active download
  const handleCancelDownload = async (download) => {
    try {
      await window.api.cancelDownload(download.gameId || download.id);
      removeDownload(download.id);
      toast.info(t("downloads.cancelled", { name: download.name }));
    } catch (error) {
      console.error("Cancel error:", error);
    }
  };

  // Pause or resume an active download
  const handlePauseDownload = async (download) => {
    try {
      if (download.stage === "paused") {
        await window.api.resumeDownload(download.gameId || download.id);
      } else {
        await window.api.pauseDownload(download.gameId || download.id);
      }
    } catch (error) {
      console.error("Pause/resume error:", error);
    }
  };

  // Retry a failed download — goes through the queue like any other install
  const handleRetryDownload = (download) => {
    removeDownload(download.id);
    toast.info(t('downloads.retrying', { name: download.name }));
    enqueueGame({
      _id: download.gameId || download.id,
      name: download.name,
      coverUrl: download.image,
      sizeMB: download.totalSize,
    });
  };

  return (
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent">
      {/* Header with stats */}
      <div className="px-8 py-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: 'var(--app-gradient-primary)' }}>
                <FiDownload className="text-white text-xl" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-text">
                {t('downloads.title')}
              </h1>
            </div>
            <p className="text-text-secondary text-sm ml-15">
              {t('downloads.subtitle')}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Total Speed */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="group relative overflow-hidden backdrop-blur-xl border rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300"
              style={{
                background: 'rgba(var(--app-success-rgb, 16, 185, 129), 0.1)',
                borderColor: 'var(--app-success)',
                borderOpacity: 0.3
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(var(--app-success-rgb, 16, 185, 129), 0.15), transparent)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-text-secondary font-medium">
                    {t('downloads.totalSpeed')}
                  </span>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(var(--app-success-rgb, 16, 185, 129), 0.2)' }}>
                    <FiZap className="text-success text-xl" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-text">
                    {downloadStats.totalSpeed.toFixed(1)}
                  </span>
                  <span className="text-sm text-text-secondary">MB/s</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden mt-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--app-gradient-primary)' }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (downloadStats.totalSpeed / 100) * 100)}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Free Space */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="group relative overflow-hidden backdrop-blur-xl border rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300"
              style={{
                background: 'rgba(var(--app-warning-rgb, 251, 191, 36), 0.1)',
                borderColor: 'var(--app-warning)',
                borderOpacity: 0.3
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(135deg, rgba(var(--app-warning-rgb, 251, 191, 36), 0.15), transparent)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-text-secondary font-medium">
                    {t('downloads.freeSpace')}
                  </span>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(var(--app-warning-rgb, 251, 191, 36), 0.2)' }}>
                    <FiHardDrive className="text-warning text-xl" />
                  </div>
                </div>

                {diskSpaceLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <FiLoader className="text-2xl text-warning animate-spin" />
                    <span className="ml-3 text-text-secondary text-sm">{t('downloads.loadingDiskSpace')}</span>
                  </div>
                ) : diskSpaceError ? (
                  <div className="flex items-center gap-2 py-2">
                    <FiAlertTriangle className="text-error shrink-0" />
                    <span className="text-sm text-text-secondary">{t('downloads.diskSpaceUnavailable')}</span>
                  </div>
                ) : diskSpace.freeSpace > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-text">
                        {diskSpace.freeSpace}
                      </span>
                      <span className="text-sm text-text-secondary">{t('downloads.gbFree')}</span>
                    </div>
                    {diskSpace.totalSpace > 0 && (
                      <div className="text-sm text-text-secondary mb-2 opacity-70">
                        {t('downloads.ofTotal', { total: diskSpace.totalSpace })}
                      </div>
                    )}
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: diskSpace.usedPercent > 90
                            ? 'var(--app-gradient-button)'
                            : diskSpace.usedPercent > 75
                            ? 'linear-gradient(to right, var(--app-warning), var(--app-warning))'
                            : 'var(--app-gradient-primary)'
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${diskSpace.usedPercent || 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    {diskSpace.usedPercent > 0 && (
                      <div className="text-sm text-text-secondary mt-2 text-right">
                        {t('downloads.percentUsed', { percent: diskSpace.usedPercent })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {t('downloads.noLocationSelected')}
                    </p>
                    <Link to="/settings">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium transition-all duration-300"
                        style={{
                          background: 'var(--app-gradient-button)',
                          boxShadow: 'var(--app-shadow-primary)'
                        }}
                      >
                        <FiSettings className="text-lg" />
                        <span>{t('downloads.configure')}</span>
                      </motion.button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Low disk space warning */}
        {!diskSpaceLoading && !diskSpaceError && diskSpace.freeSpace > 0 && diskSpace.freeSpace < LOW_DISK_THRESHOLD_GB && activeDownloads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl border mb-6"
            style={{ background: 'rgba(var(--app-error-rgb, 239, 68, 68), 0.1)', borderColor: 'var(--app-error)' }}
          >
            <FiAlertTriangle className="text-error text-xl shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--app-error)' }}>{t('downloads.lowDiskWarning')}</p>
              <p className="text-xs text-text-secondary">{t('downloads.lowDiskWarningDesc', { free: diskSpace.freeSpace })}</p>
            </div>
          </motion.div>
        )}

        {/* Download queue */}
        <AnimatePresence mode="wait">
          {queue.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <FiList className="text-accent text-2xl" />
                <h2 className="text-2xl font-bold text-text">
                  {t('downloads.queue')}
                  <span className="ml-2 text-base font-normal text-text-secondary">
                    {t('downloads.queueCount', { count: queue.length })}
                  </span>
                </h2>
              </div>

              <div className="space-y-3">
                {queue.map((game, index) => (
                  <motion.div
                    key={game._id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 backdrop-blur-xl border rounded-2xl p-4"
                    style={{
                      background: 'var(--app-backgroundSecondary)',
                      borderColor: 'var(--app-border)',
                    }}
                  >
                    <div className="relative w-14 h-14 bg-surface rounded-xl overflow-hidden flex-shrink-0">
                      <GameCover
                        src={game.coverUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        size="thumb"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">#{index + 1}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-semibold truncate">{game.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <FiList className="text-accent text-xs" />
                        <span className="text-accent text-sm">{t('downloads.stageQueued')}</span>
                        {game.sizeMB && (
                          <>
                            <span className="text-text-secondary opacity-40">•</span>
                            <span className="text-text-secondary text-xs">{game.sizeMB} MB</span>
                          </>
                        )}
                      </div>
                    </div>

                    <motion.button
                      onClick={() => removeFromQueue(game._id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg transition-colors hover:bg-error/20"
                      aria-label={t('downloads.removeFromQueue')}
                      title={t('downloads.removeFromQueue')}
                    >
                      <FiX className="text-text-secondary hover:text-error text-lg" />
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active downloads */}
        <AnimatePresence mode="wait">
          {activeDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></span>
                <h2 className="text-2xl font-bold text-text">
                  {t('downloads.activeDownloads', { count: activeDownloads.length })}
                </h2>
              </div>

              <div className="space-y-4">
                {activeDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <EnhancedDownloadProgress
                      download={download}
                      onCancel={handleCancelDownload}
                      onPause={handlePauseDownload}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed downloads */}
        <AnimatePresence mode="wait">
          {completedDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <FiCheckCircle className="text-success text-2xl" />
                <h2 className="text-2xl font-bold text-text">
                  {t('downloads.completed', { count: completedDownloads.length })}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative overflow-hidden backdrop-blur-xl border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'var(--app-backgroundSecondary)',
                      borderColor: 'var(--app-border)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--app-success)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--app-border)';
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 bg-surface rounded-xl overflow-hidden flex-shrink-0">
                        <GameCover
                          src={download.image}
                          alt="Cover"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          size="thumb"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FiCheckCircle className="text-success text-2xl" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-text font-semibold truncate">
                          {download.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-success text-sm font-medium flex items-center gap-1">
                            <FiCheckCircle className="text-xs" />
                            {t('downloads.installed')}
                          </span>
                          {download.totalTime && (
                            <>
                              <span className="text-text-secondary opacity-50">•</span>
                              <span className="text-text-secondary text-xs">
                                {Math.floor(download.totalTime / 1000)}s
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed downloads */}
        <AnimatePresence mode="wait">
          {failedDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <FiXCircle className="text-error text-2xl" />
                <h2 className="text-2xl font-bold text-text">
                  {t('downloads.failed', { count: failedDownloads.length })}
                </h2>
              </div>

              <div className="space-y-4">
                {failedDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="backdrop-blur-xl border rounded-2xl p-4"
                    style={{
                      background: 'rgba(var(--app-error-rgb, 239, 68, 68), 0.1)',
                      borderColor: 'var(--app-error)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-surface rounded-xl overflow-hidden">
                          <GameCover
                            src={download.image}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            size="thumb"
                          />
                        </div>

                        <div>
                          <h3 className="text-text font-semibold">
                            {download.name}
                          </h3>
                          <p className="text-error text-sm flex items-center gap-1 mt-1">
                            <FiXCircle className="text-xs" />
                            {download.error || t('downloads.unknownError')}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        onClick={() => handleRetryDownload(download)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                        style={{
                          background: 'var(--app-gradient-button)',
                          boxShadow: 'var(--app-shadow-primary)'
                        }}
                      >
                        <FiDownload className="text-sm" />
                        {t('downloads.retry')}
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {totalDownloads === 0 && queue.length === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-16"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full blur-xl" style={{ background: 'linear-gradient(135deg, var(--app-primary), var(--app-secondary))', opacity: 0.2 }}></div>
              <div className="relative flex items-center justify-center w-full h-full rounded-full border" style={{ background: 'var(--app-backgroundSecondary)', borderColor: 'var(--app-border)' }}>
                <FiDownload className="text-4xl text-text-secondary opacity-50" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-text mb-2">
              {t('downloads.noDownloadsYet')}
            </h3>
            <p className="text-text-secondary text-sm">
              {t('downloads.noDownloadsDesc')}
            </p>
          </motion.div>
        )}

        {/* Footer info */}
        {(totalDownloads > 0 || queue.length > 0) && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 pt-6 border-t"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-text-secondary">
              <p>
                {t('downloads.backgroundInfo')}
              </p>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <FiZap className="text-primary" /> {t('downloads.optimizedEngine')}
                </span>
                <span className="opacity-50">•</span>
                <span className="flex items-center gap-2">
                  <FiActivity className="text-success" /> {t('downloads.realtimeMetrics')}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Download;
