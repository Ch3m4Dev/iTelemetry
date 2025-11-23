const { app, BrowserWindow, globalShortcut, screen, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let win = null;
let ignoreMouse = true;
let pyProc = null;
let manualShow = false;
let isRunningIRacing = false; // <-- viene del renderer

const isDev = !app.isPackaged;
const configPath = path.join(__dirname, "config.json");

//
// ---------------- CONFIG ----------------
//
function loadOverlayConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, "utf8")); }
  catch { return {}; }
}

function saveOverlayConfig(cfg) {
  try { fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2)); }
  catch (e) { console.error("Error guardando config:", e); }
}

function getDefaultPosition(width, height) {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: Math.round((sw - width) / 2),
    y: Math.round(sh - height - 40)
  };
}

//
// ----------- PYTHON PATHS -----------
//
function getPythonPaths() {
  if (isDev) {
    return {
      pythonPath: path.join(__dirname, "..", "python", "python.exe"),
      irbridgePath: path.join(__dirname, "..", "irbridge.py"),
      pythonCwd: path.join(__dirname, "..")
    };
  }

  return {
    pythonPath: path.join(process.resourcesPath, "python", "python.exe"),
    irbridgePath: path.join(process.resourcesPath, "irbridge.py"),
    pythonCwd: process.resourcesPath
  };
}

//
// -------------- CREAR VENTANA PRINCIPAL --------------
//
function createWindow() {

  //
  // ---- LANZAR IRBRIDGE ----
  //
  const { pythonPath, irbridgePath, pythonCwd } = getPythonPaths();
  pyProc = spawn(pythonPath, [irbridgePath], { cwd: pythonCwd, stdio: "ignore" });

  //
  // ---- CONFIG DEL OVERLAY ----
  //
  let cfg = loadOverlayConfig();
  const width = cfg.width ?? 920;
  const height = cfg.height ?? 260;

  const pos = (cfg.x !== undefined && cfg.y !== undefined)
    ? { x: cfg.x, y: cfg.y }
    : getDefaultPosition(width, height);

  //
  // ---------- OVERLAY PRINCIPAL ----------
  //
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (isDev) win.webContents.openDevTools({ mode: "detach" });

  win.loadFile(path.join(__dirname, "index.html"));

  //
  // ---- GUARDADO DE POSICIÓN / TAMAÑO ----
  //
  win.on("move", () => {
    const [x, y] = win.getPosition();
    const cfg = loadOverlayConfig();
    cfg.x = x;
    cfg.y = y;
    saveOverlayConfig(cfg);
  });

  win.on("resize", () => {
    const [w, h] = win.getSize();
    const cfg = loadOverlayConfig();
    cfg.width = w;
    cfg.height = h;
    saveOverlayConfig(cfg);
  });

  //
  // -------- SHORTCUTS --------
  //
  globalShortcut.register("Control+Shift+O", () => {
    ignoreMouse = !ignoreMouse;

    if (ignoreMouse) {
      win.setIgnoreMouseEvents(true, { forward: true });
      win.setFocusable(false);
      win.setAlwaysOnTop(true);
      win.setSkipTaskbar(true);
    } else {
      win.setIgnoreMouseEvents(false);
      win.setFocusable(true);
      win.setAlwaysOnTop(false);
      win.setSkipTaskbar(false);
    }

    win.webContents.send("ignore-changed", ignoreMouse);
  });

  globalShortcut.register("Control+Shift+Q", () => app.quit());

  //
  // ---- CTRL + SHIFT + S (solo cuando iRacing está apagado)
  //
  globalShortcut.register("Control+Shift+S", () => {
    if (!isRunningIRacing) {
      manualShow = !manualShow;
      if (manualShow) win.show();
      else win.hide();
    }
  });

  //
  // --------- IPC OVERLAY SHOW/HIDE ---------
  //
  ipcMain.on("overlay-show", () => win.show());
  ipcMain.on("overlay-hide", () => win.hide());

  //
  // ----- IPC: STATUS DE IRACING -----
  //
  ipcMain.on("iracing-running", (_, isRunning) => {
    isRunningIRacing = isRunning;

    if (isRunningIRacing) {
      manualShow = false;
    }
  });
}

//
// -------- SYSTEM TRAY --------
//
let tray = null;
function createTray() {
  const iconPath = path.join(__dirname, "..", "overlay", "tray_icon.ico");
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: "Cerrar Overlay", click: () => app.quit() }
  ]);

  tray.setToolTip("iTelemetry Overlay");
  tray.setContextMenu(contextMenu);
}

//
// ----------------- APP EVENTS -----------------
//
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (pyProc) pyProc.kill();
});

app.on("window-all-closed", () => app.quit());
