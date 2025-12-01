const { ipcMain, BrowserWindow, screen } = require("electron");
const { loadConfig, saveConfig } = require("../config");
const { createOverlayWindow } = require("../windows/overlayInputs");
const { getActiveOverlays } = require("../utils/overlayUtils");

// Estas variables viven en main.js (Opción A)
// ignoreMouse
// manualShow
// isRunningIRacing

function setupOverlaysIPC(state) {

  const { ignoreMouse, manualShow, isRunningIRacing } = state;

  // ------------------------------------------------------------
  // manager:getOverlayState
  // ------------------------------------------------------------
  ipcMain.handle('manager:getOverlayState', (event, overlayName) => {
    const cfg = loadConfig();
    const overlays = cfg.overlays || {};
    const overlay = overlays[overlayName] || {};

    return {
      enabled: !!overlay.enabled,
      config: overlay.config || {}
    };
  });

  // ------------------------------------------------------------
  // manager:toggleOverlay
  // ------------------------------------------------------------
  ipcMain.on('manager:toggleOverlay', (event, overlayName, state) => {
    if (!overlayName) return;

    const cfg = loadConfig();
    if (!cfg.overlays) cfg.overlays = {};
    if (!cfg.overlays[overlayName]) cfg.overlays[overlayName] = { enabled: false, config: {} };

    cfg.overlays[overlayName].enabled = !!state;
    saveConfig(cfg);

    // Si apagamos overlay -> cerrarlo
    if (!state) {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && win.webContents.getURL().includes(`renderer/overlays/${overlayName}`)) {
          win.close();
        }
      });
      return;
    }

    // Si lo encendemos -> crearlo si no existe
    let exists = BrowserWindow.getAllWindows().some(win =>
      win && win.webContents.getURL().includes(`renderer/overlays/${overlayName}`)
    );

    if (!exists) {
      if (overlayName === "inputs") createOverlayWindow();
      // futuros overlays irían aquí
    }
  });

  // ------------------------------------------------------------
  // manager:selectOverlay
  // ------------------------------------------------------------
  ipcMain.on('manager:selectOverlay', (event, overlayName) => {
    const cfg = loadConfig();
    const overlayCfg =
      (cfg.overlays && cfg.overlays[overlayName] && cfg.overlays[overlayName].config)
      || {};

    event.sender.send('manager:overlayConfig', overlayName, overlayCfg);
  });

  // ------------------------------------------------------------
  // manager:updateOverlayConfig
  // ------------------------------------------------------------
  ipcMain.on("manager:updateOverlayConfig", (event, overlayName, newConfig) => {
    const cfg = loadConfig();
    if (!cfg.overlays) cfg.overlays = {};
    if (!cfg.overlays[overlayName]) cfg.overlays[overlayName] = { enabled: true, config: {} };

    cfg.overlays[overlayName].config = {
      ...cfg.overlays[overlayName].config,
      ...newConfig
    };

    saveConfig(cfg);

    // Real time update solo para inputs por ahora
    BrowserWindow.getAllWindows().forEach(win => {
      const normalized = win.webContents.getURL().replace(/\\/g, "/").toLowerCase();
      if (normalized.includes("renderer/overlays/inputs")) {
        win.webContents.send("overlay:config-update", newConfig);
      }
    });
  });

  // ------------------------------------------------------------
  // manager:centerOverlay
  // ------------------------------------------------------------
  ipcMain.on("manager:centerOverlay", (event, overlayName) => {

    const cfg = loadConfig();
    if (!cfg.overlays || !cfg.overlays[overlayName]) return;

    const w = cfg.overlays[overlayName].config.width ?? 920;
    const h = cfg.overlays[overlayName].config.height ?? 260;

    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

    const x = Math.round((sw - w) / 2);
    const y = Math.round((sh * 0.7) - (h / 2));

    cfg.overlays[overlayName].config.x = x;
    cfg.overlays[overlayName].config.y = y;
    saveConfig(cfg);

    BrowserWindow.getAllWindows().forEach(win => {
      const normalized = win.webContents.getURL().replace(/\\/g, "/").toLowerCase();
      if (normalized.includes(`renderer/overlays/${overlayName}`)) {
        win.setPosition(x, y);
      }
    });

    // Actualizar Manager UI
    BrowserWindow.getAllWindows().forEach(win => {
      if (win.getTitle() === "Overlay Manager") {
        win.webContents.send("manager:update-overlay-fields", { x, y });
      }
    });
  });

  // ------------------------------------------------------------
  // iracing-state
  // ------------------------------------------------------------
  ipcMain.on("iracing-state", (_, running) => {

    state.isRunningIRacing = !!running;

    const cfg = loadConfig();
    const overlays = getActiveOverlays();

    // iRacing ARRANCA
    if (state.isRunningIRacing) {
      state.manualShow = false;

      overlays.forEach(win => {

        const url = win.webContents.getURL().replace(/\\/g, "/").toLowerCase();
        const match = url.match(/renderer\/overlays\/([^\/]+)/);
        const overlayName = match ? match[1] : null;

        if (!overlayName) return;

        if (cfg.overlays?.[overlayName]?.enabled) {
          win.show();
        }
      });

      return;
    }

    // iRacing SE CIERRA
    state.manualShow = false;
    overlays.forEach(win => win.hide());
  });
}

module.exports = {
  setupOverlaysIPC
};
