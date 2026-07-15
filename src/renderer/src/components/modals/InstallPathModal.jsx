import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { motion, AnimatePresence } from "framer-motion";
import logger from "../../services/logger";
import {
  FiFolder,
  FiAlertCircle,
  FiHardDrive,
  FiDownload,
  FiX,
  FiZap,
} from "react-icons/fi";

const InstallPathModal = ({ isOpen, onClose, onConfirm, gameName }) => {
  const { t } = useTranslation();
  const containerRef = useFocusTrap(isOpen);
  const [downloadPath, setDownloadPath] = useState("");
  const [defaultPath, setDefaultPath] = useState("");
  const [diskSpace, setDiskSpace] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    window.api.app.getDefaultDownloadDir().then(setDefaultPath).catch(() => {});
  }, [isOpen]);

  const applyPath = async (newPath) => {
    setDownloadPath(newPath);
    try {
      const space = await window.api.getDiskSpace(newPath);
      if (space.success) setDiskSpace(space);
    } catch {
      setDiskSpace(null);
    }
  };

  const selectDownloadPath = async () => {
    setIsSelecting(true);
    try {
      const newPath = await window.api.selectAndCreateFolder("DrathosGames");
      if (newPath) await applyPath(newPath);
    } catch (error) {
      logger.error("Error selecting folder:", error);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleConfirm = async () => {
    if (downloadPath) {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-2xl glass backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-primary p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                    <FiDownload className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      {t("installPath.title", { name: gameName })}
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                      {t("installPath.subtitle")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/80 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="text-primary text-xl" />
                  </div>
                  <div>
                    <h3 className="text-primary font-bold mb-1">
                      {t("installPath.infoTitle")}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {t("installPath.infoBody")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface rounded-xl p-6 border border-border mb-4">
                <label className="block">
                  <span className="text-text font-semibold text-base mb-3 block">
                    {t("installPath.selectLabel")}
                  </span>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-lg" />
                      <input
                        type="text"
                        value={downloadPath || t("installPath.noFolder")}
                        readOnly
                        className="w-full pl-10 pr-3 py-3 rounded-lg bg-background border border-border text-text-secondary text-sm cursor-not-allowed"
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
                          <span>{t("installPath.selecting")}</span>
                        </>
                      ) : (
                        <>
                          <FiFolder className="text-lg" />
                          <span>{t("installPath.browse")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </label>

                {defaultPath && downloadPath !== defaultPath && (
                  <button
                    onClick={() => applyPath(defaultPath)}
                    className="mt-3 w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                  >
                    <FiZap className="text-primary text-lg shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text">
                        {t("installPath.useDefault")}
                      </span>
                      <span className="block text-xs text-text-secondary truncate">
                        {defaultPath}
                      </span>
                    </span>
                  </button>
                )}

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
                        {t("installPath.diskSpace")}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary">{t("installPath.freeSpace")}</span>
                        <span className="text-success font-bold">
                          {diskSpace.freeGB} GB
                        </span>
                      </div>

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
                          {t("installPath.usedGB", { value: diskSpace.usedGB })}
                        </span>
                        <span className="text-text-secondary">
                          {t("installPath.usedPercent", { value: diskSpace.usedPercent })}
                        </span>
                      </div>
                    </div>

                    {diskSpace.usedPercent > 90 && (
                      <div className="mt-3 bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-2">
                        <FiAlertCircle className="text-error text-base flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-error text-xs font-semibold mb-0.5">
                            {t("installPath.lowSpaceTitle")}
                          </p>
                          <p className="text-text-secondary text-xs">
                            {t("installPath.lowSpaceBody")}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-surface hover:bg-surface/80 text-text rounded-lg font-medium transition-all duration-200"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!downloadPath}
                  className="px-6 py-2.5 bg-success hover:bg-success/80 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-glow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-2"
                >
                  <FiDownload className="text-lg" />
                  <span>{t("installPath.confirm")}</span>
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
