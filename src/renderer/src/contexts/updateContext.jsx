import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import logger from '../services/logger';

const UpdateContext = createContext();

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider');
  }
  return context;
};

export const UpdateProvider = ({ children }) => {
  const { t } = useTranslation();
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Listen to auto-updater events
  useEffect(() => {
    if (!window.api?.updater) return;

    const unsubs = [];

    if (window.api.updater.onChecking) {
      unsubs.push(window.api.updater.onChecking(() => {
        setUpdateStatus('checking');
        setError(null);
      }));
    }

    if (window.api.updater.onUpdateAvailable) {
      unsubs.push(window.api.updater.onUpdateAvailable((data) => {
        setUpdateStatus('available');
        setUpdateInfo(data);
        setShowUpdateModal(true);
        toast.info(t('update.available'), {
          description: t('update.version', { version: data.version }),
          duration: 5000,
          id: "update-available",
        });
      }));
    }

    if (window.api.updater.onUpdateNotAvailable) {
      unsubs.push(window.api.updater.onUpdateNotAvailable(() => {
        setUpdateStatus('idle');
        setUpdateInfo(null);
      }));
    }

    if (window.api.updater.onDownloadProgress) {
      unsubs.push(window.api.updater.onDownloadProgress((data) => {
        setUpdateStatus('downloading');
        setDownloadProgress(data);
      }));
    }

    if (window.api.updater.onUpdateDownloaded) {
      unsubs.push(window.api.updater.onUpdateDownloaded(() => {
        setUpdateStatus('downloaded');
        setShowUpdateModal(true);
        toast.success(t('update.ready'), {
          description: t('settings.updateRestartToInstall'),
          duration: 10000,
          id: "update-ready",
        });
      }));
    }

    if (window.api.updater.onError) {
      unsubs.push(window.api.updater.onError((data) => {
        setUpdateStatus('error');
        setError(data.message);
        toast.error(t('update.error'), {
          description: data.message || t('common.error'),
          duration: 5000,
          id: "update-error",
        });
      }));
    }

    return () => unsubs.forEach((fn) => fn?.());
  }, []);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    try {
      setError(null);
      const result = await window.api.updater.checkForUpdates();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check for updates');
      }

      if (!result.available) {
        toast.info(t('settings.currentVersion'), {
          description: result.currentVersion,
          duration: 4000,
          id: "update-check-current",
        });
      }

      return result;
    } catch (err) {
      logger.error('[UpdateContext] Check error:', err);
      setError(err.message);
      toast.error(t('common.error'), {
        description: t('update.error'),
        duration: 4000,
        id: "update-check-error",
      });
      throw err;
    }
  }, []);

  // Download and install the update
  const downloadAndInstall = useCallback(async () => {
    try {
      setError(null);
      const result = await window.api.updater.downloadAndInstall();

      if (!result.success) {
        throw new Error(result.error || 'Failed to download update');
      }

      return result;
    } catch (err) {
      logger.error('[UpdateContext] Download error:', err);
      setError(err.message);
      toast.error(t('common.error'), {
        description: t('update.error'),
        duration: 4000,
      });
      throw err;
    }
  }, []);

  // Quit and install
  const quitAndInstall = useCallback(async () => {
    try {
      await window.api.updater.quitAndInstall();
    } catch (err) {
      logger.error('[UpdateContext] Install error:', err);
      toast.error(t('common.error'), {
        description: t('update.error'),
        duration: 4000,
      });
    }
  }, []);

  // Skip a version
  const skipVersion = useCallback(async (version) => {
    try {
      await window.api.updater.skipVersion({ version });
      setShowUpdateModal(false);
      setUpdateStatus('idle');
      setUpdateInfo(null);

      toast.info(t('update.versionIgnored'), {
        description: t('update.versionIgnoredDesc', { version }),
        duration: 3000,
        id: "update-ignored",
      });
    } catch (err) {
      logger.error('[UpdateContext] Skip error:', err);
    }
  }, []);

  // Get the status
  const getStatus = useCallback(async () => {
    try {
      const result = await window.api.updater.getStatus();
      if (result.success) {
        setUpdateStatus(result.status);
        setUpdateInfo(result.updateInfo);
        setDownloadProgress(result.downloadProgress);
      }
      return result;
    } catch (err) {
      logger.error('[UpdateContext] Status error:', err);
    }
  }, []);

  const value = {
    updateStatus,
    updateInfo,
    downloadProgress,
    error,
    showUpdateModal,
    setShowUpdateModal,
    checkForUpdates,
    downloadAndInstall,
    quitAndInstall,
    skipVersion,
    getStatus,
  };

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
};
