import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useUpload } from "../contexts/uploadContext";
import { useTheme } from "../contexts/themeContext";
import {
  FiLoader,
  FiCheckCircle,
  FiAlertTriangle,
  FiX,
  FiZap,
  FiClock,
} from "react-icons/fi";

const UploadNotification = () => {
  const { t } = useTranslation();
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
    queueInfo,
    dismissUpload,
  } = useUpload();
  const { isLight, getTextClass } = useTheme();

  // Function to format speed
  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return t('upload.calculating');
    const mbps = bytesPerSecond / (1024 * 1024);
    if (mbps >= 1) {
      return `${mbps.toFixed(2)} MB/s`;
    }
    const kbps = bytesPerSecond / 1024;
    return `${kbps.toFixed(2)} KB/s`;
  };

  // Function to format remaining time
  const formatETA = (seconds) => {
    if (seconds === 0 || !isFinite(seconds)) return t('upload.calculating');
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

  // Function to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

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
        <div className="backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden bg-surface border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              {uploadState === "queued" && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center"
                >
                  <FiClock className="text-2xl text-warning" />
                </motion.div>
              )}

              {uploadState === "uploading" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"
                >
                  <FiLoader className="text-2xl text-primary" />
                </motion.div>
              )}

              {uploadState === "success" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center"
                >
                  <FiCheckCircle className="text-2xl text-success" />
                </motion.div>
              )}

              {uploadState === "error" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center"
                >
                  <FiAlertTriangle className="text-2xl text-error" />
                </motion.div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm truncate ${getTextClass('primary')}`}>
                  {uploadState === "queued" && t('upload.queued')}
                  {uploadState === "uploading" && t('upload.uploading')}
                  {uploadState === "success" && t('upload.complete')}
                  {uploadState === "error" && t('upload.error')}
                </h3>
                <p className={`text-xs truncate ${getTextClass('secondary')}`}>{uploadGameName}</p>
                {uploadState === "queued" && queueInfo && (
                  <p className="text-xs text-warning mt-1">
                    {t('upload.queueInfo', { active: queueInfo.active, queued: queueInfo.queued })}
                  </p>
                )}
              </div>
            </div>

            {/* Close button - only if not uploading */}
            {uploadState !== "uploading" && (
              <button
                onClick={dismissUpload}
                className={`p-1.5 rounded-lg transition-all hover:bg-background-secondary ${getTextClass('secondary')}`}
              >
                <FiX className="text-lg" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-4">
            {uploadState === "queued" && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <p className={`text-sm ${getTextClass('primary')}`}>
                  {t('upload.queueMessage')}
                </p>
                {queueInfo && (
                  <p className={`text-xs mt-2 ${getTextClass('secondary')}`} dangerouslySetInnerHTML={{ __html: t('upload.queueStats', { active: queueInfo.active, queued: queueInfo.queued }) }} />
                )}
              </div>
            )}

            {uploadState === "uploading" && (
              <>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className={getTextClass('secondary')}>{t('upload.progress')}</span>
                    <span className="text-primary font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-background-secondary">
                    <motion.div
                      className="h-full bg-gradient-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Speed */}
                  <div className="rounded-lg p-3 border bg-background-secondary border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <FiZap className="text-primary text-sm" />
                      <span className={`text-xs ${getTextClass('secondary')}`}>{t('upload.speed')}</span>
                    </div>
                    <p className={`text-sm font-bold ${getTextClass('primary')}`}>
                      {formatSpeed(uploadSpeed)}
                    </p>
                  </div>

                  {/* Time Remaining */}
                  <div className="rounded-lg p-3 border bg-background-secondary border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <FiClock className="text-secondary text-sm" />
                      <span className={`text-xs ${getTextClass('secondary')}`}>{t('upload.remaining')}</span>
                    </div>
                    <p className={`text-sm font-bold ${getTextClass('primary')}`}>
                      {formatETA(uploadETA)}
                    </p>
                  </div>
                </div>

                {/* Upload Size */}
                <div className="rounded-lg p-2 border bg-background border-border">
                  <div className="flex justify-between items-center">
                    <span className={`text-xs ${getTextClass('secondary')}`}>{t('upload.sent')}</span>
                    <span className={`text-xs font-semibold ${getTextClass('primary')}`}>
                      {formatBytes(uploadLoaded)} / {formatBytes(uploadTotal)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {uploadState === "success" && (
              <div className="text-center py-2">
                <p className="text-success font-semibold text-sm mb-1">
                  {t('upload.success')}
                </p>
                <p className={`text-xs ${getTextClass('secondary')}`}>
                  {t('upload.autoClose')}
                </p>
              </div>
            )}

            {uploadState === "error" && (
              <div className="text-center py-2">
                <p className="text-error font-semibold text-sm mb-2">
                  {t('upload.failed')}
                </p>
                <p className={`text-xs break-words ${getTextClass('primary')}`}>
                  {uploadError || t('upload.errorOccurred')}
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
