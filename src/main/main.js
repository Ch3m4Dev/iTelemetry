const { app, ipcMain, BrowserWindow, globalShortcut } = require("electron");
const { createOverlayWindow } = require("./windows/overlayInputs");
const { createTray } = require("./tray/tray");
const { setupAutoUpdate } = require("./update/update");
const overlayManager = require('./windows/overlayManager');
const { getActiveOverlays } = require("./utils/overlayUtils");
const { setupOverlaysIPC } = require("./ipc/overlaysIPC");

const path = require('path');
const fs = require('fs');

app.setName("iTelemetry");
app.setAppUserModelId("iTelemetry");

let ignoreMouse = true;
let manualShow = false;
let isRunningIRacing = false;

// ------------------------------------------------------------
// ------------------------ APP/READY --------------------------
// ------------------------------------------------------------

app.whenReady().then(() => {
  setupOverlaysIPC({ 
    ignoreMouse, 
    manualShow, 
    isRunningIRacing 
  });

  // Crear overlays, tray, IPC y ventana del manager
  createOverlayWindow();
  createTray();

  const manager = overlayManager;
  manager.create();

  if (app.isPackaged) {
    setupAutoUpdate();
  }

  // ------------------------------------------------------------
  // -------------------- SHORTCUTS GLOBALES --------------------
  // ------------------------------------------------------------

  // CTRL + SHIFT + O → toggle ignore mouse en TODOS los overlays activos
  globalShortcut.register("Control+Shift+O", () => {
    ignoreMouse = !ignoreMouse;
    const overlays = getActiveOverlays();
    overlays.forEach(win => {
      win.setIgnoreMouseEvents(ignoreMouse);
      win.webContents.send("ignore-changed", ignoreMouse);
    });
  });

  // CTRL + SHIFT + Q → cerrar app
  globalShortcut.register("Control+Shift+Q", () => {
    app.quit();
  });

  // CTRL + SHIFT + S → mostrar/ocultar overlays activos (si iRacing no está corriendo)
  globalShortcut.register("Control+Shift+S", () => {
    if (isRunningIRacing) return;

    manualShow = !manualShow;
    const overlays = getActiveOverlays();

    overlays.forEach(win => {
      if (!win || win.isDestroyed()) return;

      if (manualShow) {
        // si está minimizada, restaurar
        try {
          if (win.isMinimized && win.isMinimized()) win.restore();
        } catch (e) {}

        // Si el webContents aún carga, escuchar ready-to-show para asegurar que se muestre
        try {
          const wc = win.webContents;
          if (wc && wc.isLoading && wc.isLoading()) {
            // show cuando esté lista
            win.once('ready-to-show', () => {
              if (!win.isDestroyed()) {
                try { win.show(); } catch (e) {}
              }
            });
          } else {
            // intento inmediato
            try { win.show(); } catch (e) {}
          }

          // Fallback corto: si por cualquier razón sigue invisible, forzamos show tras 120ms
          setTimeout(() => {
            if (!win.isDestroyed() && !win.isVisible()) {
              try { win.show(); } catch (e) {}
            }
          }, 120);
        } catch (e) {
          // noop
        }
      } else {
        try { win.hide(); } catch (e) {}
      }
    });
  });


});



// Limpiar shortcuts al cerrar app
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Cierre total si todas las ventanas cierran
app.on("window-all-closed", () => app.quit());
