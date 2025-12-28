import { useState, useEffect } from 'react';
import { FiAlertTriangle, FiX, FiSend, FiFolder, FiInfo, FiCheck, FiAlertCircle } from 'react-icons/fi';
import logger from '../../services/logger';

const BugReportModal = ({ isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Charger les infos système au montage
      loadSystemInfo();
      setDescription('');
      setUserEmail('');
      setResult(null);
    }
  }, [isOpen]);

  const loadSystemInfo = async () => {
    const response = await logger.getSystemInfo();
    if (response.success) {
      setSystemInfo(response.systemInfo);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      setResult({
        success: false,
        message: 'Please describe the bug you encountered'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await logger.exportBugReport(description, userEmail);

      if (response.success) {
        setResult({
          success: true,
          message: 'Bug report created successfully!',
          reportPath: response.reportPath
        });

        logger.info('[BugReport] Report created', {
          hasEmail: !!userEmail,
          descriptionLength: description.length
        });

        // Fermer automatiquement après 3 secondes
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to create bug report'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while creating the report'
      });
      logger.error('[BugReport] Failed to submit', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLogsFolder = async () => {
    await logger.openLogsFolder();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center">
              <FiAlertTriangle className="w-5 h-5 text-error" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">Report a Bug</h2>
              <p className="text-sm text-text-secondary">Help us improve Drathos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center transition-colors text-text-secondary hover:text-text"
            disabled={loading}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Bug Description <span className="text-error">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe what happened, what you expected, and steps to reproduce..."
                className="w-full bg-surface text-text px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-error border border-border transition-all resize-none"
                rows={6}
                disabled={loading}
                required
              />
              <p className="text-xs text-text-secondary opacity-60 mt-1">
                Be as detailed as possible to help us fix the issue faster
              </p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-surface text-text px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-error border border-border transition-all"
                disabled={loading}
              />
              <p className="text-xs text-text-secondary opacity-60 mt-1">
                We'll only contact you for updates about this bug
              </p>
            </div>

            {/* System Info Toggle */}
            <div className="bg-surface rounded-lg p-4 border border-border">
              <button
                type="button"
                onClick={() => setShowSystemInfo(!showSystemInfo)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <FiInfo className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-text-secondary">
                    System Information
                  </span>
                </div>
                <span className="text-xs text-text-secondary opacity-60">
                  {showSystemInfo ? 'Hide' : 'Show'}
                </span>
              </button>

              {showSystemInfo && systemInfo && (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-text-secondary opacity-60">App Version:</span>
                      <span className="text-text-secondary ml-2">{systemInfo.app?.version}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary opacity-60">Platform:</span>
                      <span className="text-text-secondary ml-2">{systemInfo.system?.platform}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary opacity-60">OS Version:</span>
                      <span className="text-text-secondary ml-2">{systemInfo.system?.osVersion}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary opacity-60">Memory:</span>
                      <span className="text-text-secondary ml-2">{systemInfo.system?.freeMemory} / {systemInfo.system?.totalMemory}</span>
                    </div>
                  </div>
                  <p className="text-text-secondary opacity-60 mt-2">
                    This information will be automatically included in the report
                  </p>
                </div>
              )}
            </div>

            {/* Result Message */}
            {result && (
              <div className={`rounded-lg p-4 border ${
                result.success
                  ? 'bg-success/10 border-success/30 text-success'
                  : 'bg-error/10 border-error/30 text-error'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <FiCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{result.message}</p>
                    {result.reportPath && (
                      <p className="text-xs mt-1 opacity-75">
                        Report saved to: {result.reportPath}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-background/50">
          <button
            type="button"
            onClick={handleOpenLogsFolder}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/80 text-text rounded-lg transition-colors text-sm"
            disabled={loading}
          >
            <FiFolder className="w-4 h-4" />
            Open Logs Folder
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface/80 text-text rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-error hover:bg-error/80 disabled:bg-surface disabled:text-text-secondary text-white rounded-lg transition-colors font-medium"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <FiSend className="w-4 h-4" />
                  Send Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BugReportModal;
