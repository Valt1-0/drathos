import { motion, AnimatePresence } from "framer-motion";
import { useUpload } from "../contexts/uploadContext";
import {
  FiLoader,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiZap,
  FiClock,
} from "react-icons/fi";

// Fonction pour formater la vitesse
const formatSpeed = (bytesPerSecond) => {
  if (bytesPerSecond === 0) return "Calculating...";
  const mbps = bytesPerSecond / (1024 * 1024);
  if (mbps >= 1) {
    return `${mbps.toFixed(2)} MB/s`;
  }
  const kbps = bytesPerSecond / 1024;
  return `${kbps.toFixed(2)} KB/s`;
};

// Fonction pour formater le temps restant
const formatETA = (seconds) => {
  if (seconds === 0 || !isFinite(seconds)) return "Calculating...";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Fonction pour formater les bytes
const formatBytes = (bytes) => {
  if (bytes === 0) return "0 B";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
};

const UploadNotification = () => {
  const {
    isUploading,
    uploadState,
    uploadProgress,
    uploadSpeed,
    uploadETA,
    uploadLoaded,
    uploadTotal,
    uploadGameName,
    uploadError,
    dismissUpload,
  } = useUpload();

  if (!isUploading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              {uploadState === "uploading" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"
                >
                  <FiLoader className="text-2xl text-blue-400" />
                </motion.div>
              )}

              {uploadState === "success" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"
                >
                  <FiCheckCircle className="text-2xl text-green-400" />
                </motion.div>
              )}

              {uploadState === "error" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center"
                >
                  <FiAlertTriangle className="text-2xl text-red-400" />
                </motion.div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">
                  {uploadState === "uploading" && "Upload in progress"}
                  {uploadState === "success" && "Upload complete"}
                  {uploadState === "error" && "Upload error"}
                </h3>
                <p className="text-xs text-slate-400 truncate">{uploadGameName}</p>
              </div>
            </div>

            {/* Close button - only if not uploading */}
            {uploadState !== "uploading" && (
              <button
                onClick={dismissUpload}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
              >
                <FiX className="text-lg" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4">
            {uploadState === "uploading" && (
              <>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-slate-400">Progress</span>
                    <span className="text-blue-400 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Speed */}
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <FiZap className="text-blue-400 text-sm" />
                      <span className="text-xs text-slate-400">Speed</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {formatSpeed(uploadSpeed)}
                    </p>
                  </div>

                  {/* Time Remaining */}
                  <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="text-purple-400 text-sm" />
                      <span className="text-xs text-slate-400">Remaining</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {formatETA(uploadETA)}
                    </p>
                  </div>
                </div>

                {/* Upload Size */}
                <div className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Sent</span>
                    <span className="text-xs font-semibold text-white">
                      {formatBytes(uploadLoaded)} / {formatBytes(uploadTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {uploadState === "success" && (
              <div className="text-center py-2">
                <p className="text-green-400 font-semibold text-sm mb-1">
                  Game added successfully!
                </p>
                <p className="text-slate-400 text-xs">
                  This notification will close automatically
                </p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="text-center py-2">
                <p className="text-red-400 font-semibold text-sm mb-2">
                  Upload failed
                </p>
                <p className="text-slate-300 text-xs break-words">
                  {uploadError || "An error occurred"}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadNotification;
