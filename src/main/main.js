const { app, ipcMain } = require("electron");
const { createOverlayWindow } = require("./windows/overlayInputs");
const { createTray } = require("./tray/tray");
const { setupSettingsIPC } = require("./ipc/settingsIPC");
const { setupAutoUpdate } = require("./update/update");
const OverlayManager = require('./windows/overlayManager');
const path = require('path');
const fs = require('fs');

let overlayManager;

// Ruta al config dentro de src
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo config.json:', err);
    return {};
  }
}

function writeConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
  } catch (err) {
    console.error('Error escribiendo config.json:', err);
  }
}

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  setupSettingsIPC();
  overlayManager = new OverlayManager();
  overlayManager.create();

  if (app.isPackaged) {
    setupAutoUpdate();
  }
});

/* IPC handlers para el Manager */

// Devuelve { enabled: boolean, config: object }
ipcMain.handle('manager:getOverlayState', (event, overlayName) => {
  const cfg = readConfig();
  const overlays = cfg.overlays || {};
  const overlay = overlays[overlayName] || {};
  return {
    enabled: !!overlay.enabled,
    config: overlay.config || {}
  };
});

// Actualiza enabled en config.json
ipcMain.on('manager:toggleOverlay', (event, overlayName, state) => {
  if (!overlayName) return;

  const cfg = readConfig();
  if (!cfg.overlays) cfg.overlays = {};
  if (!cfg.overlays[overlayName]) cfg.overlays[overlayName] = { enabled: false, config: {} };

  cfg.overlays[overlayName].enabled = !!state;
  writeConfig(cfg);

  // === Nueva lógica dinámica ===
  if (overlayName === "inputs") {
    const { createOverlayWindow } = require("./windows/overlayInputs");
    const { BrowserWindow } = require("electron");

    // Si está apagado → cerrar
    if (!state) {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && win.webContents.getURL().includes("renderer/overlays/inputs")) {
          win.close();
        }
      });
    }

    // Si está encendido → crear si no existe
    if (state) {
      let exists = BrowserWindow.getAllWindows().some(win =>
        win && win.webContents.getURL().includes("renderer/overlays/inputs")
      );

      if (!exists) {
        createOverlayWindow();
      }
    }
  }
});


// Cuando el manager selecciona un overlay, devolvemos su configuración (si existe)
ipcMain.on('manager:selectOverlay', (event, overlayName) => {
  const cfg = readConfig();
  const overlayCfg = (cfg.overlays && cfg.overlays[overlayName] && cfg.overlays[overlayName].config) || {};
  event.sender.send('manager:overlayConfig', overlayName, overlayCfg);
});

app.on("window-all-closed", () => app.quit());
