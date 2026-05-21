import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import logger from "../services/logger";
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
  FiClock,
  FiSettings,
  FiLoader,
  FiList,
  FiX,
  FiAlertTriangle,
} from "react-icons/fi";
import { toast } from "sonner";

const LOW_DISK_THRESHOLD_GB = 5;

const formatETA = (seconds) => {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

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
  const [diskSpaceNotConfigured, setDiskSpaceNotConfigured] = useState(false);

  const loadDiskSpace = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setDiskSpaceLoading(true);
      const result = await window.api.getDiskSpace();
      if (result.success) {
        setDiskSpace({ freeSpace: result.freeGB, totalSpace: result.totalGB, usedPercent: result.usedPercent });
        setDiskSpaceError(false);
        setDiskSpaceNotConfigured(false);
      } else if (result.notConfigured) {
        setDiskSpaceNotConfigured(true);
        setDiskSpaceError(false);
      } else {
        setDiskSpaceError(true);
      }
    } catch (error) {
      logger.error("Error loading disk space", error);
      setDiskSpaceError(true);
    } finally {
      setDiskSpaceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiskSpace(true);
    const interval = setInterval(() => loadDiskSpace(false), 30000);
    return () => clearInterval(interval);
  }, [loadDiskSpace]);

  // Cancel an active download
  const handleCancelDownload = async (download) => {
    try {
      await window.api.cancelDownload(download.gameId || download.id);
      removeDownload(download.id);
      toast.info(t("downloads.cancelled", { name: download.name }));
    } catch (error) {
      logger.error("Cancel error", error);
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
      logger.error("Pause/resume error", error);
    }
  };

  const totalEtaSeconds = useMemo(() => {
    if (downloadStats.totalSpeed <= 0) return null;
    const remaining = activeDownloads
      .filter(dl => ['downloading', 'extracting'].includes(dl.stage))
      .reduce((sum, dl) => sum + Math.max(0, (dl.totalSize || 0) - (dl.sizeDownloaded || 0)), 0);
    return remaining > 0 ? remaining / downloadStats.totalSpeed : null;
  }, [activeDownloads, downloadStats.totalSpeed]);

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
    <div className="h-full bg-background text-text overflow-y-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent flex flex-col">
      {/* Header with stats */}
      <div className="px-8 py-8 max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-8">
            {/* Title */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: 'var(--app-gradient-primary)' }}>
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

            {/* Stats pills */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Speed */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{
                  background: 'rgba(var(--app-success-rgb, 16, 185, 129), 0.08)',
                  borderColor: 'rgba(var(--app-success-rgb, 16, 185, 129), 0.3)',
                }}
              >
                <FiZap className="text-success text-xs shrink-0" />
                <span className="text-sm font-semibold text-text">{downloadStats.totalSpeed.toFixed(1)}</span>
                <span className="text-xs text-text-secondary">MB/s</span>
              </div>

              {/* ETA */}
              {formatETA(totalEtaSeconds) && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{
                    background: 'rgba(var(--app-secondary-rgb, 139, 92, 246), 0.08)',
                    borderColor: 'rgba(var(--app-secondary-rgb, 139, 92, 246), 0.3)',
                  }}
                >
                  <FiClock className="text-secondary text-xs shrink-0" />
                  <span className="text-sm font-semibold text-text">{formatETA(totalEtaSeconds)}</span>
                </div>
              )}

              {/* Disk */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{
                  background: 'rgba(var(--app-warning-rgb, 251, 191, 36), 0.08)',
                  borderColor: 'rgba(var(--app-warning-rgb, 251, 191, 36), 0.3)',
                }}
              >
                <FiHardDrive className="text-warning text-xs shrink-0" />
                {diskSpaceLoading ? (
                  <FiLoader className="text-warning text-xs animate-spin" />
                ) : diskSpaceError ? (
                  <button onClick={loadDiskSpace} className="text-xs text-error hover:underline flex items-center gap-1">
                    <FiAlertTriangle className="text-xs" />{t('common.retry')}
                  </button>
                ) : diskSpaceNotConfigured || !diskSpace.freeSpace ? (
                  <Link to="/settings" className="text-xs text-primary hover:underline">{t('downloads.configure')}</Link>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-text">{diskSpace.freeSpace}</span>
                    <span className="text-xs text-text-secondary">GB</span>
                    {diskSpace.totalSpace > 0 && (
                      <>
                        <span className="text-xs text-text-secondary opacity-40">/</span>
                        <span className="text-xs text-text-secondary opacity-60">{diskSpace.totalSpace} GB</span>
                        <div className="w-12 h-1 bg-surface rounded-full overflow-hidden">
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
                            animate={{ width: `${diskSpace.usedPercent}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
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
                    <div className="relative w-14 h-14 bg-surface rounded-xl overflow-hidden shrink-0">
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
                      <div className="relative w-16 h-16 bg-surface rounded-xl overflow-hidden shrink-0">
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
            className="flex-1 flex flex-col items-center justify-center text-center"
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
