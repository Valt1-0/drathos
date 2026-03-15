import { createContext, useContext, useState } from "react";
import { getUploadQueueInfo } from "../api/serverGames";

const UploadContext = createContext();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }
  return context;
};

export const UploadProvider = ({ children }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState("idle"); // idle, queued, uploading, success, error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadETA, setUploadETA] = useState(0);
  const [uploadLoaded, setUploadLoaded] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadGameName, setUploadGameName] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [queueInfo, setQueueInfo] = useState({ active: 0, queued: 0, maxSimultaneous: 2 });

  const startUpload = (gameName) => {
    setIsUploading(true);
    setUploadState("uploading");
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadETA(0);
    setUploadLoaded(0);
    setUploadTotal(0);
    setUploadGameName(gameName);
    setUploadError("");
  };

  const updateUploadProgress = (progressData) => {
    // Handle queued state
    if (progressData.status === 'queued') {
      setUploadState("queued");
      setQueueInfo(progressData.queueInfo || getUploadQueueInfo());
    } else {
      setUploadState("uploading");
    }

    setUploadProgress(progressData.percent);
    setUploadSpeed(progressData.speed);
    setUploadETA(progressData.eta);
    setUploadLoaded(progressData.loaded);
    setUploadTotal(progressData.total);

    // Update queue info
    if (progressData.queueInfo) {
      setQueueInfo(progressData.queueInfo);
    }
  };

  const completeUpload = () => {
    setUploadState("success");
    // Auto-reset after 5 seconds
    setTimeout(() => {
      resetUpload();
    }, 5000);
  };

  const failUpload = (error) => {
    setUploadState("error");
    setUploadError(error);
    // Auto-reset after 10 seconds
    setTimeout(() => {
      resetUpload();
    }, 10000);
  };

  const resetUpload = () => {
    setIsUploading(false);
    setUploadState("idle");
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadETA(0);
    setUploadLoaded(0);
    setUploadTotal(0);
    setUploadGameName("");
    setUploadError("");
  };

  const dismissUpload = () => {
    if (uploadState !== "uploading") {
      resetUpload();
    }
  };

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        uploadState,
        uploadProgress,
        uploadSpeed,
        uploadETA,
        uploadLoaded,
        uploadTotal,
        uploadGameName,
        uploadError,
        queueInfo,
        startUpload,
        updateUploadProgress,
        completeUpload,
        failUpload,
        resetUpload,
        dismissUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
