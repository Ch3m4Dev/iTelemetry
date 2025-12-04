// src/main/ipc/overlaysIPC.js
const { ipcMain, BrowserWindow, screen } = require("electron");
const { loadConfig, saveConfig } = require("../config");
const { createOverlayWindow } = require("../windows/overlayInputs");
const { createOverlayWindow: createDeltaOverlayWindow } = require("../windows/overlayDelta");
const { getActiveOverlays } = require("../utils/overlayUtils"); // se puede usar si hace falta
const { startBridge, stopBridge } = require("../python/bridgeRunner");

function setupOverlaysIPC(state) {
  const { ignoreMouse, manualShow, isRunningIRacing } = state;

  // ------------------------------------------------------------
  // manager:getOverlayState
  // ------------------------------------------------------------
  ipcMain.handle('manager:getOverlayState', (event, overlayName) => {
    try {
      const cfg = loadConfig();
      const overlays = cfg.overlays || {};
      const overlay = overlays[overlayName] || {};
      return {
        enabled: !!overlay.enabled,
        config: overlay.config || {}
      };
    } catch (err) {
      console.error('[overlaysIPC] manager:getOverlayState error:', err);
      return { enabled: false, config: {} };
    }
  });

  // ------------------------------------------------------------
  // manager:toggleOverlay
  // ------------------------------------------------------------
  ipcMain.on('manager:toggleOverlay', (event, overlayName, state) => {
    if (!overlayName) return;

    try {
      const cfg = loadConfig();
      if (!cfg.overlays) cfg.overlays = {};
      if (!cfg.overlays[overlayName]) cfg.overlays[overlayName] = { enabled: false, config: {} };

      cfg.overlays[overlayName].enabled = !!state;
      saveConfig(cfg);
    } catch (e) {
      console.error('[overlaysIPC] toggleOverlay saveConfig error', e);
      return;
    }

    // Si apagamos overlay -> cerrarlo (si existe)
    if (!state) {
      BrowserWindow.getAllWindows().forEach(win => {
        try {
          const url = (win && win.webContents && win.webContents.getURL && win.webContents.getURL()) || "";
          if (url.replace(/\\/g, "/").toLowerCase().includes(`renderer/overlays/${overlayName}`)) {
            win.close();
          }
        } catch (e) {
          // ignore
        }
      });
      return;
    }

    // Si lo encendemos -> delegar a la función del overlay (cada overlay debe garantizar singleton)
    try {
      if (overlayName === "inputs") {
        createOverlayWindow();
      } else if (overlayName === "delta") {
        createDeltaOverlayWindow();
      } else {
        // si se añaden nuevos overlays, se manejarán aquí
        console.warn('[overlaysIPC] toggleOverlay: overlay no manejado:', overlayName);
      }
    } catch (e) {
      console.error('[overlaysIPC] toggleOverlay create error', e);
    }
  });

  // ------------------------------------------------------------
  // manager:updateOverlayConfig
  // Guarda la configuración y aplica cambios en caliente a ventanas abiertas.
  // ------------------------------------------------------------
  ipcMain.on("manager:updateOverlayConfig", (event, overlayName, newConfig) => {
    if (!overlayName || !newConfig) return;

    // Delta NO usa opacidad
    if (overlayName === "delta") {
      delete newConfig.opacity;
    }

    let cfg;
    try {
      cfg = loadConfig();
      if (!cfg.overlays) cfg.overlays = {};
      if (!cfg.overlays[overlayName]) cfg.overlays[overlayName] = { enabled: false, config: {} };

      cfg.overlays[overlayName].config = {
        ...cfg.overlays[overlayName].config,
        ...newConfig
      };

      saveConfig(cfg);
    } catch (e) {
      console.error('[overlaysIPC] updateOverlayConfig save error', e);
      return;
    }

    // Aplicar en caliente a cualquier ventana abierta que corresponda al overlayName
    BrowserWindow.getAllWindows().forEach(win => {
      try {
        const url = (win && win.webContents && win.webContents.getURL && win.webContents.getURL()) || "";
        const normalized = url.replace(/\\/g, "/").toLowerCase();

        if (normalized.includes(`renderer/overlays/${overlayName}`)) {
          // Enviar evento renderer (si el renderer lo escucha, actuará)
          win.webContents.send(`overlay:config-update-${overlayName}`, newConfig);

          // Aplicar posición/tamaño/opacidad en main para reflejar inmediatamente
          const { x, y, width, height, opacity } = newConfig;

          if (typeof x === 'number' && typeof y === 'number') {
            try { win.setPosition(x, y); } catch (e) { /* ignore */ }
          }
          if (typeof width === 'number' && typeof height === 'number') {
            try { win.setSize(width, height); } catch (e) { /* ignore */ }
          }
          if (overlayName === "inputs" && typeof opacity === 'number') {
            try { win.setOpacity(opacity / 100); } catch (e) { /* ignore */ }
          }
        }
      } catch (e) {
        // ignore per-window errors
      }
    });
  });

  // ------------------------------------------------------------
  // manager:centerOverlay
  // ------------------------------------------------------------
  ipcMain.on("manager:centerOverlay", (event, overlayName) => {
    const cfg = loadConfig();

    // Seguridad básica
    if (!cfg.overlays || !cfg.overlays[overlayName]) {
      console.warn("Overlay desconocido:", overlayName);
      return;
    }

    // Inputs overlay
    if (overlayName === "inputs") {
      const win = createOverlayWindow(); // overlayInputs ensures singleton
      const oCfg = cfg.overlays.inputs.config ?? {};

      const { width = 400, height = 120 } = oCfg;
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

      const x = Math.round((sw - width) / 2);
      const y = Math.round(sh * 0.70 - height / 2);

      try { win.setPosition(x, y); } catch (e) { /* ignore */ }

      // Guardar en config
      oCfg.x = x;
      oCfg.y = y;
      cfg.overlays.inputs.config = oCfg;
      saveConfig(cfg);

      return;
    }

    // Delta overlay
    if (overlayName === "delta") {
      const win = createDeltaOverlayWindow();
      const oCfg = cfg.overlays.delta.config ?? {};

      const { width = 300, height = 80 } = oCfg;
      const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

      const x = Math.round((sw - width) / 2);
      const y = Math.round(sh * 0.66 - height / 2);

      try { win.setPosition(x, y); } catch (e) { /* ignore */ }

      // Guardar en config
      oCfg.x = x;
      oCfg.y = y;
      cfg.overlays.delta.config = oCfg;
      saveConfig(cfg);

      return;
    }

    // por defecto: no soportado
    console.warn('[overlaysIPC] centerOverlay unknown overlay:', overlayName);
  });

    // ------------------------------------------------------------
  // overlay-resize (renderer solicita redimensionar su propia ventana)
  // ------------------------------------------------------------
  ipcMain.on("overlay-resize", (event, w, h) => {
    try {
      const senderWC = event.sender;
      const bw = BrowserWindow.fromWebContents(senderWC);
      if (!bw || bw.isDestroyed()) return;

      const newW = Number(w) || bw.getSize()[0];
      const newH = Number(h) || bw.getSize()[1];

      try { bw.setSize(newW, newH); } catch (e) { /* ignore */ }
    } catch (e) {
      console.error("[overlaysIPC] overlay-resize error:", e);
    }
  });


  // ------------------------------------------------------------
  // iracing-state
  // ------------------------------------------------------------
  ipcMain.on("iracing-state", (_, running) => {
    state.isRunningIRacing = !!running;

    const cfg = loadConfig();
    const overlays = getActiveOverlays();

    // iRacing ABIERTO → arrancar bridge si no está activo
    if (state.isRunningIRacing) {
      startBridge();

      overlays.forEach(win => {
        try { win.show(); } catch (e) {}
      });

      return;
    }

    // iRacing CERRADO → parar bridge y ocultar overlays
    stopBridge();

    overlays.forEach(win => {
      try { win.hide(); } catch (e) {}
    });
  });

}

module.exports = {
  setupOverlaysIPC
};
