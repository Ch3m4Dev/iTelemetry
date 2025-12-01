const { BrowserWindow, globalShortcut, screen, ipcMain, app } = require("electron");
const path = require("path");
const { loadConfig, saveConfig } = require("../config.js");
const { startBridge } = require("../python/bridgeRunner");

let win = null;
let isRunningIRacing = false;

const isDev = !app.isPackaged;

function inputsOverlayEnabled() {
  const cfg = loadConfig();
  return cfg?.overlays?.inputs?.enabled !== false; // true por defecto
}


// POSICIÓN POR DEFECTO
function getDefaultPosition(width, height) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((sw - width) / 2),
    y: Math.round(sh - height - 40)
  };
}


function createOverlayWindow() {
  if(!inputsOverlayEnabled()){
    return null;
  }
  startBridge();
  // ---- CONFIG DEL OVERLAY ----
  let cfg = loadConfig();

  const oCfg = cfg?.overlays?.inputs?.config ?? {};
  const width = oCfg.width ?? 920;
  const height = oCfg.height ?? 260;

  const pos = (oCfg.x !== undefined && oCfg.y !== undefined)
    ? { x: oCfg.x, y: oCfg.y }
    : getDefaultPosition(width, height);

  // ---------- CREAR VENTANA ----------
  win = new BrowserWindow({
    width,
    height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: true,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "..", "..", "renderer", "overlays", "inputs", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setIgnoreMouseEvents(true);

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.loadFile(path.join(__dirname, "..", "..", "renderer", "overlays", "inputs", "index.html"));

  // ---- GUARDAR POSICIÓN ----
  win.on("move", () => {
    const [x, y] = win.getPosition();
    const cfg = loadConfig();

    if (!cfg.overlays) cfg.overlays = {};
    if (!cfg.overlays.inputs) cfg.overlays.inputs = { enabled: true, config: {} };
    if (!cfg.overlays.inputs.config) cfg.overlays.inputs.config = {};

    cfg.overlays.inputs.config.x = x;
    cfg.overlays.inputs.config.y = y;

    saveConfig(cfg);

    // Actualizar Manager en vivo
    BrowserWindow.getAllWindows().forEach(w => {
      if (w.getTitle() === "Overlay Manager") {
        w.webContents.send("manager:update-overlay-fields", {
          x, y
        });
      }
    });
  });


  win.on("resize", () => {
    const [w, h] = win.getSize();
    const cfg = loadConfig();

    if (!cfg.overlays) cfg.overlays = {};
    if (!cfg.overlays.inputs) cfg.overlays.inputs = { enabled: true, config: {} };
    if (!cfg.overlays.inputs.config) cfg.overlays.inputs.config = {};

    cfg.overlays.inputs.config.width = w;
    cfg.overlays.inputs.config.height = h;

    saveConfig(cfg);

    // Actualizar Manager en vivo
    BrowserWindow.getAllWindows().forEach(win => {
      if (win.getTitle() === "Overlay Manager") {
        win.webContents.send("manager:update-overlay-fields", {
          width: w,
          height: h
        });
      }
    });
  });

  return win;
}

function applyOverlayConfig(cfg) {
  if (!win) return;

  if (typeof cfg.x === "number" && typeof cfg.y === "number") {
    win.setPosition(cfg.x, cfg.y);
  }
  if (typeof cfg.width === "number" && typeof cfg.height === "number") {
    win.setSize(cfg.width, cfg.height);
  }
}

module.exports = {
  createOverlayWindow,
  applyOverlayConfig
};
