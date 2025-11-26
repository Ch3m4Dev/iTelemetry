const { BrowserWindow } = require('electron');
const path = require('path');

class OverlayManager {
  constructor() {
    this.window = null;
  }

  create() {
    if (this.window) return this.window;

    this.window = new BrowserWindow({
      width: 900,
      height: 600,
      resizable: true,
      frame: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '..', '..', 'renderer', 'manager', 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    this.window.loadFile(
      path.join(__dirname, '..', '..', 'renderer', 'manager', 'index.html')
    );

    this.window.once('ready-to-show', () => {
      this.window.show();
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  show() {
    if (!this.window) return;
    this.window.show();
  }

  hide() {
    if (!this.window) return;
    this.window.hide();
  }

  toggle() {
    if (!this.window) return;
    this.window.isVisible() ? this.hide() : this.show();
  }
}

module.exports = OverlayManager;
