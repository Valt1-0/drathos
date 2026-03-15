/**
 * Centralized logger for the main process
 * Handles logs in the console and in files with rotation
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';

class Logger {
  constructor() {
    this.logsDir = null;
    this.currentLogFile = null;
    this.maxLogFiles = 7; // Keep 7 days of logs
    this.maxLogSizeBytes = 10 * 1024 * 1024; // 10 MB par fichier
    this.initialized = false;
  }

  /**
   * Initializes the logging system
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create the logs folder in userData
      const userDataPath = app.getPath('userData');
      this.logsDir = path.join(userDataPath, 'logs');

      // Create the folder if it does not exist
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }

      // Set the current log file
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      this.currentLogFile = path.join(this.logsDir, `app-${today}.log`);

      // Clean up old logs
      await this.cleanOldLogs();

      this.initialized = true;
      this.info('[Logger] Initialized successfully', { logsDir: this.logsDir });
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
    }
  }

  /**
   * Removes log files that are too old
   */
  async cleanOldLogs() {
    try {
      const files = await fs.promises.readdir(this.logsDir);
      const logFiles = await Promise.all(
        files
          .filter(f => f.startsWith('app-') && f.endsWith('.log'))
          .map(async f => {
            const filePath = path.join(this.logsDir, f);
            const stat = await fs.promises.stat(filePath);
            return { name: f, path: filePath, time: stat.mtime.getTime() };
          })
      );

      logFiles.sort((a, b) => b.time - a.time);
      const filesToDelete = logFiles.slice(this.maxLogFiles);

      for (const file of filesToDelete) {
        try {
          await fs.promises.unlink(file.path);
          console.log(`[Logger] Deleted old log file: ${file.name}`);
        } catch (err) {
          console.error(`[Logger] Failed to delete ${file.name}:`, err);
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to clean old logs:', error);
    }
  }

  /**
   * Checks if the current log file is too large and creates a new one if needed
   */
  checkLogRotation() {
    if (!this.currentLogFile) return;

    try {
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.maxLogSizeBytes) {
          // Create a new file with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const today = new Date().toISOString().split('T')[0];
          this.currentLogFile = path.join(this.logsDir, `app-${today}-${timestamp}.log`);
        }
      }
    } catch (error) {
      console.error('[Logger] Failed to check log rotation:', error);
    }
  }

  /**
   * Writes a message to the log file
   */
  writeToFile(level, message, data) {
    if (!this.initialized || !this.currentLogFile) return;

    this.checkLogRotation();

    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    const logLine = `[${timestamp}] [${level}] ${message}${dataStr}\n`;

    try {
      fs.appendFileSync(this.currentLogFile, logLine, 'utf8');
    } catch (error) {
      console.error('[Logger] Failed to write to log file:', error);
    }
  }

  /**
   * DEBUG level log
   */
  debug(message, data = null) {
    console.debug(`[DEBUG] ${message}`, data || '');
    this.writeToFile('DEBUG', message, data);
  }

  /**
   * INFO level log
   */
  info(message, data = null) {
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile('INFO', message, data);
  }

  /**
   * WARN level log
   */
  warn(message, data = null) {
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile('WARN', message, data);
  }

  /**
   * ERROR level log
   */
  error(message, error = null, data = null) {
    console.error(`[ERROR] ${message}`, error || '', data || '');

    const errorData = {
      ...(data || {}),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null
    };

    this.writeToFile('ERROR', message, errorData);
  }

  /**
   * Retrieves the content of recent logs
   */
  getRecentLogs(lines = 100) {
    if (!this.currentLogFile || !fs.existsSync(this.currentLogFile)) {
      return '';
    }

    try {
      const content = fs.readFileSync(this.currentLogFile, 'utf8');
      const allLines = content.split('\n');
      const recentLines = allLines.slice(-lines);
      return recentLines.join('\n');
    } catch (error) {
      console.error('[Logger] Failed to read logs:', error);
      return '';
    }
  }

  /**
   * Retrieves system information for the bug report
   */
  getSystemInfo() {
    return {
      app: {
        name: app.getName(),
        version: app.getVersion(),
        path: app.getPath('exe')
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        osVersion: os.release(),
        totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        cpus: os.cpus().length,
        uptime: `${(os.uptime() / 3600).toFixed(2)} hours`
      },
      node: {
        version: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome
      }
    };
  }

  /**
   * Exports a complete bug report
   */
  async exportBugReport() {
    try {
      const systemInfo = this.getSystemInfo();
      const recentLogs = this.getRecentLogs(500);

      const report = {
        timestamp: new Date().toISOString(),
        system: systemInfo,
        logs: recentLogs
      };

      const reportPath = path.join(this.logsDir, `bug-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

      this.info('[Logger] Bug report exported', { reportPath });
      return reportPath;
    } catch (error) {
      this.error('[Logger] Failed to export bug report', error);
      return null;
    }
  }
}

// Instance singleton
const logger = new Logger();

export default logger;
