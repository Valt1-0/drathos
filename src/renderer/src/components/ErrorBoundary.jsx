import { Component } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';
import { ThemeContext } from '../contexts/themeContext';
import { useTranslation } from 'react-i18next';
import logger from '../services/logger';

class ErrorBoundaryClass extends Component {
  static contextType = ThemeContext;
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[ErrorBoundary] Component error:', error, errorInfo);
    // Mark error so global handler in main.jsx skips it (avoid double reporting)
    try { error._handledByBoundary = true; } catch {}
    this.setState({
      error,
      errorInfo,
    });

    // Log to service if available
    if (window.api?.logger) {
      window.api.logger.log({
        level: 'error',
        message: '[ErrorBoundary] Component crash',
        data: {
          error: { message: error.toString(), stack: error.stack },
          context: { componentStack: errorInfo.componentStack },
        },
      });
    }

    // Send crash report to Discord webhook
    if (window.api?.crashReport) {
      window.api.crashReport.send({
        error: { message: error.toString(), stack: error.stack },
        componentStack: errorInfo.componentStack,
        context: { url: window.location.href },
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    const { isLight, getTextClass } = this.context || {};
    const { t } = this.props;

    if (this.state.hasError) {
      return (
        <div className={`h-screen w-screen flex items-center justify-center p-6 ${
          isLight
            ? 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'
            : 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900'
        }`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full"
          >
            <div className={`backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 overflow-hidden ${
              isLight ? 'bg-white/90' : 'bg-slate-800/50'
            }`}>
              {/* Header */}
              <div className={`bg-gradient-to-r from-red-600/20 to-orange-600/20 p-8 border-b ${
                isLight ? 'border-red-500/30' : 'border-red-500/20'
              }`}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <FiAlertTriangle className="text-4xl text-red-400" />
                  </div>
                  <div>
                    <h1 className={`text-3xl font-bold mb-1 ${getTextClass?.('primary') || 'text-white'}`}>
                      {t('errors.somethingWrong')}
                    </h1>
                    <p className={`text-sm ${isLight ? 'text-red-600' : 'text-red-300'}`}>
                      {t('errors.unexpectedError')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              <div className="p-8 space-y-6">
                <div>
                  <h2 className={`text-lg font-semibold mb-3 ${getTextClass?.('primary') || 'text-white'}`}>
                    {t('errors.details')}
                  </h2>
                  <div className={`rounded-xl p-4 border ${
                    isLight
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-900/50 border-slate-700'
                  }`}>
                    <p className="text-red-400 font-mono text-sm break-all">
                      {this.state.error?.toString()}
                    </p>
                  </div>
                </div>

                {import.meta.env.DEV && this.state.errorInfo && (
                  <details className="group">
                    <summary className={`cursor-pointer transition-colors font-medium ${
                      isLight
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-slate-400 hover:text-white'
                    }`}>
                      {t('errors.componentStack')}
                    </summary>
                    <div className={`mt-3 rounded-xl p-4 border max-h-64 overflow-auto ${
                      isLight
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-slate-900/50 border-slate-700'
                    }`}>
                      <pre className={`text-xs whitespace-pre-wrap font-mono ${
                        isLight ? 'text-gray-700' : 'text-slate-300'
                      }`}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={this.handleReset}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-blue-500/30 ${
                      getTextClass?.('inverse') || 'text-white'
                    }`}
                  >
                    <FiRefreshCw className="text-lg" />
                    {t('errors.tryAgain')}
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isLight
                        ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    }`}
                  >
                    <FiHome className="text-lg" />
                    {t('errors.goHome')}
                  </button>
                </div>

                <p className={`text-center text-sm ${
                  isLight ? 'text-gray-500' : 'text-slate-500'
                }`}>
                  {t('errors.reportMessage')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper to provide theme context and translation
const ErrorBoundary = (props) => {
  const { t } = useTranslation();
  return <ErrorBoundaryClass {...props} t={t} />;
};

export default ErrorBoundary;
