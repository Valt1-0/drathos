import { motion, AnimatePresence } from "framer-motion";
import {
  FiTrash2,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";

const DeleteGameModal = ({
  isOpen,
  onClose,
  onConfirm,
  game,
  loading,
  result,
}) => {
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
            {!loading && !result && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600 transition-all duration-300 group"
              >
                <FiX className="text-xl text-gray-400 group-hover:text-white" />
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
                  <FiLoader className="text-4xl text-red-500" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Deletion in progress...
                </h2>
                <p className="text-gray-400">Please wait</p>
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
                  <FiCheckCircle className="text-5xl text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent mb-4">
                  Deletion Successful
                </h2>

                <div className="bg-gray-700/30 rounded-lg p-4 text-left text-sm text-gray-300 mb-4 space-y-2 max-h-48 overflow-y-auto border border-gray-600/50">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>
                      <span className="text-white font-semibold">
                        {result.cleanup?.reviewsDeleted || 0}
                      </span>{" "}
                      reviews deleted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>
                      <span className="text-white font-semibold">
                        {result.cleanup?.installationsDeleted || 0}
                      </span>{" "}
                      installations deleted
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={result.cleanup?.fileDeleted ? "text-green-400" : "text-yellow-400"}>
                      {result.cleanup?.fileDeleted ? "✓" : "⚠"}
                    </span>
                    <span>
                      ZIP File{" "}
                      <span className="text-white font-semibold">
                        {result.cleanup?.fileDeleted
                          ? "deleted"
                          : result.cleanup?.fileError || "unknown status"}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-green-500/50"
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
                  <FiAlertTriangle className="text-5xl text-red-500" />
                </motion.div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-300 to-orange-300 bg-clip-text text-transparent mb-4">
                  Error
                </h2>

                <div className="bg-red-500/10 rounded-lg p-4 text-left text-sm text-gray-300 mb-4 max-h-48 overflow-y-auto border border-red-500/30">
                  <p className="text-red-400 font-semibold mb-2">{result.error}</p>
                  {result.details && (
                    <p className="text-gray-400">{result.details}</p>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-red-500/50"
                >
                  Close
                </button>
              </div>
            )}

            {/* Confirmation State */}
            {!loading && !result && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                    <FiTrash2 className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-orange-200 bg-clip-text text-transparent">
                      Delete from Server
                    </h2>
                    <p className="text-sm text-gray-400">
                      This action is irreversible
                    </p>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="text-orange-400 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-200 font-medium mb-1">
                        Warning
                      </p>
                      <p className="text-sm text-orange-100/80">
                        All data will be permanently deleted for all users.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informations du jeu */}
                <div className="space-y-3 mb-6">
                  {/* Game Name */}
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
                        <p className="text-sm text-gray-400">Game to delete</p>
                        <p className="font-bold text-white text-lg truncate">
                          {game.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Deletion Information */}
                  <div className="p-4 bg-gray-700/20 rounded-lg border border-gray-600/50">
                    <p className="text-sm text-gray-400 mb-2">Will be deleted:</p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Reviews and comments</li>
                      <li>• Installation records</li>
                      <li>• Associated statistics</li>
                      <li>
                        • ZIP File (
                        <span className="text-white font-semibold">
                          {game.sizeMB} MB
                        </span>
                        )
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Confirmation Message */}
                <div className="mb-6 p-4 bg-gray-700/20 rounded-lg border border-gray-600/50">
                  <p className="text-center text-gray-300 text-sm">
                    Are you sure you want to delete{" "}
                    <span className="font-bold text-white">"{game.name}"</span> from the server?
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={onClose}
                    className="w-full sm:flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FiX />
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className="w-full sm:flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-red-500/50 flex items-center justify-center gap-2"
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
