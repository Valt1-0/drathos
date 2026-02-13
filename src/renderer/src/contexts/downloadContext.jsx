import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [downloads, setDownloads] = useState([]);

  // Mémoiser les fonctions pour éviter les re-renders inutiles
  const addDownload = useCallback((download) => {
    setDownloads((prev) => [...prev, download]);
  }, []);

  const updateDownloadProgress = useCallback((id, progressData) => {
    setDownloads((prev) =>
      prev.map((dl) =>
        dl.id === id
          ? {
              ...dl,
              ...progressData,
              speed: progressData.speed ?? dl.speed,
              sizeDownloaded: progressData.sizeDownloaded ?? dl.sizeDownloaded,
              totalSize: progressData.totalSize ?? dl.totalSize,
              progress: progressData.progress ?? dl.progress,
              stage: progressData.stage ?? dl.stage,
            }
          : dl
      )
    );
  }, []);

  const removeDownload = useCallback((id) => {
    setDownloads((prev) => prev.filter((dl) => dl.id !== id));
  }, []);

  // Mémoiser la valeur du contexte
  const contextValue = useMemo(
    () => ({
      downloads,
      addDownload,
      updateDownloadProgress,
      removeDownload,
    }),
    [downloads, addDownload, updateDownloadProgress, removeDownload]
  );

  return (
    <DownloadContext.Provider value={contextValue}>
      {children}
    </DownloadContext.Provider>
  );
};

// Hook de base - utiliser avec précaution car il re-rend à chaque changement
export const useDownload = () => useContext(DownloadContext);

// ========== HOOKS OPTIMISÉS AVEC SELECTORS ==========

/**
 * Hook pour obtenir un téléchargement spécifique par ID
 * Ne re-rend que lorsque CE téléchargement change
 */
export const useDownloadById = (id) => {
  const { downloads } = useContext(DownloadContext);

  return useMemo(() => {
    return downloads.find((dl) => dl.id === id) || null;
  }, [downloads, id]);
};

/**
 * Hook pour obtenir tous les téléchargements d'un stage spécifique
 * Ne re-rend que lorsque la liste de CE stage change
 */
export const useDownloadsByStage = (stage) => {
  const { downloads } = useContext(DownloadContext);

  return useMemo(() => {
    return downloads.filter((dl) => dl.stage === stage);
  }, [downloads, stage]);
};

/**
 * Hook pour obtenir les téléchargements actifs (downloading, extracting, etc.)
 * Ne re-rend que lorsque la liste des actifs change
 */
export const useActiveDownloads = () => {
  const { downloads } = useContext(DownloadContext);

  return useMemo(() => {
    return downloads.filter((dl) =>
      ["preparing", "downloading", "extracting", "finalizing", "paused"].includes(dl.stage)
    );
  }, [downloads]);
};

/**
 * Hook pour obtenir les statistiques de téléchargement
 * Ne re-rend que lorsque les stats changent
 */
export const useDownloadStats = () => {
  const { downloads } = useContext(DownloadContext);

  return useMemo(() => {
    const activeDownloads = downloads.filter((d) =>
      ["downloading", "extracting", "preparing"].includes(d.stage)
    );

    const totalSpeed = activeDownloads.reduce((sum, d) => sum + (d.speed || 0), 0);
    const completedCount = downloads.filter((d) => d.stage === "completed").length;
    const failedCount = downloads.filter((d) => d.stage === "failed").length;

    return {
      totalSpeed,
      activeDownloads: activeDownloads.length,
      completedCount,
      failedCount,
      totalCount: downloads.length,
    };
  }, [downloads]);
};

/**
 * Hook pour obtenir uniquement les actions (sans les données)
 * Ne re-rend jamais car les fonctions sont mémorisées
 */
export const useDownloadActions = () => {
  const context = useContext(DownloadContext);

  return useMemo(
    () => ({
      addDownload: context.addDownload,
      updateDownloadProgress: context.updateDownloadProgress,
      removeDownload: context.removeDownload,
    }),
    [context.addDownload, context.updateDownloadProgress, context.removeDownload]
  );
};

/**
 * Hook pour obtenir le nombre total de téléchargements
 * Ne re-rend que lorsque le nombre change
 */
export const useDownloadCount = () => {
  const { downloads } = useContext(DownloadContext);
  return downloads.length;
};
