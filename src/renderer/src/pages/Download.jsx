import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  useDownloadStats,
  useActiveDownloads,
  useDownloadsByStage,
  useDownloadCount,
} from "../contexts/downloadContext";
import EnhancedDownloadProgress from "../components/EnhancedDownloadProgress";
import GameCover from "../components/GameCover";
import {
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiActivity,
  FiHardDrive,
  FiZap,
  FiSettings,
} from "react-icons/fi";

const Download = () => {
  // Utiliser les hooks optimisés au lieu de useDownload()
  const downloadStats = useDownloadStats();
  const activeDownloads = useActiveDownloads();
  const completedDownloads = useDownloadsByStage("completed");
  const failedDownloads = useDownloadsByStage("failed");
  const totalDownloads = useDownloadCount();

  const [diskSpace, setDiskSpace] = useState({
    freeSpace: 0,
    totalSpace: 0,
    usedPercent: 0,
  });

  // Charger l'espace disque au montage
  useEffect(() => {
    const loadDiskSpace = async () => {
      try {
        const result = await window.api.getDiskSpace();
        if (result.success) {
          setDiskSpace({
            freeSpace: result.freeGB,
            totalSpace: result.totalGB,
            usedPercent: result.usedPercent,
          });
        }
      } catch (error) {
        console.error("Error loading disk space:", error);
      }
    };

    loadDiskSpace();
    // Rafraîchir l'espace disque toutes les 30 secondes
    const interval = setInterval(loadDiskSpace, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
      {/* Header avec stats */}
      <div className="px-6 md:px-16 py-6 pb-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <FiDownload className="text-white text-xl" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Downloads
              </h1>
            </div>
            <p className="text-gray-400 text-sm ml-13">
              Advanced download manager with real-time metrics
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Total Speed */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-6 hover:scale-105 transition-transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400 font-medium">
                    Total Speed
                  </span>
                  <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-xl">
                    <FiZap className="text-green-400 text-xl" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {downloadStats.totalSpeed.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-400">MB/s</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-3">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (downloadStats.totalSpeed / 100) * 100)}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Free Space */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="group relative overflow-hidden bg-gradient-to-br from-yellow-600/20 to-orange-800/20 backdrop-blur-sm border border-yellow-500/30 rounded-xl p-6 hover:scale-105 transition-transform duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400 font-medium">
                    Free Space
                  </span>
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-500/20 rounded-xl">
                    <FiHardDrive className="text-yellow-400 text-xl" />
                  </div>
                </div>

                {diskSpace.freeSpace > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-white">
                        {diskSpace.freeSpace}
                      </span>
                      <span className="text-sm text-gray-400">GB free</span>
                    </div>
                    {diskSpace.totalSpace > 0 && (
                      <div className="text-sm text-gray-500 mb-2">
                        of {diskSpace.totalSpace} GB total
                      </div>
                    )}
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          diskSpace.usedPercent > 90
                            ? "bg-gradient-to-r from-red-500 to-red-400"
                            : diskSpace.usedPercent > 75
                            ? "bg-gradient-to-r from-orange-500 to-yellow-400"
                            : "bg-gradient-to-r from-yellow-500 to-green-400"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${diskSpace.usedPercent || 0}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    {diskSpace.usedPercent > 0 && (
                      <div className="text-sm text-gray-400 mt-2 text-right">
                        {diskSpace.usedPercent}% used
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Aucun emplacement de téléchargement sélectionné
                    </p>
                    <Link to="/settings">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-yellow-500/30"
                      >
                        <FiSettings className="text-lg" />
                        <span>Configurer</span>
                      </motion.button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Téléchargements actifs */}
        <AnimatePresence mode="wait">
          {activeDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
                <h2 className="text-xl font-bold text-white">
                  Active Downloads ({activeDownloads.length})
                </h2>
              </div>

              <div className="space-y-4">
                {activeDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <EnhancedDownloadProgress download={download} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Téléchargements terminés */}
        <AnimatePresence mode="wait">
          {completedDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <FiCheckCircle className="text-green-400 text-xl" />
                <h2 className="text-xl font-bold text-white">
                  Completed ({completedDownloads.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-green-500/50 rounded-2xl p-4 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 bg-gray-700 rounded-xl overflow-hidden flex-shrink-0">
                        <GameCover
                          src={download.image}
                          alt="Cover"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          size="thumb"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FiCheckCircle className="text-green-400 text-2xl" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold truncate">
                          {download.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                            <FiCheckCircle className="text-xs" />
                            Installed
                          </span>
                          {download.totalTime && (
                            <>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400 text-xs">
                                {Math.floor(download.totalTime / 1000)}s
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Téléchargements échoués */}
        <AnimatePresence mode="wait">
          {failedDownloads.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <FiXCircle className="text-red-400 text-xl" />
                <h2 className="text-xl font-bold text-white">
                  Failed ({failedDownloads.length})
                </h2>
              </div>

              <div className="space-y-3">
                {failedDownloads.map((download, index) => (
                  <motion.div
                    key={download.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-700/50 rounded-2xl p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-xl overflow-hidden">
                          <GameCover
                            src={download.image}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            size="thumb"
                          />
                        </div>

                        <div>
                          <h3 className="text-white font-semibold">
                            {download.name}
                          </h3>
                          <p className="text-red-300 text-sm flex items-center gap-1 mt-1">
                            <FiXCircle className="text-xs" />
                            {download.error || "Unknown error"}
                          </p>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors"
                      >
                        Retry
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* État vide */}
        {totalDownloads === 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center py-12"
          >
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-xl"></div>
              <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-full border border-gray-700">
                <FiDownload className="text-4xl text-gray-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No Downloads Yet
            </h3>
            <p className="text-gray-400 text-sm">
              Your downloads will appear here once you start installing games
            </p>
          </motion.div>
        )}

        {/* Footer info */}
        {totalDownloads > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8 pt-4 border-t border-gray-800"
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-400">
              <p>
                Downloads continue in the background even if you close this page
              </p>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <FiZap className="text-blue-400" /> Optimized Engine
                </span>
                <span>•</span>
                <span className="flex items-center gap-2">
                  <FiActivity className="text-green-400" /> Real-time Metrics
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Download;
