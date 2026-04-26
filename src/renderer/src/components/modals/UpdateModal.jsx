import { useEffect, useState } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTranslation } from 'react-i18next';
import { useUpdate } from '../../contexts/updateContext';
import { useTheme } from '../../contexts/themeContext';
import logger from '../../services/logger';
import { FiDownload, FiX, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';

export default function UpdateModal() {
  const { t } = useTranslation();
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
  const { isLight, getTextClass, getGlassClass } = useTheme();

  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useFocusTrap(showUpdateModal);

  // Auto-close the modal if the status returns to idle
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
      logger.error('Error downloading update:', error);
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${isLight ? 'bg-black/30' : 'bg-black/60'}`}>
      <div ref={containerRef} role="dialog" aria-modal="true" className={`relative w-full max-w-md rounded-xl shadow-2xl ${isLight ? 'bg-white border-gray-200' : 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700'} border`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
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
              <h2 className={`text-xl font-semibold ${getTextClass('primary')}`}>
                {updateStatus === 'downloaded'
                  ? t('update.ready')
                  : updateStatus === 'downloading'
                  ? t('update.downloading')
                  : t('update.available')}
              </h2>
              {updateInfo?.version && (
                <p className={`text-sm ${getTextClass('secondary')}`}>{t('update.version', { version: updateInfo.version })}</p>
              )}
            </div>
          </div>
          {updateStatus !== 'downloading' && (
            <button
              onClick={handleClose}
              className={`p-1 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-700'}`}
              aria-label={t('common.close')}
            >
              <FiX className={`w-5 h-5 ${getTextClass('secondary')}`} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {updateStatus === 'available' && (
            <>
              <p className={`mb-4 ${getTextClass('primary')}`}>
                {t('update.description')}
              </p>

              {updateInfo?.releaseNotes && (
                <div className={`mb-4 p-3 rounded-lg border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/50 border-gray-700'}`}>
                  <h3 className={`text-sm font-semibold mb-2 ${getTextClass('primary')}`}>{t('update.releaseNotes')}</h3>
                  <div className={`text-sm max-h-32 overflow-y-auto ${getTextClass('secondary')}`}>
                    <p className="whitespace-pre-wrap">
                      {typeof updateInfo.releaseNotes === 'string'
                        ? updateInfo.releaseNotes
                        : JSON.stringify(updateInfo.releaseNotes)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={`flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${getTextClass('inverse')}`}
                >
                  <FiDownload className="w-4 h-4" />
                  {t('update.download')}
                </button>
                <button
                  onClick={handleSkip}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                >
                  {t('update.skip')}
                </button>
              </div>
            </>
          )}

          {updateStatus === 'downloading' && downloadProgress && (
            <>
              <div className="mb-4">
                <div className={`flex justify-between text-sm mb-2 ${getTextClass('secondary')}`}>
                  <span>{t('update.progress')}</span>
                  <span>{downloadProgress.percent?.toFixed(1) || 0}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-700'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                    style={{ width: `${downloadProgress.percent || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={getTextClass('secondary')}>{t('update.downloaded')}</p>
                  <p className={`font-medium ${getTextClass('primary')}`}>
                    {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                  </p>
                </div>
                <div>
                  <p className={getTextClass('secondary')}>{t('update.speed')}</p>
                  <p className={`font-medium ${getTextClass('primary')}`}>
                    {formatSpeed(downloadProgress.bytesPerSecond)}
                  </p>
                </div>
              </div>

              <p className={`text-sm mt-4 text-center ${getTextClass('secondary')}`}>
                {t('update.pleaseWait')}
              </p>
            </>
          )}

          {updateStatus === 'downloaded' && (
            <>
              <p className={`mb-4 ${getTextClass('primary')}`}>
                {t('update.success')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleInstall}
                  className={`flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${getTextClass('inverse')}`}
                >
                  <FiRefreshCw className="w-4 h-4" />
                  {t('update.restartNow')}
                </button>
                <button
                  onClick={handleClose}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                >
                  {t('update.later')}
                </button>
              </div>
            </>
          )}

          {updateStatus === 'error' && (
            <>
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <p className="text-red-400 text-sm">
                  {t('update.error')}
                </p>
              </div>

              <button
                onClick={handleClose}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
              >
                {t('update.close')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
