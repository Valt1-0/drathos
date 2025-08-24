// src/renderer/src/pages/Download.jsx - Version Beast Mode 🚀

import React, { useState, useEffect } from "react";
import { useDownload } from "../contexts/downloadContext";
import EnhancedDownloadProgress from "../components/EnhancedDownloadProgress";

const Download = () => {
  const { downloads } = useDownload();
  const [stats, setStats] = useState({
    totalSpeed: 0,
    activeDownloads: 0,
    completedCount: 0,
    freeSpace: 0,
  });

  // Calcul des statistiques temps réel
  useEffect(() => {
    const activeDownloads = downloads.filter(
      (d) =>
        d.stage === "downloading" ||
        d.stage === "extracting" ||
        d.stage === "preparing"
    );

    const totalSpeed = activeDownloads.reduce(
      (sum, d) => sum + (d.speed || 0),
      0
    );

    const completedCount = downloads.filter(
      (d) => d.stage === "completed"
    ).length;

    setStats({
      totalSpeed,
      activeDownloads: activeDownloads.length,
      completedCount,
      freeSpace: 124, // TODO: Récupérer l'espace libre réel
    });
  }, [downloads]);

  // Groupement par statut
  const activeDownloads = downloads.filter((d) =>
    ["preparing", "downloading", "extracting", "finalizing"].includes(d.stage)
  );

  const completedDownloads = downloads.filter((d) => d.stage === "completed");
  const failedDownloads = downloads.filter((d) => d.stage === "failed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header avec stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Téléchargements
            </h1>
            <p className="text-gray-400 mt-2">
              Gestionnaire de téléchargements optimisé
            </p>
          </div>

          {/* Stats en temps réel */}
          <div className="flex gap-6 text-sm">
            <div className="bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700/50">
              <div className="text-gray-400">Vitesse totale</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.totalSpeed.toFixed(1)}{" "}
                <span className="text-sm">MB/s</span>
              </div>
            </div>

            <div className="bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700/50">
              <div className="text-gray-400">Actifs</div>
              <div className="text-2xl font-bold text-blue-400">
                {stats.activeDownloads}
              </div>
            </div>

            <div className="bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700/50">
              <div className="text-gray-400">Terminés</div>
              <div className="text-2xl font-bold text-purple-400">
                {stats.completedCount}
              </div>
            </div>

            <div className="bg-gray-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700/50">
              <div className="text-gray-400">Espace libre</div>
              <div className="text-2xl font-bold text-yellow-400">
                {stats.freeSpace} <span className="text-sm">GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Téléchargements actifs */}
      {activeDownloads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Téléchargements en cours ({activeDownloads.length})
          </h2>

          <div className="space-y-4">
            {activeDownloads.map((download) => (
              <EnhancedDownloadProgress key={download.id} download={download} />
            ))}
          </div>
        </div>
      )}

      {/* Téléchargements terminés */}
      {completedDownloads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Terminés ({completedDownloads.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedDownloads.map((download) => (
              <div
                key={download.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={download.image}
                      alt="Cover"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {download.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-green-400 text-sm">
                        ✅ Installé
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Téléchargements échoués */}
      {failedDownloads.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Échecs ({failedDownloads.length})
          </h2>

          <div className="space-y-3">
            {failedDownloads.map((download) => (
              <div
                key={download.id}
                className="bg-red-900/20 border border-red-700/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-700 rounded overflow-hidden">
                      <img
                        src={download.image}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h3 className="text-white font-medium">
                        {download.name}
                      </h3>
                      <p className="text-red-300 text-sm">
                        ❌ {download.error || "Erreur inconnue"}
                      </p>
                    </div>
                  </div>

                  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
                    Réessayer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {downloads.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">📥</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            Aucun téléchargement
          </h3>
          <p className="text-gray-500">Vos téléchargements apparaîtront ici</p>
        </div>
      )}

      {/* Footer avec infos */}
      <div className="mt-auto pt-8 border-t border-gray-700/50 text-sm text-gray-400">
        <div className="flex justify-between items-center">
          <div>
            Les téléchargements continuent en arrière-plan même si vous fermez
            cette page.
          </div>

          <div className="flex items-center gap-4">
            <span>🚀 Engine optimisé</span>
            <span>•</span>
            <span>📊 Métriques temps réel</span>
            <span>•</span>
            <span>⚡ Streaming avancé</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Download;
