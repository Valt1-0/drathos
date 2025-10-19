import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiAlertTriangle,
  FiX,
  FiCheckCircle,
  FiLock,
} from "react-icons/fi";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  confirmColor = "blue",
  icon: Icon = FiAlertTriangle,
  loading = false,
  error = null,
  success = false,
  showLockInfo = false,
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    blue: {
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-400",
      button: "from-blue-500 to-blue-600",
      buttonHover: "hover:from-blue-600 hover:to-blue-700",
      glow: "shadow-blue-500/30",
    },
    red: {
      iconBg: "bg-red-500/20",
      iconColor: "text-red-400",
      button: "from-red-500 to-red-600",
      buttonHover: "hover:from-red-600 hover:to-red-700",
      glow: "shadow-red-500/30",
    },
    green: {
      iconBg: "bg-green-500/20",
      iconColor: "text-green-400",
      button: "from-green-500 to-green-600",
      buttonHover: "hover:from-green-600 hover:to-green-700",
      glow: "shadow-green-500/30",
    },
    purple: {
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-400",
      button: "from-purple-500 to-purple-600",
      buttonHover: "hover:from-purple-600 hover:to-purple-700",
      glow: "shadow-purple-500/30",
    },
    yellow: {
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      button: "from-amber-500 to-orange-500",
      buttonHover: "hover:from-amber-600 hover:to-orange-600",
      glow: "shadow-amber-500/30",
    },
  };

  const colors = colorClasses[confirmColor] || colorClasses.blue;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelText ? onClose : undefined}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-md"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
              {/* Close Button */}
              {!loading && !success && cancelText && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
                >
                  <FiX className="text-lg" />
                </button>
              )}

              {/* Content */}
              <div className="p-8">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-6"
                >
                  <div className={`w-20 h-20 rounded-2xl ${colors.iconBg} flex items-center justify-center ${colors.glow} shadow-lg`}>
                    {success ? (
                      <FiCheckCircle className={`text-4xl ${colors.iconColor}`} />
                    ) : (
                      <Icon className={`text-4xl ${colors.iconColor}`} />
                    )}
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-white text-center mb-4"
                >
                  {title}
                </motion.h2>

                {/* Error State */}
                {error && !loading && !success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-start gap-3">
                      <FiAlertTriangle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-red-400 font-semibold text-sm mb-1">
                          Erreur
                        </p>
                        <p className="text-slate-300 text-sm break-words">
                          {typeof error === "string" ? error : error.message || "Une erreur est survenue"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Normal Message */}
                {!loading && !success && !error && message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <p className="text-slate-300 text-center leading-relaxed whitespace-pre-line">
                      {message}
                    </p>
                  </motion.div>
                )}

                {/* Lock Info Badge */}
                {showLockInfo && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <div className="flex items-center justify-center gap-2 text-red-400">
                      <FiLock className="text-lg" />
                      <span className="font-semibold text-sm">Le jeu est maintenant bloqué</span>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                {!loading && !success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3"
                  >
                    {cancelText && (
                      <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700/50"
                      >
                        {cancelText}
                      </button>
                    )}
                    <button
                      onClick={onConfirm}
                      disabled={loading}
                      className={`${cancelText ? 'flex-1' : 'w-full'} px-6 py-3 bg-gradient-to-r ${colors.button} ${colors.buttonHover} text-white rounded-xl font-semibold transition-all duration-200 shadow-lg ${colors.glow} disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]`}
                    >
                      {confirmText}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
