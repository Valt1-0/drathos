import { useEffect, useState } from 'react';
import { useUpdate } from '../contexts/updateContext';
import { FiDownload, FiX, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

export default function UpdateModal() {
  const {
    updateStatus,
    updateInfo,
    downloadProgress,
    showUpdateModal,
    setShowUpdateModal,
    downloadAndInstall,
    quitAndInstall,
    skipVersion,
  } = useUpdate();

  const [isDownloading, setIsDownloading] = useState(false);

  // Auto-fermer le modal si le statut revient à idle
  useEffect(() => {
    if (updateStatus === 'idle' && showUpdateModal) {
      setShowUpdateModal(false);
    }
  }, [updateStatus, showUpdateModal, setShowUpdateModal]);

  if (!showUpdateModal) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadAndInstall();
    } catch (error) {
      console.error('Error downloading update:', error);
      setIsDownloading(false);
    }
  };

  const handleInstall = async () => {
    await quitAndInstall();
  };

  const handleSkip = () => {
    if (updateInfo?.version) {
      skipVersion(updateInfo.version);
    }
  };

  const handleClose = () => {
    setShowUpdateModal(false);
  };

  const formatBytes = (bytes) =>
    bytes ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : '0 B';

  const formatSpeed = (bytesPerSecond) =>
    bytesPerSecond ? `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s` : '0 B/s';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {updateStatus === 'downloaded' ? (
              <div className="p-2 bg-green-500/20 rounded-lg">
                <FiRefreshCw className="w-6 h-6 text-green-400" />
              </div>
            ) : updateStatus === 'downloading' ? (
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FiDownload className="w-6 h-6 text-blue-400 animate-pulse" />
              </div>
            ) : updateStatus === 'error' ? (
              <div className="p-2 bg-red-500/20 rounded-lg">
                <FiAlertCircle className="w-6 h-6 text-red-400" />
              </div>
            ) : (
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FiDownload className="w-6 h-6 text-blue-400" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-white">
                {updateStatus === 'downloaded'
                  ? 'Mise à jour prête'
                  : updateStatus === 'downloading'
                  ? 'Téléchargement...'
                  : 'Mise à jour disponible'}
              </h2>
              {updateInfo?.version && (
                <p className="text-sm text-gray-400">Version {updateInfo.version}</p>
              )}
            </div>
          </div>
          {updateStatus !== 'downloading' && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {updateStatus === 'available' && (
            <>
              <p className="text-gray-300 mb-4">
                Une nouvelle version de Drathos est disponible. Voulez-vous la télécharger
                maintenant ?
              </p>

              {updateInfo?.releaseNotes && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h3 className="text-sm font-semibold text-white mb-2">Notes de version</h3>
                  <div className="text-sm text-gray-400 max-h-32 overflow-y-auto">
                    {typeof updateInfo.releaseNotes === 'string' ? (
                      <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FiDownload className="w-4 h-4" />
                  Télécharger
                </button>
                <button
                  onClick={handleSkip}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Ignorer
                </button>
              </div>
            </>
          )}

          {updateStatus === 'downloading' && downloadProgress && (
            <>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Progression</span>
                  <span>{downloadProgress.percent?.toFixed(1) || 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                    style={{ width: `${downloadProgress.percent || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Téléchargé</p>
                  <p className="text-white font-medium">
                    {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Vitesse</p>
                  <p className="text-white font-medium">
                    {formatSpeed(downloadProgress.bytesPerSecond)}
                  </p>
                </div>
              </div>

              <p className="text-gray-400 text-sm mt-4 text-center">
                Merci de patienter pendant le téléchargement...
              </p>
            </>
          )}

          {updateStatus === 'downloaded' && (
            <>
              <p className="text-gray-300 mb-4">
                La mise à jour a été téléchargée avec succès. L'application va redémarrer
                pour l'installer.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Redémarrer maintenant
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </>
          )}

          {updateStatus === 'error' && (
            <>
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <p className="text-red-400 text-sm">
                  Une erreur s'est produite lors de la vérification ou du téléchargement de
                  la mise à jour.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
