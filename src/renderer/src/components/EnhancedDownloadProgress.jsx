import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useDownload } from "../contexts/downloadContext";
import {
  FiDownload,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiZap,
  FiClock,
} from "react-icons/fi";

const EnhancedDownloadProgress = ({ download }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [displayETA, setDisplayETA] = useState("");
  const animationRef = useRef(null);

  // Animation fluide du progress bar (60fps)
  useEffect(() => {
    const animate = () => {
      setAnimatedProgress((prev) => {
        const diff = download.progress - prev;
        // Easing pour animation fluide
        const newValue = prev + diff * 0.1;
        return Math.abs(diff) < 0.1 ? download.progress : newValue;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [download.progress]);

  // Mise à jour des métriques avec smooth transitions
  useEffect(() => {
    setDisplaySpeed(download.speed || 0);

    // Calcul ETA formaté
    if (download.eta && download.eta > 0) {
      const minutes = Math.floor(download.eta / 60);
      const seconds = Math.floor(download.eta % 60);
      setDisplayETA(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    } else {
      setDisplayETA("--:--");
    }
  }, [download.speed, download.eta]);

  // Couleurs dynamiques selon le stage
  const getStageColor = (stage) => {
    switch (stage) {
      case "preparing":
        return "from-blue-500 to-blue-600";
      case "downloading":
        return "from-green-500 to-emerald-600";
      case "extracting":
        return "from-yellow-500 to-orange-600";
      case "finalizing":
        return "from-purple-500 to-purple-600";
      case "completed":
        return "from-green-600 to-green-700";
      case "failed":
        return "from-red-500 to-red-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  // Icônes par stage
  const getStageIcon = (stage) => {
    switch (stage) {
      case "preparing":
        return <FiDownload className="text-blue-400" />;
      case "downloading":
        return <FiDownload className="text-green-400 animate-bounce" />;
      case "extracting":
        return <FiPackage className="text-yellow-400" />;
      case "finalizing":
        return <FiZap className="text-purple-400" />;
      case "completed":
        return <FiCheckCircle className="text-green-400" />;
      case "failed":
        return <FiXCircle className="text-red-400" />;
      default:
        return <FiClock className="text-gray-400" />;
    }
  };

  // Messages dynamiques
  const getStageMessage = (stage) => {
    switch (stage) {
      case "preparing":
        return "Preparing download...";
      case "downloading":
        return "Downloading";
      case "extracting":
        return "Extracting files";
      case "finalizing":
        return "Finalizing installation";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      default:
        return "Waiting...";
    }
  };

  // Border color selon le stage
  const getBorderColor = (stage) => {
    switch (stage) {
      case "preparing":
        return "border-blue-500/50";
      case "downloading":
        return "border-green-500/50";
      case "extracting":
        return "border-yellow-500/50";
      case "finalizing":
        return "border-purple-500/50";
      case "completed":
        return "border-green-600/50";
      case "failed":
        return "border-red-500/50";
      default:
        return "border-gray-700/50";
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-sm rounded-2xl p-6 border ${getBorderColor(
        download.stage
      )} shadow-xl hover:shadow-2xl transition-all duration-300`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header avec image et infos de base */}
      <div className="relative z-10 flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 bg-gray-700 rounded-xl overflow-hidden flex-shrink-0 border border-gray-600">
          <img
            src={download.image}
            alt="Cover"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {/* Stage icon overlay */}
          <div className="absolute top-1 right-1 w-8 h-8 bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center border border-gray-700">
            {getStageIcon(download.stage)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-lg truncate mb-1">
            {download.name}
          </h3>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-300 text-sm font-medium">
              {getStageMessage(download.stage)}
            </span>

            {download.stage === "downloading" && (
              <>
                <span className="text-gray-600">•</span>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-lg">
                  <FiZap className="text-green-400 text-xs" />
                  <span className="text-green-400 text-sm font-bold font-mono">
                    {displaySpeed.toFixed(1)} MB/s
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Progress percentage and ETA */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/20 rounded-lg">
              <span className="text-blue-400 font-bold text-base">
                {animatedProgress.toFixed(0)}%
              </span>
            </div>

            {download.stage === "downloading" && displayETA !== "--:--" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 rounded-lg">
                <FiClock className="text-purple-400 text-xs" />
                <span className="text-purple-400 font-medium">
                  {displayETA}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar Animée */}
      <div className="relative z-10">
        {/* Background */}
        <div className="w-full bg-gray-700/50 h-3 rounded-full overflow-hidden border border-gray-600/50">
          {/* Progress principal avec gradient */}
          <motion.div
            className={`h-full bg-gradient-to-r ${getStageColor(
              download.stage
            )} relative`}
            initial={{ width: 0 }}
            animate={{ width: `${animatedProgress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Effet de brillance animé */}
            {download.stage === "downloading" && (
              <motion.div
                className="absolute top-0 right-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Labels de progression */}
        <div className="flex justify-between mt-3 text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <FiDownload className="text-xs" />
            <span className="font-medium">
              {download.sizeDownloaded
                ? `${download.sizeDownloaded.toFixed(2)} GB`
                : "0.00 GB"}
            </span>
          </div>

          {download.stage === "extracting" && download.extractedFiles && (
            <span className="text-yellow-400 font-medium">
              {download.extractedFiles}/{download.totalFiles} files
            </span>
          )}

          <div className="flex items-center gap-2 text-gray-400">
            <span className="font-medium">
              {download.totalSize
                ? `${download.totalSize.toFixed(2)} GB`
                : "Calculating..."}
            </span>
          </div>
        </div>
      </div>

      {/* Métriques détaillées (téléchargement) */}
      {download.stage === "downloading" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mt-4 pt-4 border-t border-gray-700/50 flex justify-between text-xs"
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
              <FiZap className="text-blue-400" />
              <span className="text-gray-300 font-medium">
                {displaySpeed.toFixed(2)} MB/s
              </span>
            </div>
            {download.instantSpeed && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
                <span className="text-green-400">⚡</span>
                <span className="text-gray-300 font-medium">
                  {download.instantSpeed.toFixed(2)} MB/s
                </span>
              </div>
            )}
          </div>

          {download.elapsedTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/50 rounded-lg">
              <FiClock className="text-purple-400" />
              <span className="text-gray-300 font-medium">
                {Math.floor(download.elapsedTime / 1000)}s
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Message d'erreur */}
      {download.stage === "failed" && download.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl"
        >
          <div className="flex items-center gap-2 text-red-300 text-sm">
            <FiXCircle className="text-red-400" />
            <span className="font-semibold">Error:</span>
            <span>{download.error}</span>
          </div>
        </motion.div>
      )}

      {/* Informations de succès */}
      {download.stage === "completed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded-xl"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-green-300">
              <FiCheckCircle className="text-green-400 text-lg" />
              <span className="font-semibold">Installation completed</span>
            </div>
            {download.totalTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 rounded-lg">
                <FiClock className="text-green-400 text-xs" />
                <span className="text-green-400 font-medium">
                  {Math.floor(download.totalTime / 1000)}s
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EnhancedDownloadProgress;
