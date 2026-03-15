import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiFolder,
  FiAlertCircle,
  FiHardDrive,
  FiDownload,
  FiX,
} from "react-icons/fi";

const InstallPathModal = ({ isOpen, onClose, onConfirm, gameName }) => {
  const [downloadPath, setDownloadPath] = useState("");
  const [diskSpace, setDiskSpace] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const selectDownloadPath = async () => {
    setIsSelecting(true);
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) {
        setDownloadPath(newPath);

        // Get available disk space
        const space = await window.api.getDiskSpace();
        if (space.success) {
          setDiskSpace(space);
        }
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleConfirm = async () => {
    if (downloadPath) {
      // Save the path to the store
      await window.store.set("downloadPath", downloadPath);
      onConfirm(downloadPath);
      onClose();
    }
  };

  const handleClose = () => {
    setDownloadPath("");
    setDiskSpace(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl glass backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-primary p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                    <FiDownload className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Before installing {gameName}
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                      Choose where to install your games
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Info Banner */}
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="text-primary text-xl" />
                  </div>
                  <div>
                    <h3 className="text-primary font-bold mb-1">
                      Installation folder configuration
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      You must select a folder where all your games will be
                      installed. Make sure to choose a disk with enough free
                      space. A "DrathosGames" subfolder will be created
                      automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Folder Selection */}
              <div className="bg-surface rounded-xl p-6 border border-border mb-4">
                <label className="block">
                  <span className="text-text font-semibold text-base mb-3 block">
                    Select your installation folder
                  </span>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg" />
                      <input
                        type="text"
                        value={downloadPath || "No folder selected"}
                        readOnly
                        className="w-full pl-10 pr-3 py-3 rounded-lg bg-background border border-border text-text-secondary text-sm cursor-not-allowed"
                        placeholder="Click Browse..."
                      />
                    </div>
                    <button
                      onClick={selectDownloadPath}
                      disabled={isSelecting}
                      className="px-6 py-3 bg-gradient-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-primary hover:shadow-glow-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSelecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Selecting...</span>
                        </>
                      ) : (
                        <>
                          <FiFolder className="text-lg" />
                          <span>Browse</span>
                        </>
                      )}
                    </button>
                  </div>
                </label>

                {/* Disk Space Info */}
                {downloadPath && diskSpace && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-background/50 rounded-lg p-4 border border-border"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                        <FiHardDrive className="text-success text-lg" />
                      </div>
                      <h4 className="text-text font-semibold text-sm">
                        Available disk space
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">Free space</span>
                        <span className="text-success font-bold">
                          {diskSpace.freeGB} GB
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            diskSpace.usedPercent > 90
                              ? "bg-error"
                              : diskSpace.usedPercent > 75
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                          style={{ width: `${diskSpace.usedPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">
                          {diskSpace.usedGB} GB used
                        </span>
                        <span className="text-text-secondary">
                          {diskSpace.usedPercent}% used
                        </span>
                      </div>
                    </div>

                    {diskSpace.usedPercent > 90 && (
                      <div className="mt-3 bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2">
                        <FiAlertCircle className="text-error text-base flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-error text-xs font-semibold mb-0.5">
                            Warning: Low disk space
                          </p>
                          <p className="text-text-secondary text-xs">
                            Your disk is almost full. Make sure you have
                            enough space to install your games.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-surface hover:bg-surface/80 text-text rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!downloadPath}
                  className="px-6 py-2.5 bg-success hover:bg-success/80 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-glow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-2"
                >
                  <FiDownload className="text-lg" />
                  <span>Continue installation</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPathModal;
