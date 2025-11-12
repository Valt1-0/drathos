/**
 * Service de logging côté renderer
 * Envoie les logs au main process pour écriture dans fichier
 */

class Logger {
  constructor() {
    this.isAvailable = typeof window !== 'undefined' && window.api?.logger;
  }

  /**
   * Log niveau DEBUG
   */
  debug(message, data = null) {
    console.debug(`[DEBUG] ${message}`, data || '');

    if (this.isAvailable) {
      window.api.logger.log({
        level: 'debug',
        message,
        data
      }).catch(err => console.error('[Logger] Failed to send debug log:', err));
    }
  }

  /**
   * Log niveau INFO
   */
  info(message, data = null) {
    console.log(`[INFO] ${message}`, data || '');

    if (this.isAvailable) {
      window.api.logger.log({
        level: 'info',
        message,
        data
      }).catch(err => console.error('[Logger] Failed to send info log:', err));
    }
  }

  /**
   * Log niveau WARN
   */
  warn(message, data = null) {
    console.warn(`[WARN] ${message}`, data || '');

    if (this.isAvailable) {
      window.api.logger.log({
        level: 'warn',
        message,
        data
      }).catch(err => console.error('[Logger] Failed to send warn log:', err));
    }
  }

  /**
   * Log niveau ERROR
   */
  error(message, error = null, context = null) {
    console.error(`[ERROR] ${message}`, error || '', context || '');

    if (this.isAvailable) {
      window.api.logger.log({
        level: 'error',
        message,
        data: {
          error: error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : null,
          context
        }
      }).catch(err => console.error('[Logger] Failed to send error log:', err));
    }
  }

  /**
   * Récupère les logs récents
   */
  async getLogs(lines = 100) {
    if (!this.isAvailable) {
      return { success: false, error: 'Logger not available' };
    }

    try {
      return await window.api.logger.getLogs({ lines });
    } catch (error) {
      console.error('[Logger] Failed to get logs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Récupère les informations système
   */
  async getSystemInfo() {
    if (!this.isAvailable) {
      return { success: false, error: 'Logger not available' };
    }

    try {
      return await window.api.logger.getSystemInfo();
    } catch (error) {
      console.error('[Logger] Failed to get system info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exporte un rapport de bug
   */
  async exportBugReport(description, userEmail = '') {
    if (!this.isAvailable) {
      return { success: false, error: 'Logger not available' };
    }

    try {
      return await window.api.logger.exportBugReport({
        description,
        userEmail
      });
    } catch (error) {
      console.error('[Logger] Failed to export bug report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ouvre le dossier de logs
   */
  async openLogsFolder() {
    if (!this.isAvailable) {
      return { success: false, error: 'Logger not available' };
    }

    try {
      return await window.api.logger.openLogsFolder();
    } catch (error) {
      console.error('[Logger] Failed to open logs folder:', error);
      return { success: false, error: error.message };
    }
  }
}

// Instance singleton
const logger = new Logger();

export default logger;
