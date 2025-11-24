// src/overlayWindow.js

const { BrowserWindow, globalShortcut, screen, ipcMain, app } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const { loadConfig, saveConfig } = require("./config");

let win = null;
let ignoreMouse = true;
let pyProc = null;
let manualShow = false;
let isRunningIRacing = false;

const isDev = !app.isPackaged;

// POSICIÓN POR DEFECTO
function getDefaultPosition(width, height) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((sw - width) / 2),
    y: Math.round(sh - height - 40)
  };
}

// PATHS DEL PYTHON
function getPythonPaths() {
  if (isDev) {
    return {
      pythonPath: path.join(__dirname, "..", "..", "python", "python.exe"),
      irbridgePath: path.join(__dirname, "..", "..", "irbridge.py"),
      pythonCwd: path.join(__dirname, "..", "..")
    };
  }

  return {
    pythonPath: path.join(process.resourcesPath, "python", "python.exe"),
    irbridgePath: path.join(process.resourcesPath, "irbridge.py"),
    pythonCwd: process.resourcesPath
  };
}


function createOverlayWindow() {
  // ---- LANZAR IRBRIDGE ----
  const { pythonPath, irbridgePath, pythonCwd } = getPythonPaths();

  console.log("PYTHON =", pythonPath);
  console.log("IRBRIDGE =", irbridgePath);
  console.log("CWD =", pythonCwd);

  pyProc = spawn(pythonPath, [irbridgePath], {
    cwd: pythonCwd,
    stdio: "ignore"
  });

  // ---- CONFIG DEL OVERLAY ----
  let cfg = loadConfig();

  const width = cfg.width ?? 920;
  const height = cfg.height ?? 260;

  const pos = (cfg.x !== undefined && cfg.y !== undefined)
    ? { x: cfg.x, y: cfg.y }
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
      preload: path.join(__dirname, "..", "renderer", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  // ---- GUARDAR POSICIÓN ----
  win.on("move", () => {
    const [x, y] = win.getPosition();
    const newCfg = loadConfig();
    newCfg.x = x;
    newCfg.y = y;
    saveConfig(newCfg);
    
    // enviar la nueva posicion a la interfaz de settings
    const payload = {
      x: Number(x),
      y: Number(y)
    };

    BrowserWindow.getAllWindows().forEach(win => {
      if (win.getTitle() === "Ajustes del Overlay") {
        win.webContents.send("overlay-updated", JSON.stringify(payload));
      }
    });
  });

  win.on("resize", () => {
    const [w, h] = win.getSize();
    const cfg = loadConfig();
    cfg.width = w;
    cfg.height = h;
    saveConfig(cfg);

    // update para settings
    // JSON plano
    const payload = {
      width: Number(w),
      height: Number(h)
    };

    BrowserWindow.getAllWindows().forEach(win => {
      if (win.getTitle() === "Ajustes del Overlay") {
        win.webContents.send("overlay-updated", JSON.stringify(payload));
      }
    });
  });

  // ------------ SHORTCUTS ------------
  globalShortcut.register("Control+Shift+O", () => {
    ignoreMouse = !ignoreMouse;

    if (ignoreMouse) win.setIgnoreMouseEvents(true);
    else win.setIgnoreMouseEvents(false);

    win.webContents.send("ignore-changed", ignoreMouse);
  });

  globalShortcut.register("Control+Shift+Q", () => {
    app.quit();
  });

  globalShortcut.register("Control+Shift+S", () => {
    if (!isRunningIRacing) {
      manualShow = !manualShow;
      if (manualShow) win.show();
      else win.hide();
    }
  });

  // ---------- IPC ----------
  ipcMain.on("overlay-show", () => win.show());
  ipcMain.on("overlay-hide", () => win.hide());

  ipcMain.on("iracing-state", (_, running) => {
    isRunningIRacing = !!running;
    if (isRunningIRacing) {
      manualShow = false;
    }
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
