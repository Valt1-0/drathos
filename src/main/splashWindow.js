import { BrowserWindow } from 'electron';
import { join } from 'path';
import { is } from '@electron-toolkit/utils';
import logger from './utils/logger.js';

/**
 * Fenêtre splash simple et efficace
 */
export class SplashWindow {
  constructor(icon) {
    this.window = null;
    this.icon = icon;
  }

  create() {
    this.window = new BrowserWindow({
      width: 550,
      height: 350,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      center: true,
      show: false,
      icon: this.icon,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    // Charger la page splash
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/splash.html`);
    } else {
      this.window.loadFile(join(__dirname, '../renderer/splash.html'));
    }

    // Afficher quand prêt
    this.window.once('ready-to-show', () => {
      this.window.show();
      logger.info('[Splash] Window shown');
    });

    return this.window;
  }

  close() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
      logger.info('[Splash] Window closed');
    }
  }

  isVisible() {
    return this.window && !this.window.isDestroyed() && this.window.isVisible();
  }
}

export default SplashWindow;
