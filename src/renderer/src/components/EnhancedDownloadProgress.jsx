// src/renderer/src/components/EnhancedDownloadProgress.jsx - UI Beast Mode 🚀

import React, { useState, useEffect, useRef } from "react";
import { useDownload } from "../contexts/downloadContext";

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
        return "bg-blue-500";
      case "downloading":
        return "bg-green-500";
      case "extracting":
        return "bg-yellow-500";
      case "finalizing":
        return "bg-purple-500";
      case "completed":
        return "bg-green-600";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // Icônes par stage
  const getStageIcon = (stage) => {
    switch (stage) {
      case "preparing":
        return "⚙️";
      case "downloading":
        return "⬇️";
      case "extracting":
        return "📦";
      case "finalizing":
        return "✨";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  // Messages dynamiques
  const getStageMessage = (stage) => {
    switch (stage) {
      case "preparing":
        return "Préparation...";
      case "downloading":
        return "Téléchargement";
      case "extracting":
        return "Extraction";
      case "finalizing":
        return "Finalisation";
      case "completed":
        return "Installé";
      case "failed":
        return "Échec";
      default:
        return "En attente...";
    }
  };

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg">
      {/* Header avec image et infos de base */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={download.image}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">
            {download.name}
          </h3>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{getStageIcon(download.stage)}</span>
            <span className="text-gray-300 text-sm">
              {getStageMessage(download.stage)}
            </span>

            {download.stage === "downloading" && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-blue-400 text-sm font-mono">
                  {displaySpeed.toFixed(1)} MB/s
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right text-sm text-gray-400">
          <div className="font-bold text-white text-lg">
            {animatedProgress.toFixed(0)}%
          </div>
          {download.stage === "downloading" && (
            <div className="text-xs">ETA {displayETA}</div>
          )}
        </div>
      </div>

      {/* Progress Bar Animée */}
      <div className="relative">
        {/* Background */}
        <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
          {/* Progress principal */}
          <div
            className={`h-full transition-all duration-100 ease-out ${getStageColor(
              download.stage
            )}`}
            style={{ width: `${animatedProgress}%` }}
          />

          {/* Effet de brillance */}
          <div
            className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"
            style={{
              left: `${Math.max(0, animatedProgress - 20)}%`,
              display: download.stage === "downloading" ? "block" : "none",
            }}
          />
        </div>

        {/* Labels de progression */}
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>
            {download.sizeDownloaded
              ? `${download.sizeDownloaded.toFixed(1)} GB`
              : "0.0 GB"}
          </span>

          {download.stage === "extracting" && download.extractedFiles && (
            <span>
              {download.extractedFiles}/{download.totalFiles} fichiers
            </span>
          )}

          <span>
            {download.totalSize
              ? `${download.totalSize.toFixed(1)} GB`
              : "Calcul..."}
          </span>
        </div>
      </div>

      {/* Métriques détaillées (téléchargement) */}
      {download.stage === "downloading" && (
        <div className="mt-3 flex justify-between text-xs text-gray-400">
          <div className="flex gap-4">
            <span>📊 {displaySpeed.toFixed(1)} MB/s</span>
            {download.instantSpeed && (
              <span>⚡ {download.instantSpeed.toFixed(1)} MB/s</span>
            )}
          </div>

          {download.elapsedTime && (
            <span>⏱️ {Math.floor(download.elapsedTime / 1000)}s</span>
          )}
        </div>
      )}

      {/* Message d'erreur */}
      {download.stage === "failed" && download.error && (
        <div className="mt-3 p-2 bg-red-900/50 border border-red-700/50 rounded-lg">
          <div className="text-red-300 text-sm">
            <span className="font-semibold">Erreur:</span> {download.error}
          </div>
        </div>
      )}

      {/* Informations de succès */}
      {download.stage === "completed" && (
        <div className="mt-3 p-2 bg-green-900/50 border border-green-700/50 rounded-lg">
          <div className="text-green-300 text-sm flex justify-between">
            <span>✅ Installation terminée</span>
            {download.totalTime && (
              <span>Durée: {Math.floor(download.totalTime / 1000)}s</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDownloadProgress;
