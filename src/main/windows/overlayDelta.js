// src/main/windows/overlayDelta.js

const { BrowserWindow, screen, app } = require("electron");
const path = require("path");
const { loadConfig, saveConfig } = require("../config.js");

let win = null;
const isDev = !app.isPackaged;

// sensible base values only for initial creation if config missing
const BASE_WIDTH = 320;
const BASE_HEIGHT = 120;

function deltaOverlayEnabled() {
  const cfg = loadConfig();
  return cfg?.overlays?.delta?.enabled !== false;
}

function getDefaultPosition(scale = 1) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  const w = Math.round(BASE_WIDTH * scale);
  const h = Math.round(BASE_HEIGHT * scale);
  return {
    x: Math.round((sw - w) / 2),
    y: Math.round(sh * 0.58 - h / 2)
  };
}

function createOverlayWindow() {
  if (!deltaOverlayEnabled()) return null;

  try {
    if (win && !win.isDestroyed()) return win;
  } catch {
    win = null;
  }

  const cfg = loadConfig();
  const oCfg = cfg.overlays?.delta?.config ?? {};

  const width = typeof oCfg.width === "number" ? Math.round(oCfg.width) : Math.round(BASE_WIDTH);
  const height = typeof oCfg.height === "number" ? Math.round(oCfg.height) : Math.round(BASE_HEIGHT);
  const scale = Number(oCfg.scale ?? 1);

  const pos = (typeof oCfg.x === "number" && typeof oCfg.y === "number")
    ? { x: oCfg.x, y: oCfg.y }
    : getDefaultPosition(scale);

  win = new BrowserWindow({
    width,
    height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    resizable: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "..", "..", "renderer", "overlays", "delta", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setIgnoreMouseEvents(true);

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.loadFile(path.join(__dirname, "..", "..", "renderer", "overlays", "delta", "index.html"));
  win.hide();

  win.webContents.on("did-finish-load", () => {
    // Inform renderer of configured scale (renderer will measure & request resize)
    const cfg2 = loadConfig();
    const oCfg2 = cfg2.overlays?.delta?.config ?? {};
    const initialScale = Number(oCfg2.scale ?? 1);
    try { win.webContents.send("overlay:config-update-delta", { scale: initialScale }); } catch (e) {}
  });

  // Save move position
  win.on("move", () => {
    try {
      const [x, y] = win.getPosition();
      const cfg3 = loadConfig();
      if (!cfg3.overlays) cfg3.overlays = {};
      if (!cfg3.overlays.delta) cfg3.overlays.delta = { enabled: true, config: {} };
      if (!cfg3.overlays.delta.config) cfg3.overlays.delta.config = {};
      cfg3.overlays.delta.config.x = x;
      cfg3.overlays.delta.config.y = y;
      saveConfig(cfg3);
      BrowserWindow.getAllWindows().forEach(w => {
        const url = w.webContents.getURL().replace(/\\/g, "/").toLowerCase();
        if (url.includes("renderer/manager/index.html")) {
          w.webContents.send("manager:update-overlay-fields", { x, y });
        }
      });

    } catch (e) { /* ignore */ }
  });

  return win;
}

// applyOverlayConfig: when manager changes fields in hot, apply them.
// IMPORTANT: do NOT change size on 'scale' here; renderer will request real size.
function applyOverlayConfig(cfg) {
  if (!win) return;

  if (typeof cfg.x === "number" && typeof cfg.y === "number") {
    try { win.setPosition(cfg.x, cfg.y); } catch {}
  }

  // If manager explicitly sends width/height, apply them.
  if (typeof cfg.width === "number" && typeof cfg.height === "number") {
    try { win.setSize(Math.round(cfg.width), Math.round(cfg.height)); } catch {}
  }

  // If scale changes, forward to renderer (renderer will measure and request exact resize).
  if (typeof cfg.scale === "number") {
    try { win.webContents.send("overlay:config-update-delta", { scale: cfg.scale }); } catch {}
  }
}

module.exports = {
  createOverlayWindow,
  applyOverlayConfig
};
