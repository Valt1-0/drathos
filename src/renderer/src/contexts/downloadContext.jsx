import React, { createContext, useContext, useState } from "react";

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [downloads, setDownloads] = useState([]);

  const addDownload = (download) => {
    setDownloads((prev) => [...prev, download]);
  };

  const updateDownloadProgress = (id, progressData) => {
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
  };

  const removeDownload = (id) => {
    setDownloads((prev) => prev.filter((dl) => dl.id !== id));
  };

  return (
    <DownloadContext.Provider
      value={{ downloads, addDownload, updateDownloadProgress, removeDownload }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => useContext(DownloadContext);
