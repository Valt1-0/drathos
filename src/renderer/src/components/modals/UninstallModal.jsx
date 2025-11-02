// src/renderer/src/components/UninstallModal.jsx
import { motion, AnimatePresence } from "framer-motion";
import {
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiHardDrive,
} from "react-icons/fi";

const UninstallModal = ({ isOpen, onClose, onConfirm, game, gameSize }) => {
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
            className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 md:p-8 rounded-2xl w-full max-w-md relative shadow-2xl border border-gray-700"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 transition-all duration-300 group"
            >
              <FiX className="text-xl text-gray-400 group-hover:text-white" />
            </button>

            {/* Header avec icône d'avertissement */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                <FiTrash2 className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
                  Désinstaller le jeu
                </h2>
                <p className="text-sm text-gray-400">
                  Cette action est irréversible
                </p>
              </div>
            </div>

            {/* Bannière d'avertissement */}
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <FiAlertTriangle className="text-orange-400 text-xl flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-200 font-medium mb-1">
                    Attention
                  </p>
                  <p className="text-sm text-orange-100/80">
                    Tous les fichiers du jeu seront supprimés définitivement de
                    votre ordinateur.
                  </p>
                </div>
              </div>
            </div>

            {/* Informations du jeu */}
            <div className="space-y-3 mb-6">
              {/* Nom du jeu */}
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
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
                    <p className="text-sm text-gray-400">Jeu à désinstaller</p>
                    <p className="font-bold text-white text-lg truncate">
                      {game.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informations de taille */}
              {gameSize && (
                <div className="p-4 bg-gray-700/20 rounded-lg border border-gray-600/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FiHardDrive className="text-blue-400 text-lg" />
                    <span className="text-sm text-gray-400">Espace à libérer</span>
                  </div>
                  <p className="text-white font-bold text-xl">{gameSize.sizeGB} GB</p>
                </div>
              )}
            </div>

            {/* Message de confirmation */}
            <div className="mb-6 p-4 bg-gray-700/20 rounded-lg border border-gray-600/50">
              <p className="text-center text-gray-300 text-sm">
                Êtes-vous sûr de vouloir désinstaller{" "}
                <span className="font-bold text-white">"{game.name}"</span> ?
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FiX />
                Annuler
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-red-500/50 flex items-center justify-center gap-2"
              >
                <FiTrash2 />
                Désinstaller
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UninstallModal;
