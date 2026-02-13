import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiHardDrive,
} from "react-icons/fi";

const formatSize = (gameSize) => {
  if (!gameSize) return null;
  if (gameSize.sizeGB >= 1) {
    return `${gameSize.sizeGB.toFixed(2)} GB`;
  }
  return `${gameSize.sizeMB} MB`;
};

const UninstallModal = ({ isOpen, onClose, onConfirm, game, gameSize }) => {
  const { t } = useTranslation();

  if (!isOpen || !game) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass backdrop-blur-xl text-text p-6 md:p-8 rounded-2xl w-full max-w-md relative shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-surface hover:bg-surface/80 transition-all duration-300 group"
            >
              <FiX className="text-xl text-text-secondary group-hover:text-text" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-error rounded-xl">
                <FiTrash2 className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text">
                  {t('modals.uninstall.title')}
                </h2>
                <p className="text-sm text-text-secondary">
                  {t('modals.uninstall.irreversible')}
                </p>
              </div>
            </div>

            {/* Warning banner */}
            <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-xl">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="text-warning text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-warning font-medium mb-1">
                    {t('modals.uninstall.warning')}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t('modals.uninstall.warningMessage')}
                  </p>
                </div>
              </div>
            </div>

            {/* Game info */}
            <div className="space-y-3 mb-6">
              <div className="p-4 bg-surface rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-surface rounded-lg flex-shrink-0 overflow-hidden">
                    {game.coverUrl && (
                      <img
                        src={game.coverUrl}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-secondary">
                      {t('modals.uninstall.gameToUninstall')}
                    </p>
                    <p className="font-bold text-text text-lg truncate">
                      {game.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Size info */}
              {gameSize && (
                <div className="p-4 bg-surface/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <FiHardDrive className="text-primary text-lg" />
                    <span className="text-sm text-text-secondary">
                      {t('modals.uninstall.spaceToFree')}
                    </span>
                  </div>
                  <p className="text-text font-bold text-xl">
                    {formatSize(gameSize)}
                  </p>
                </div>
              )}
            </div>

            {/* Confirmation message */}
            <div className="mb-6 p-4 bg-surface/50 rounded-lg border border-border">
              <p className="text-center text-text-secondary text-sm">
                {t('modals.uninstall.confirmMessage', { name: game.name })}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 py-3 bg-surface hover:bg-surface/80 text-text rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FiX />
                {t('modals.uninstall.cancel')}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full sm:flex-1 px-4 py-3 bg-error hover:bg-error/80 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-glow-primary flex items-center justify-center gap-2"
              >
                <FiTrash2 />
                {t('modals.uninstall.confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UninstallModal;
