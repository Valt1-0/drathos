/**
 * Crash Reporter - Sends crash reports to a Discord webhook
 * Collects system info, recent logs, and error details
 */

import { app } from 'electron';
import os from 'os';
import logger from './logger.js';

// __DISCORD_WEBHOOK__ is injected at build time by electron-vite (declared in eslint.config.mjs)

class CrashReporter {
  constructor() {
    this.webhookUrl = typeof __DISCORD_WEBHOOK__ !== 'undefined' ? __DISCORD_WEBHOOK__ : '';
    this.appVersion = null;
    this.cooldown = new Map(); // Prevent spam: error signature -> last sent timestamp
    this.cooldownMs = 60_000; // 1 minute cooldown per unique error
  }

  /**
   * Initialize the crash reporter
   */
  initialize() {
    this.appVersion = app.getVersion();

    // Periodically clean up stale cooldown entries (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.cooldown) {
        if (now - timestamp > this.cooldownMs * 2) {
          this.cooldown.delete(key);
        }
      }
    }, 5 * 60_000);

    logger.info('[CrashReporter] Initialized');
  }

  /**
   * Cleanup resources (call on app shutdown)
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get a unique signature for an error to prevent spam
   */
  getErrorSignature(error) {
    const msg = typeof error === 'string' ? error : (error?.message || 'unknown');
    const stack = error?.stack?.split('\n').slice(0, 3).join('') || '';
    return `${msg}:${stack}`.substring(0, 200);
  }

  /**
   * Check if we should send this error (cooldown check)
   */
  shouldSend(signature) {
    const lastSent = this.cooldown.get(signature);
    if (lastSent && Date.now() - lastSent < this.cooldownMs) {
      return false;
    }
    this.cooldown.set(signature, Date.now());
    return true;
  }

  /**
   * Collect system information for the report
   */
  getSystemContext() {
    return {
      platform: `${process.platform} (${os.release()})`,
      arch: process.arch,
      memory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)}/${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB`,
      cpus: os.cpus().length,
      electron: process.versions.electron,
      node: process.version,
      uptime: `${(process.uptime() / 60).toFixed(0)} min`,
    };
  }

  /**
   * Format an error into a Discord embed
   */
  buildEmbed({ type, error, context, source }) {
    const sys = this.getSystemContext();
    const timestamp = new Date().toISOString();

    const errorMessage = typeof error === 'string'
      ? error
      : (error?.message || 'Unknown error');

    const errorStack = error?.stack
      ? error.stack.split('\n').slice(0, 8).join('\n')
      : null;

    const colorMap = {
      'uncaughtException': 0xFF0000,    // Red
      'unhandledRejection': 0xFF6600,   // Orange
      'renderer': 0xFFAA00,             // Yellow
      'manual': 0x3498DB,               // Blue
    };

    const fields = [
      { name: 'Type', value: `\`${type}\``, inline: true },
      { name: 'Source', value: `\`${source || 'main'}\``, inline: true },
      { name: 'Version', value: `\`${this.appVersion}\``, inline: true },
      { name: type === 'manual' ? 'Description' : 'Error', value: `\`\`\`\n${errorMessage.substring(0, 1000)}\n\`\`\``, inline: false },
    ];

    if (errorStack) {
      fields.push({
        name: 'Stack Trace',
        value: `\`\`\`js\n${errorStack.substring(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    if (context) {
      const contextStr = typeof context === 'string'
        ? context
        : JSON.stringify(context, null, 2);
      fields.push({
        name: 'Context',
        value: `\`\`\`json\n${contextStr.substring(0, 500)}\n\`\`\``,
        inline: false,
      });
    }

    fields.push({
      name: 'System',
      value: `${sys.platform} | ${sys.arch} | RAM: ${sys.memory} | ${sys.cpus} CPUs | Electron ${sys.electron} | Uptime: ${sys.uptime}`,
      inline: false,
    });

    // Get recent error logs
    const recentLogs = logger.getRecentLogs(15);
    if (recentLogs) {
      const errorLogs = recentLogs
        .split('\n')
        .filter(l => l.includes('[ERROR]') || l.includes('[WARN]'))
        .slice(-5)
        .join('\n');

      if (errorLogs.trim()) {
        fields.push({
          name: 'Recent Errors',
          value: `\`\`\`\n${errorLogs.substring(0, 500)}\n\`\`\``,
          inline: false,
        });
      }
    }

    const title = type === 'manual' ? 'Drathos Bug Report' : 'Drathos Crash Report';
    const desc = type === 'manual'
      ? `Bug report from user`
      : `**${type}** in **${source || 'main process'}**`;

    const embed = {
      title,
      description: desc,
      color: colorMap[type] || 0xFF0000,
      fields,
      timestamp,
      footer: {
        text: `Drathos v${this.appVersion}`,
      },
    };

    // Discord embed limit: 6000 chars total. Truncate fields if needed.
    const totalLength = () => fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0)
      + (embed.title?.length || 0) + (embed.description?.length || 0) + (embed.footer?.text?.length || 0);

    while (totalLength() > 5800 && fields.length > 4) {
      fields.pop();
    }

    return { embeds: [embed] };
  }

  /**
   * Send a crash report to Discord webhook
   */
  async send({ type, error, context, source }) {
    if (!this.webhookUrl) return;

    const signature = this.getErrorSignature(error);
    if (!this.shouldSend(signature)) {
      logger.debug('[CrashReporter] Skipped (cooldown)', { signature: signature.substring(0, 50) });
      return;
    }

    try {
      const payload = this.buildEmbed({ type, error, context, source });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn('[CrashReporter] Discord webhook failed', {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (err) {
      // Don't let crash reporter crash the app
      logger.warn('[CrashReporter] Failed to send report', { error: err.message });
    }
  }

  /**
   * Report an uncaught exception from the main process
   */
  async reportUncaughtException(error) {
    await this.send({
      type: 'uncaughtException',
      error,
      source: 'main',
    });
  }

  /**
   * Report an unhandled promise rejection from the main process
   */
  async reportUnhandledRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    await this.send({
      type: 'unhandledRejection',
      error,
      source: 'main',
    });
  }

  /**
   * Report an error from the renderer process
   */
  async reportRendererError({ error, componentStack, context }) {
    await this.send({
      type: 'renderer',
      error: typeof error === 'string' ? { message: error, stack: componentStack } : error,
      context,
      source: 'renderer',
    });
  }

  /**
   * Manually report an error (from bug report button, etc.)
   */
  async reportManual({ description, error, context }) {
    await this.send({
      type: 'manual',
      error: error || { message: description },
      context: { userDescription: description, ...context },
      source: 'user',
    });
  }
}

const crashReporter = new CrashReporter();

export default crashReporter;
