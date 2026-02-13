import React, { useState, useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import {
  FiDownload,
  FiPackage,
  FiCheckCircle,
  FiXCircle,
  FiZap,
  FiClock,
  FiPauseCircle,
  FiPlayCircle,
  FiX,
} from "react-icons/fi";
import { useTheme } from "../contexts/themeContext";
import { useTranslation } from "react-i18next";

const EnhancedDownloadProgress = ({ download, onCancel, onPause }) => {
  const { isLight, getTextClass } = useTheme();
  const { t } = useTranslation();
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
        return "bg-gradient-primary";
      case "downloading":
        return "bg-gradient-to-r from-success to-success";
      case "extracting":
        return "bg-gradient-to-r from-warning to-warning";
      case "finalizing":
        return "bg-gradient-secondary";
      case "paused":
        return "bg-gradient-to-r from-warning to-warning";
      case "completed":
        return "bg-gradient-to-r from-success to-success";
      case "failed":
      case "cancelled":
        return "bg-gradient-to-r from-error to-error";
      default:
        return "bg-gradient-to-r from-text-secondary to-text-secondary";
    }
  };

  // Icônes par stage
  const getStageIcon = (stage) => {
    switch (stage) {
      case "preparing":
        return <FiDownload className="text-primary" />;
      case "downloading":
        return <FiDownload className="text-success animate-bounce" />;
      case "extracting":
        return <FiPackage className="text-warning" />;
      case "finalizing":
        return <FiZap className="text-secondary" />;
      case "paused":
        return <FiPauseCircle className="text-warning" />;
      case "completed":
        return <FiCheckCircle className="text-success" />;
      case "failed":
      case "cancelled":
        return <FiXCircle className="text-error" />;
      default:
        return <FiClock className="text-text-secondary" />;
    }
  };

  // Messages dynamiques
  const getStageMessage = (stage) => {
    switch (stage) {
      case "preparing":
        return t("downloads.stagePreparing");
      case "downloading":
        return t("downloads.stageDownloading");
      case "extracting":
        return t("downloads.stageExtracting");
      case "finalizing":
        return t("downloads.stageFinalizing");
      case "paused":
        return t("downloads.stagePaused");
      case "completed":
        return t("downloads.stageCompleted");
      case "failed":
        return t("downloads.stageFailed");
      case "cancelled":
        return t("downloads.stageCancelled");
      default:
        return t("downloads.stageWaiting");
    }
  };

  // Border color selon le stage
  const getBorderColor = (stage) => {
    switch (stage) {
      case "preparing":
        return "border-primary/50";
      case "downloading":
        return "border-success/50";
      case "extracting":
        return "border-warning/50";
      case "finalizing":
        return "border-secondary/50";
      case "paused":
        return "border-warning/50";
      case "completed":
        return "border-success/50";
      case "failed":
      case "cancelled":
        return "border-error/50";
      default:
        return "border-border";
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden backdrop-blur-sm rounded-2xl p-6 border ${getBorderColor(
        download.stage
      )} shadow-xl hover:shadow-2xl transition-all duration-300 bg-surface`}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Header avec image et infos de base */}
      <div className="relative z-10 flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border bg-background-secondary border-border">
          <img
            src={download.image}
            alt="Cover"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {/* Stage icon overlay */}
          <div className="absolute top-1 right-1 w-8 h-8 backdrop-blur-sm rounded-lg flex items-center justify-center border bg-surface/80 border-border">
            {getStageIcon(download.stage)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-bold text-lg truncate ${getTextClass('primary')}`}>
              {download.name}
            </h3>

            {/* Control buttons */}
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {/* Pause/Resume button - only during downloading */}
              {download.stage === "downloading" && onPause && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onPause(download)}
                  className="p-1.5 rounded-lg bg-warning/20 hover:bg-warning/30 transition-colors"
                  title={t("downloads.pause")}
                >
                  <FiPauseCircle className="text-warning text-lg" />
                </motion.button>
              )}
              {download.stage === "paused" && onPause && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onPause(download)}
                  className="p-1.5 rounded-lg bg-success/20 hover:bg-success/30 transition-colors"
                  title={t("downloads.resume")}
                >
                  <FiPlayCircle className="text-success text-lg" />
                </motion.button>
              )}

              {/* Cancel button - during downloading, paused, extracting, finalizing */}
              {["downloading", "paused", "extracting", "finalizing"].includes(download.stage) && onCancel && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onCancel(download)}
                  className="p-1.5 rounded-lg bg-error/20 hover:bg-error/30 transition-colors"
                  title={t("downloads.cancel")}
                >
                  <FiX className="text-error text-lg" />
                </motion.button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-sm font-medium ${getTextClass('secondary')}`}>
              {getStageMessage(download.stage)}
            </span>

            {download.stage === "downloading" && (
              <>
                <span className={getTextClass('secondary')}>•</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-success/20">
                  <FiZap className="text-success text-xs" />
                  <span className="text-success text-sm font-bold font-mono">
                    {displaySpeed.toFixed(1)} MB/s
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Progress percentage and ETA */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/20 rounded-lg">
              <span className="text-primary font-bold text-base">
                {animatedProgress.toFixed(0)}%
              </span>
            </div>

            {download.stage === "downloading" && displayETA !== "--:--" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/20 rounded-lg">
                <FiClock className="text-secondary text-xs" />
                <span className="text-secondary font-medium">
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
        <div className="w-full h-3 rounded-full overflow-hidden border bg-background-secondary border-border">
          {/* Progress principal avec gradient */}
          <motion.div
            className={`h-full ${getStageColor(
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
          <div className={`flex items-center gap-2 ${getTextClass('secondary')}`}>
            <FiDownload className="text-xs" />
            <span className="font-medium">
              {download.sizeDownloaded
                ? download.sizeDownloaded >= 1024
                  ? `${(download.sizeDownloaded / 1024).toFixed(2)} GB`
                  : `${download.sizeDownloaded.toFixed(0)} MB`
                : "0 MB"}
            </span>
          </div>

          {download.stage === "extracting" && download.extractedFiles && (
            <span className="text-warning font-medium">
              {t("downloads.filesCount", { extracted: download.extractedFiles, total: download.totalFiles })}
            </span>
          )}

          <div className={`flex items-center gap-2 ${getTextClass('secondary')}`}>
            <span className="font-medium">
              {download.totalSize
                ? download.totalSize >= 1024
                  ? `${(download.totalSize / 1024).toFixed(2)} GB`
                  : `${download.totalSize.toFixed(0)} MB`
                : t("downloads.calculating")}
            </span>
          </div>
        </div>
      </div>

      {/* Métriques détaillées (téléchargement) */}
      {download.stage === "downloading" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mt-4 pt-4 border-t flex justify-between text-xs border-border"
        >
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-secondary">
              <FiZap className="text-primary" />
              <span className={`font-medium ${getTextClass('primary')}`}>
                {displaySpeed.toFixed(2)} MB/s
              </span>
            </div>
            {download.instantSpeed && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-secondary">
                <span className="text-success">⚡</span>
                <span className={`font-medium ${getTextClass('primary')}`}>
                  {download.instantSpeed.toFixed(2)} MB/s
                </span>
              </div>
            )}
          </div>

          {download.elapsedTime && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-secondary">
              <FiClock className="text-secondary" />
              <span className={`font-medium ${getTextClass('primary')}`}>
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
          className="relative z-10 mt-4 p-3 rounded-xl border bg-error/10 border-error/30"
        >
          <div className={`flex items-center gap-2 text-sm ${getTextClass('primary')}`}>
            <FiXCircle className="text-error" />
            <span className="font-semibold">{t("downloads.errorLabel")}</span>
            <span>{download.error}</span>
          </div>
        </motion.div>
      )}

      {/* Informations de succès */}
      {download.stage === "completed" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 mt-4 p-3 rounded-xl border bg-success/10 border-success/30"
        >
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center gap-2 ${getTextClass('primary')}`}>
              <FiCheckCircle className="text-success text-lg" />
              <span className="font-semibold">{t("downloads.installationCompleted")}</span>
            </div>
            {download.totalTime && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-success/20">
                <FiClock className="text-success text-xs" />
                <span className="text-success font-medium">
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

// Fonction de comparaison personnalisée pour React.memo
// Ne re-rend que si les propriétés pertinentes du download ont changé
const arePropsEqual = (prevProps, nextProps) => {
  const prev = prevProps.download;
  const next = nextProps.download;

  // Si l'un des deux est null/undefined
  if (!prev || !next) return prev === next;

  // Comparer uniquement les propriétés qui affectent le rendu
  return (
    prev.id === next.id &&
    prev.progress === next.progress &&
    prev.speed === next.speed &&
    prev.stage === next.stage &&
    prev.eta === next.eta &&
    prev.sizeDownloaded === next.sizeDownloaded &&
    prev.totalSize === next.totalSize &&
    prev.error === next.error &&
    prev.extractedFiles === next.extractedFiles &&
    prev.totalFiles === next.totalFiles &&
    prev.elapsedTime === next.elapsedTime &&
    prev.totalTime === next.totalTime &&
    prev.instantSpeed === next.instantSpeed &&
    prevProps.onCancel === nextProps.onCancel &&
    prevProps.onPause === nextProps.onPause
  );
};

// Exporter le composant mémorisé
export default memo(EnhancedDownloadProgress, arePropsEqual);
