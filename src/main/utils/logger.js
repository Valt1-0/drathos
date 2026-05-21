/**
 * Centralized logger for the main process
 * Handles logs in the console and in files with rotation
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';

const SENSITIVE_KEYS = new Set([
  'authorization', 'token', 'usertoken', 'password', 'secret',
  'apikey', 'api_key', 'bearer', 'accesstoken', 'refreshtoken',
]);

// Redact tokens embedded in string values (e.g. "Authorization: Bearer abc123")
const redactSensitiveString = (str) =>
  str
    .replace(/Bearer\s+[\w.\-/+=]+/gi, 'Bearer [REDACTED]')
    .replace(/(password|token|secret|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[REDACTED]');

class Logger {
  constructor() {
    this.logsDir = null;
    this.currentLogFile = null;
    this.maxLogFiles = 7;
    this.maxLogSizeBytes = 10 * 1024 * 1024;
    this.initialized = false;
    this._approxSizeBytes = 0;
    this._recentLines = [];
    this._maxRecentLines = 500;
  }

  sanitizeData(obj, depth = 0) {
    if (typeof obj === 'string') return redactSensitiveString(obj);
    if (!obj || typeof obj !== 'object' || depth > 5) return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitizeData(item, depth + 1));
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? '[REDACTED]'
        : this.sanitizeData(value, depth + 1);
    }
    return result;
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

      // Seed in-memory state from existing file (one-time read on startup)
      try {
        const content = await fs.promises.readFile(this.currentLogFile, 'utf8');
        this._approxSizeBytes = Buffer.byteLength(content, 'utf8');
        const lines = content.split('\n').filter(Boolean);
        this._recentLines = lines.slice(-this._maxRecentLines);
      } catch {
        this._approxSizeBytes = 0;
        this._recentLines = [];
      }

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
   * Checks if the current log file is too large and creates a new one if needed.
   * Uses in-memory byte counter — no I/O.
   */
  checkLogRotation() {
    if (!this.currentLogFile) return;
    if (this._approxSizeBytes > this.maxLogSizeBytes) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const today = new Date().toISOString().split('T')[0];
      this.currentLogFile = path.join(this.logsDir, `app-${today}-${timestamp}.log`);
      this._approxSizeBytes = 0;
    }
  }

  /**
   * Writes a message to the log file (non-blocking).
   */
  writeToFile(level, message, data) {
    if (!this.initialized || !this.currentLogFile) return;

    this.checkLogRotation();

    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(this.sanitizeData(data))}` : '';
    const logLine = `[${timestamp}] [${level}] ${message}${dataStr}\n`;

    this._approxSizeBytes += Buffer.byteLength(logLine, 'utf8');

    this._recentLines.push(logLine.trimEnd());
    if (this._recentLines.length > this._maxRecentLines) this._recentLines.shift();

    fs.promises.appendFile(this.currentLogFile, logLine, 'utf8').catch(err => {
      console.error('[Logger] Failed to write to log file:', err);
    });
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
   * Retrieves recent log lines from the in-memory buffer — no I/O.
   */
  getRecentLogs(lines = 100) {
    const count = Math.min(lines, this._recentLines.length);
    return this._recentLines.slice(-count).join('\n');
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
