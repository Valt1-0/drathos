import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from "react";
import { getInstalledGames } from "../api/installedGames";
import { gamesCache } from "../utils/gamesCache";

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [downloads, setDownloads] = useState([]);
  const [queue, setQueue] = useState([]); // jeux en attente de téléchargement

  const isProcessingRef = useRef(false);
  const queueRef = useRef([]); // miroir de queue pour les callbacks async (évite les stale closures)
  const downloadCallbacksRef = useRef(new Map()); // gameId -> callback de progression
  const startDownloadRef = useRef(null); // auto-référence via ref pour éviter la récursion circulaire

  // Listener IPC unique pour tous les téléchargements — monté une seule fois
  useEffect(() => {
    window.api.onDownloadProgress((data) => {
      const cb = downloadCallbacksRef.current.get(data.id);
      if (cb) cb(data);
    });
  }, []);

  // Mis à jour à chaque render pour que les callbacks aient toujours la dernière version
  startDownloadRef.current = (game) => {
    isProcessingRef.current = true;
    const downloadId = `${game._id}-${Date.now()}`;

    setDownloads((prev) => [
      ...prev,
      {
        id: downloadId,
        gameId: game._id,
        name: game.name,
        image: game.coverUrl,
        progress: 0,
        speed: 0,
        sizeDownloaded: 0,
        totalSize: game.sizeMB,
        stage: "preparing",
      },
    ]);

    downloadCallbacksRef.current.set(game._id, (data) => {
      setDownloads((prev) =>
        prev.map((dl) =>
          dl.id === downloadId
            ? {
                ...dl,
                speed: Number.isFinite(data.speed) ? data.speed : dl.speed,
                sizeDownloaded: Number.isFinite(data.sizeDownloaded) ? data.sizeDownloaded : dl.sizeDownloaded,
                totalSize: Number.isFinite(data.totalSize) && data.totalSize > 0 ? data.totalSize : dl.totalSize,
                progress: Number.isFinite(data.progress) ? data.progress : dl.progress,
                stage: data.stage ?? dl.stage,
              }
            : dl
        )
      );

      if (data.stage === "completed" || data.stage === "failed") {
        downloadCallbacksRef.current.delete(game._id);
        gamesCache.invalidate();

        setTimeout(async () => {
          setDownloads((prev) => prev.filter((dl) => dl.id !== downloadId));

          try {
            const installed = await getInstalledGames();
            gamesCache.set({ installedGames: installed });
          } catch (err) {
            console.warn("[DownloadQueue] Could not refresh installed games:", err);
          }

          // Démarrer le suivant dans la queue
          isProcessingRef.current = false;
          if (queueRef.current.length > 0) {
            const next = queueRef.current.shift();
            setQueue([...queueRef.current]);
            startDownloadRef.current(next);
          }
        }, 1000);
      }
    });

    window.api.installGame(game).catch((error) => {
      console.error("[DownloadQueue] Installation error:", error);
      downloadCallbacksRef.current.delete(game._id);
      setDownloads((prev) => prev.filter((dl) => dl.id !== downloadId));

      isProcessingRef.current = false;
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift();
        setQueue([...queueRef.current]);
        startDownloadRef.current(next);
      }
    });
  };

  /**
   * Ajoute un jeu à la queue de téléchargement.
   * Démarre immédiatement si rien en cours, sinon met en attente.
   * Retourne 'started' ou 'queued'.
   */
  const enqueueGame = useCallback((game) => {
    if (!isProcessingRef.current) {
      startDownloadRef.current(game);
      return "started";
    }
    queueRef.current = [...queueRef.current, game];
    setQueue([...queueRef.current]);
    return "queued";
  }, []);

  const removeFromQueue = useCallback((gameId) => {
    queueRef.current = queueRef.current.filter((g) => g._id !== gameId);
    setQueue([...queueRef.current]);
  }, []);

  // Gardées pour la compatibilité avec les hooks existants
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
              speed: Number.isFinite(progressData.speed) ? progressData.speed : dl.speed,
              sizeDownloaded: Number.isFinite(progressData.sizeDownloaded) ? progressData.sizeDownloaded : dl.sizeDownloaded,
              totalSize: Number.isFinite(progressData.totalSize) && progressData.totalSize > 0 ? progressData.totalSize : dl.totalSize,
              progress: Number.isFinite(progressData.progress) ? progressData.progress : (Number.isFinite(dl.progress) ? dl.progress : 0),
              stage: progressData.stage ?? dl.stage,
            }
          : dl
      )
    );
  }, []);

  const removeDownload = useCallback((id) => {
    setDownloads((prev) => prev.filter((dl) => dl.id !== id));
  }, []);

  const contextValue = useMemo(
    () => ({
      downloads,
      queue,
      addDownload,
      updateDownloadProgress,
      removeDownload,
      enqueueGame,
      removeFromQueue,
    }),
    [downloads, queue, addDownload, updateDownloadProgress, removeDownload, enqueueGame, removeFromQueue]
  );

  return (
    <DownloadContext.Provider value={contextValue}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => useContext(DownloadContext);

export const useDownloadById = (id) => {
  const { downloads } = useContext(DownloadContext);
  return useMemo(() => downloads.find((dl) => dl.id === id) || null, [downloads, id]);
};

export const useDownloadsByStage = (stage) => {
  const { downloads } = useContext(DownloadContext);
  return useMemo(() => downloads.filter((dl) => dl.stage === stage), [downloads, stage]);
};

export const useActiveDownloads = () => {
  const { downloads } = useContext(DownloadContext);
  return useMemo(
    () => downloads.filter((dl) =>
      ["preparing", "downloading", "extracting", "finalizing", "paused"].includes(dl.stage)
    ),
    [downloads]
  );
};

export const useDownloadStats = () => {
  const { downloads } = useContext(DownloadContext);
  return useMemo(() => {
    const activeDownloads = downloads.filter((d) =>
      ["downloading", "extracting", "preparing"].includes(d.stage)
    );
    const totalSpeed = activeDownloads.reduce((sum, d) => sum + (d.speed || 0), 0);
    return {
      totalSpeed,
      activeDownloads: activeDownloads.length,
      completedCount: downloads.filter((d) => d.stage === "completed").length,
      failedCount: downloads.filter((d) => d.stage === "failed").length,
      totalCount: downloads.length,
    };
  }, [downloads]);
};

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

export const useDownloadCount = () => {
  const { downloads } = useContext(DownloadContext);
  return useMemo(() => downloads.length, [downloads.length]);
};

/** Hook pour lire et gérer la queue de téléchargement */
export const useDownloadQueue = () => {
  const { queue, enqueueGame, removeFromQueue } = useContext(DownloadContext);
  return useMemo(
    () => ({ queue, enqueueGame, removeFromQueue }),
    [queue, enqueueGame, removeFromQueue]
  );
};
