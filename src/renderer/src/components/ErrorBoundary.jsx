import { Component } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

class ErrorBoundary extends Component {
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
    console.error('[ErrorBoundary] Component error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to service if available
    if (window.logger) {
      window.logger.error('[ErrorBoundary] Component crash', {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
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
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl w-full"
          >
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 p-8 border-b border-red-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <FiAlertTriangle className="text-4xl text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                      Something went wrong
                    </h1>
                    <p className="text-red-300 text-sm">
                      The application encountered an unexpected error
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-3">
                    Error Details
                  </h2>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-red-400 font-mono text-sm break-all">
                      {this.state.error?.toString()}
                    </p>
                  </div>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="group">
                    <summary className="cursor-pointer text-slate-400 hover:text-white transition-colors font-medium">
                      Component Stack (Dev Only)
                    </summary>
                    <div className="mt-3 bg-slate-900/50 rounded-xl p-4 border border-slate-700 max-h-64 overflow-auto">
                      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-blue-500/30"
                  >
                    <FiRefreshCw className="text-lg" />
                    Try Again
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all duration-200"
                  >
                    <FiHome className="text-lg" />
                    Go Home
                  </button>
                </div>

                <p className="text-center text-slate-500 text-sm">
                  If this problem persists, please report it to the developers
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

export default ErrorBoundary;
