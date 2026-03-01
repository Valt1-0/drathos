/**
 * Logger centralisé pour le main process
 * Gère les logs dans la console et dans des fichiers avec rotation
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import os from 'os';

class Logger {
  constructor() {
    this.logsDir = null;
    this.currentLogFile = null;
    this.maxLogFiles = 7; // Garder 7 jours de logs
    this.maxLogSizeBytes = 10 * 1024 * 1024; // 10 MB par fichier
    this.initialized = false;
  }

  /**
   * Initialise le système de logging
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Créer le dossier logs dans userData
      const userDataPath = app.getPath('userData');
      this.logsDir = path.join(userDataPath, 'logs');

      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(this.logsDir)) {
        fs.mkdirSync(this.logsDir, { recursive: true });
      }

      // Définir le fichier de log actuel
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      this.currentLogFile = path.join(this.logsDir, `app-${today}.log`);

      // Nettoyer les vieux logs
      await this.cleanOldLogs();

      this.initialized = true;
      this.info('[Logger] Initialized successfully', { logsDir: this.logsDir });
    } catch (error) {
      console.error('[Logger] Failed to initialize:', error);
    }
  }

  /**
   * Nettoie les fichiers de logs trop anciens
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
   * Vérifie si le fichier de log actuel est trop gros et crée un nouveau si nécessaire
   */
  checkLogRotation() {
    if (!this.currentLogFile) return;

    try {
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.maxLogSizeBytes) {
          // Créer un nouveau fichier avec timestamp
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
   * Écrit un message dans le fichier de log
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
   * Log niveau DEBUG
   */
  debug(message, data = null) {
    console.debug(`[DEBUG] ${message}`, data || '');
    this.writeToFile('DEBUG', message, data);
  }

  /**
   * Log niveau INFO
   */
  info(message, data = null) {
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile('INFO', message, data);
  }

  /**
   * Log niveau WARN
   */
  warn(message, data = null) {
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile('WARN', message, data);
  }

  /**
   * Log niveau ERROR
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
   * Récupère le contenu des logs récents
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
   * Récupère les informations système pour le rapport de bug
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
   * Exporte un rapport de bug complet
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
