// src/main/python/bridgeRunner.js
const path = require("path");
const { app } = require("electron");
const { spawn } = require("child_process");

let pyProc = null;
let _bridgeStarting = false;
let _bridgeAllowed = true;

// retry/backoff
let _retryDelay = 1000;
let _retryTimer = null;
const MAX_RETRY_DELAY = 10000;

function allowBridgeStart(state) {
  _bridgeAllowed = !!state;
}

function getPythonExecAndScript() {
  const root = app.getAppPath();
  const pyScript = path.join(root, "irbridge.py");

  // Windows virtualenv path (mantener compatibilidad)
  const pythonExec = path.join(root, ".venv", "Scripts", "python.exe");

  return { pythonExec, pyScript };
}

function _scheduleRestart() {
  if (!_bridgeAllowed) return;
  if (_retryTimer) return; // ya programado

  _retryTimer = setTimeout(() => {
    _retryTimer = null;
    // exponencial pero acotado
    _retryDelay = Math.min(MAX_RETRY_DELAY, Math.max(1000, _retryDelay * 1.5));
    startBridge();
  }, _retryDelay);
}

function _clearRestartSchedule() {
  if (_retryTimer) {
    clearTimeout(_retryTimer);
    _retryTimer = null;
  }
  _retryDelay = 1000;
}

function startBridge() {
  if (!_bridgeAllowed) {
    console.log("[bridge] start prevented (not allowed)");
    return;
  }
  if (_bridgeStarting || pyProc) return;

  const { pythonExec, pyScript } = getPythonExecAndScript();
  _bridgeStarting = true;

  try {
    console.log("[bridge] starting python bridge:", pythonExec, pyScript);

    pyProc = spawn(pythonExec, [pyScript], {
      cwd: path.dirname(pyScript),
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"] // escuchamos stderr para logs
    });

    _clearRestartSchedule();

    pyProc.stderr.setEncoding("utf8");
    pyProc.stderr.on("data", d => {
      const s = String(d).trim();
      if (s) console.warn("[bridge][stderr]", s);
    });

    pyProc.on("exit", (code, signal) => {
      console.log(`[bridge] python exited code=${code} signal=${signal}`);
      pyProc = null;
      _bridgeStarting = false;

      // Si _bridgeAllowed sigue true, intentamos reiniciar con backoff
      if (_bridgeAllowed) {
        console.log("[bridge] scheduling restart (bridge allowed)");
        _scheduleRestart();
      }
    });

    pyProc.on("error", err => {
      console.error("[bridge] spawn error:", err);
      pyProc = null;
      _bridgeStarting = false;
      if (_bridgeAllowed) _scheduleRestart();
    });
  } catch (e) {
    console.error("[bridge] start exception:", e);
    pyProc = null;
    _bridgeStarting = false;
    if (_bridgeAllowed) _scheduleRestart();
  } finally {
    // dejar _bridgeStarting gestionado por eventos; asegurar falso si algo falló temprano
    _bridgeStarting = false;
  }
}

function stopBridge() {
  // NO deshabilitamos future starts aquí. stopBridge debe parar el proceso,
  // pero permitir que cuando llegue un "iRacing abierto" se vuelva a llamar startBridge().
  if (pyProc && !pyProc.killed) {
    console.log("[bridge] stopping python...");
    try { pyProc.kill(); } catch (e) { console.warn("[bridge] kill failed:", e); }
  }
  pyProc = null;
  _clearRestartSchedule();
}

module.exports = {
  startBridge,
  stopBridge,
  allowBridgeStart
};
