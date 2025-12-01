const { BrowserWindow, Notification, app } = require('electron');
const path = require('path');

let isQuitting = false;

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
    this.window.setMenuBarVisibility(false);
    this.window.on("close", (event) => {
      if (!isQuitting) {
        // NO estamos cerrando la app, solo la ventana → ocultar
        event.preventDefault();
        this.window.hide();

        if (Notification.isSupported()) {
          new Notification({
            title: "iTelemetry",
            body: "La aplicación sigue ejecutándose en segundo plano.",
          }).show();
        }
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
    if (!this.window) {
      this.create();
    }
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

// marcar cuando la app se está cerrando de verdad
app.on('before-quit', () => {
  isQuitting = true;
});

module.exports = new OverlayManager();
