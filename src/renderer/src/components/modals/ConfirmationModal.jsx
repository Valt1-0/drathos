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
  confirmText = "Confirm",
  cancelText = "Cancel",
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
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      button: "bg-gradient-primary",
      buttonHover: "hover:bg-primary-hover",
      glow: "shadow-primary",
    },
    red: {
      iconBg: "bg-error/20",
      iconColor: "text-error",
      button: "bg-error",
      buttonHover: "hover:bg-error/80",
      glow: "shadow-glow-primary",
    },
    green: {
      iconBg: "bg-success/20",
      iconColor: "text-success",
      button: "bg-success",
      buttonHover: "hover:bg-success/80",
      glow: "shadow-glow-accent",
    },
    purple: {
      iconBg: "bg-secondary/20",
      iconColor: "text-secondary",
      button: "bg-gradient-secondary",
      buttonHover: "hover:bg-secondary-hover",
      glow: "shadow-secondary",
    },
    yellow: {
      iconBg: "bg-warning/20",
      iconColor: "text-warning",
      button: "bg-warning",
      buttonHover: "hover:bg-warning/80",
      glow: "shadow-accent",
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
            <div className="glass backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Close Button */}
              {!loading && !success && cancelText && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface hover:bg-surface/80 text-text-secondary hover:text-text transition-all duration-200"
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
                  className="text-2xl font-bold text-text text-center mb-4"
                >
                  {title}
                </motion.h2>

                {/* Error State */}
                {error && !loading && !success && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-error/10 border border-error/20 rounded-xl p-4 mb-6"
                  >
                    <div className="flex items-start gap-3">
                      <FiAlertTriangle className="text-error text-lg flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-error font-semibold text-sm mb-1">
                          Error
                        </p>
                        <p className="text-text-secondary text-sm break-words">
                          {typeof error === "string" ? error : error.message || "An error occurred"}
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
                    <p className="text-text-secondary text-center leading-relaxed whitespace-pre-line">
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
                    className="mb-6 p-4 bg-error/10 border border-error/20 rounded-xl"
                  >
                    <div className="flex items-center justify-center gap-2 text-error">
                      <FiLock className="text-lg" />
                      <span className="font-semibold text-sm">The game is now locked</span>
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
                        className="flex-1 px-6 py-3 bg-surface hover:bg-surface/80 text-text-secondary hover:text-text rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-border"
                      >
                        {cancelText}
                      </button>
                    )}
                    <button
                      onClick={onConfirm}
                      disabled={loading}
                      className={`${cancelText ? 'flex-1' : 'w-full'} px-6 py-3 ${colors.button} ${colors.buttonHover} text-white rounded-xl font-semibold transition-all duration-200 shadow-lg ${colors.glow} disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]`}
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
