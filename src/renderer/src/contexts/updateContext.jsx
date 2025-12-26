import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const UpdateContext = createContext();

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within UpdateProvider');
  }
  return context;
};

export const UpdateProvider = ({ children }) => {
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Écouter les événements de l'auto-updater
  useEffect(() => {
    if (!window.api?.updater) return;

    // Checking
    if (window.api.updater.onChecking) {
      window.api.updater.onChecking(() => {
        setUpdateStatus('checking');
        setError(null);
      });
    }

    // Update available
    if (window.api.updater.onUpdateAvailable) {
      window.api.updater.onUpdateAvailable((data) => {
        setUpdateStatus('available');
        setUpdateInfo(data);
        setShowUpdateModal(true);
        toast.info('Mise à jour disponible', {
          description: `Version ${data.version} disponible`,
          duration: 5000,
        });
      });
    }

    // No update
    if (window.api.updater.onUpdateNotAvailable) {
      window.api.updater.onUpdateNotAvailable(() => {
        setUpdateStatus('idle');
        setUpdateInfo(null);
      });
    }

    // Download progress
    if (window.api.updater.onDownloadProgress) {
      window.api.updater.onDownloadProgress((data) => {
        setUpdateStatus('downloading');
        setDownloadProgress(data);
      });
    }

    // Downloaded
    if (window.api.updater.onUpdateDownloaded) {
      window.api.updater.onUpdateDownloaded((data) => {
        setUpdateStatus('downloaded');
        setShowUpdateModal(true);
        toast.success('Mise à jour téléchargée', {
          description: 'Redémarrez pour installer',
          duration: 10000,
        });
      });
    }

    // Error
    if (window.api.updater.onError) {
      window.api.updater.onError((data) => {
        setUpdateStatus('error');
        setError(data.message);
        toast.error('Erreur de mise à jour', {
          description: data.message || 'Une erreur est survenue',
          duration: 5000,
        });
      });
    }
  }, []);

  // Vérifier les mises à jour manuellement
  const checkForUpdates = useCallback(async () => {
    try {
      setError(null);
      const result = await window.api.updater.checkForUpdates();

      if (!result.success) {
        throw new Error(result.error || 'Failed to check for updates');
      }

      if (!result.available) {
        toast.info('Aucune mise à jour', {
          description: `Vous utilisez déjà la dernière version (${result.currentVersion})`,
          duration: 4000,
        });
      }

      return result;
    } catch (err) {
      console.error('[UpdateContext] Check error:', err);
      setError(err.message);
      toast.error('Erreur', {
        description: 'Impossible de vérifier les mises à jour',
        duration: 4000,
      });
      throw err;
    }
  }, []);

  // Télécharger et installer la mise à jour
  const downloadAndInstall = useCallback(async () => {
    try {
      setError(null);
      const result = await window.api.updater.downloadAndInstall();

      if (!result.success) {
        throw new Error(result.error || 'Failed to download update');
      }

      return result;
    } catch (err) {
      console.error('[UpdateContext] Download error:', err);
      setError(err.message);
      toast.error('Erreur', {
        description: 'Impossible de télécharger la mise à jour',
        duration: 4000,
      });
      throw err;
    }
  }, []);

  // Quitter et installer
  const quitAndInstall = useCallback(async () => {
    try {
      await window.api.updater.quitAndInstall();
    } catch (err) {
      console.error('[UpdateContext] Install error:', err);
      toast.error('Erreur', {
        description: "Impossible d'installer la mise à jour",
        duration: 4000,
      });
    }
  }, []);

  // Ignorer une version
  const skipVersion = useCallback(async (version) => {
    try {
      await window.api.updater.skipVersion({ version });
      setShowUpdateModal(false);
      setUpdateStatus('idle');
      setUpdateInfo(null);

      toast.info('Version ignorée', {
        description: `La version ${version} a été ignorée`,
        duration: 3000,
      });
    } catch (err) {
      console.error('[UpdateContext] Skip error:', err);
    }
  }, []);

  // Obtenir le statut
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
      console.error('[UpdateContext] Status error:', err);
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
