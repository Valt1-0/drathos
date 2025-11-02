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

        // Récupérer l'espace disque disponible
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
      // Sauvegarder le chemin dans le store
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
            className="relative w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                    <FiDownload className="text-white text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Avant d'installer {gameName}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Choisissez où installer vos jeux
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
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-blue-300 font-bold mb-1">
                      Configuration du dossier d'installation
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Vous devez sélectionner un dossier où tous vos jeux seront
                      installés. Assurez-vous de choisir un disque avec suffisamment
                      d'espace libre. Un sous-dossier "DrathosGames" sera créé
                      automatiquement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Folder Selection */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 mb-4">
                <label className="block">
                  <span className="text-white font-semibold text-base mb-3 block">
                    Sélectionnez votre dossier d'installation
                  </span>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <FiFolder className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                      <input
                        type="text"
                        value={downloadPath || "Aucun dossier sélectionné"}
                        readOnly
                        className="w-full pl-10 pr-3 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-slate-300 text-sm cursor-not-allowed"
                        placeholder="Cliquez sur Parcourir..."
                      />
                    </div>
                    <button
                      onClick={selectDownloadPath}
                      disabled={isSelecting}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSelecting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Sélection...</span>
                        </>
                      ) : (
                        <>
                          <FiFolder className="text-lg" />
                          <span>Parcourir</span>
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
                    className="mt-4 bg-slate-900/50 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <FiHardDrive className="text-green-400 text-lg" />
                      </div>
                      <h4 className="text-white font-semibold text-sm">
                        Espace disque disponible
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Espace libre</span>
                        <span className="text-green-400 font-bold">
                          {diskSpace.freeGB} GB
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            diskSpace.usedPercent > 90
                              ? "bg-gradient-to-r from-red-500 to-orange-500"
                              : diskSpace.usedPercent > 75
                              ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                              : "bg-gradient-to-r from-blue-500 to-green-500"
                          }`}
                          style={{ width: `${diskSpace.usedPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {diskSpace.usedGB} GB utilisés
                        </span>
                        <span className="text-slate-500">
                          {diskSpace.usedPercent}% utilisé
                        </span>
                      </div>
                    </div>

                    {diskSpace.usedPercent > 90 && (
                      <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                        <FiAlertCircle className="text-red-400 text-base flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-300 text-xs font-semibold mb-0.5">
                            Attention : Espace disque faible
                          </p>
                          <p className="text-red-200/80 text-xs">
                            Votre disque est presque plein. Assurez-vous d'avoir
                            suffisamment d'espace pour installer vos jeux.
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
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!downloadPath}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-2"
                >
                  <FiDownload className="text-lg" />
                  <span>Continuer l'installation</span>
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
