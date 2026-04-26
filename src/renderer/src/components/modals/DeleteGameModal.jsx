import { motion, AnimatePresence } from "framer-motion";
import {
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const DeleteGameModal = ({
  isOpen,
  onClose,
  onConfirm,
  game,
  loading,
  result,
}) => {
  const containerRef = useFocusTrap(isOpen && !!game);
  if (!isOpen || !game) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass text-text p-6 md:p-8 rounded-2xl w-full max-w-md relative shadow-2xl backdrop-blur-xl"
          >
            {/* Close Button */}
            {!loading && !result && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg bg-surface hover:bg-surface/80 transition-all duration-300 group"
                aria-label="Close"
              >
                <FiX className="text-xl text-text-secondary group-hover:text-text" />
              </button>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-6"
                >
                  <FiLoader className="text-4xl text-error" />
                </motion.div>
                <h2 className="text-xl font-bold text-text mb-2">
                  Deletion in progress...
                </h2>
                <p className="text-text-secondary">Please wait</p>
              </div>
            )}

            {/* Success State */}
            {result?.success && !loading && (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-block mb-6"
                >
                  <FiCheckCircle className="text-5xl text-success" />
                </motion.div>
                <h2 className="text-2xl font-bold text-success mb-4">
                  Deletion Successful
                </h2>

                <div className="bg-surface/50 rounded-lg p-4 text-left text-sm text-text-secondary mb-4 space-y-2 max-h-48 overflow-y-auto border border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>
                      <span className="text-text font-semibold">
                        {result.cleanup?.reviewsDeleted || 0}
                      </span>{" "}
                      reviews deleted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-success">✓</span>
                    <span>
                      <span className="text-text font-semibold">
                        {result.cleanup?.installationsDeleted || 0}
                      </span>{" "}
                      installations deleted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.cleanup?.fileDeleted ? "text-success" : "text-warning"}>
                      {result.cleanup?.fileDeleted ? "✓" : "⚠"}
                    </span>
                    <span>
                      ZIP File{" "}
                      <span className="text-text font-semibold">
                        {result.cleanup?.fileDeleted
                          ? "deleted"
                          : result.cleanup?.fileError || "unknown status"}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-success hover:bg-success/80 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-glow-accent"
                >
                  Close
                </button>
              </div>
            )}

            {/* Error State */}
            {result?.error && !loading && (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-block mb-6"
                >
                  <FiAlertTriangle className="text-5xl text-error" />
                </motion.div>
                <h2 className="text-2xl font-bold text-error mb-4">
                  Error
                </h2>

                <div className="bg-error/10 rounded-lg p-4 text-left text-sm text-text-secondary mb-4 max-h-48 overflow-y-auto border border-error/30">
                  <p className="text-error font-semibold mb-2">{result.error}</p>
                  {result.details && (
                    <p className="text-text-secondary">{result.details}</p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-error hover:bg-error/80 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-glow-primary"
                >
                  Close
                </button>
              </div>
            )}

            {/* Confirmation State */}
            {!loading && !result && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-error rounded-xl">
                    <FiTrash2 className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-text">
                      Delete from Server
                    </h2>
                    <p className="text-sm text-text-secondary">
                      This action is irreversible
                    </p>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-warning text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-warning font-medium mb-1">
                        Warning
                      </p>
                      <p className="text-sm text-text-secondary">
                        All data will be permanently deleted for all users.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations du jeu */}
                <div className="space-y-3 mb-6">
                  {/* Game Name */}
                  <div className="p-4 bg-surface/50 rounded-lg border border-border">
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
                        <p className="text-sm text-text-secondary">Game to delete</p>
                        <p className="font-bold text-text text-lg truncate">
                          {game.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deletion Information */}
                  <div className="p-4 bg-surface/30 rounded-lg border border-border/50">
                    <p className="text-sm text-text-secondary mb-2">Will be deleted:</p>
                    <ul className="text-sm text-text-secondary space-y-1">
                      <li>• Reviews and comments</li>
                      <li>• Installation records</li>
                      <li>• Associated statistics</li>
                      <li>
                        • ZIP File (
                        <span className="text-text font-semibold">
                          {game.sizeMB} MB
                        </span>
                        )
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6 p-4 bg-surface/30 rounded-lg border border-border/50">
                  <p className="text-center text-text-secondary text-sm">
                    Are you sure you want to delete{" "}
                    <span className="font-bold text-text">"{game.name}"</span> from the server?
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    className="w-full sm:flex-1 px-4 py-3 bg-surface hover:bg-surface/80 text-text rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FiX />
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className="w-full sm:flex-1 px-4 py-3 bg-error hover:bg-error/80 text-white rounded-lg font-medium transition-all duration-300 shadow-lg shadow-glow-primary flex items-center justify-center gap-2"
                  >
                    <FiTrash2 />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeleteGameModal;
