// ----------- ELEMENTOS UI -----------
const deltaEl = document.getElementById("delta-value");
const predEl  = document.getElementById("estimated-lap");
const panel   = document.getElementById("panel");
const microBar = document.getElementById("microsector-bar");

// ----------- VARIABLES -----------
let bestLap = null;
let prevLapDist = 0;

// microsectores
const MICRO_COUNT = 20;
let microBlocks = [];

function buildMicroBar() {
  microBar.innerHTML = "";
  microBlocks = [];

  for (let i = 0; i < MICRO_COUNT; i++) {
    const d = document.createElement("div");
    d.className = "micro";
    d.style.backgroundColor = "#444";
    d.dataset.lastColor = "#444";
    microBar.appendChild(d);
    microBlocks.push(d);
  }
}

function resetMicros() {
  for (const m of microBlocks) {
    m.style.backgroundColor = "#444";
    m.dataset.lastColor = "#444";
  }
}

function fmt(sec) {
  if (!sec || !isFinite(sec)) return "--:--.---";
  const ms = Math.round(sec * 1000);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mm = ms % 1000;
  return `${m}:${String(s).padStart(2,"0")}.${String(mm).padStart(3,"0")}`;
}

// ---------------------------------------------------
// WS + RECONNECT + freeze control (igual a Inputs)
// ---------------------------------------------------
let ws = null;
let wsConnected = false;
let lastMsgTime = 0;
let unchangedCount = 0;
let shownSinceOpen = false;
let lastTs = 0;
const UNCHANGED_THRESHOLD = 4;
const INACTIVITY_MS = 3000;

// reintentos igualados
let retryCount = 0;
const MAX_RETRIES = 5;
let retryDelayMs = 1500;
let retryTimer = null;

// overlay enabled igualado
window.__overlayEnabled = true;

// safe show/hide + iR state
function hideOverlaySafe() {
  try { window.api.overlayHide(); } catch(e){}
}

function showOverlaySafe() {
  try { window.api.overlayShow(); } catch(e){}
}

function setIracingRunning(state) {
  try { window.api.setIracingState(!!state); } catch(e){}
}

function resetRetries() {
  retryCount = 0;
  retryDelayMs = 1500;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

// inactivity watchdog igualado
function checkInactivity() {
  const now = Date.now();
  if (ws && wsConnected && lastMsgTime && (now - lastMsgTime) > INACTIVITY_MS) {
    try { ws.close(); } catch(e){}
  }
}
setInterval(checkInactivity, 1000);

function scheduleReconnect() {
  if (!window.__overlayEnabled) return;
  if (retryCount >= MAX_RETRIES) return;

  retryCount++;
  retryDelayMs = Math.min(24000, retryDelayMs * (retryCount === 1 ? 1 : 2));

  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectWS();
  }, retryDelayMs);
}

function cleanupWS() {
  try {
    if (!ws) return;
    ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
    ws = null;
  } catch(e){}
}

// ---------------------------------------------------
// CONFIG igualado a Inputs: enabled on/off
// ---------------------------------------------------
if (window.overlayAPI) {
  window.overlayAPI.onConfigUpdate((cfg) => {
    if (cfg.enabled === false) {
      window.__overlayEnabled = false;
      try { ws.close(); } catch(e){}
      cleanupWS();
      retryCount = MAX_RETRIES; // para no reconectar
      hideOverlaySafe();
      setIracingRunning(false);
      return;
    }

    if (cfg.enabled === true) {
      window.__overlayEnabled = true;
      resetRetries();
      connectWS();
      showOverlaySafe();
    }
  });

  // scale se mantiene tal cual estaba
  window.overlayAPI?.onDeltaConfigUpdate?.((cfg)=>{
    if (!cfg || cfg.scale === undefined) return;
    const s = Number(cfg.scale);
    if (s > 0) applyScale(s);
  });
}

// ---------------------------------------------------
// CONNECT igualado a Inputs: clean, guardas, retry, etc.
// ---------------------------------------------------
function connectWS() {
  if (!window.__overlayEnabled) return;
  if (retryCount >= MAX_RETRIES) return;

  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  cleanupWS();
  lastMsgTime = 0;
  unchangedCount = 0;
  lastTs = 0;

  try {
    ws = new WebSocket("ws://localhost:3030");
  } catch(e){
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    wsConnected = true;
    resetRetries();
    console.log("[renderer] ws.onopen");  // DEBUG
  };

  ws.onmessage = (msg) => {
    lastMsgTime = Date.now();

    let d;
    try { d = JSON.parse(msg.data); } catch(e){ return; }
    if (!d) return;

    // freeze control igualado Inputs
    const ts = d.ts ?? d.LapDistPct ?? null;
    if (ts === lastTs) {
      unchangedCount++;
    } else {
      unchangedCount = 0;
    }

    if (!shownSinceOpen && ts !== lastTs) {
      shownSinceOpen = true;
      setIracingRunning(true);
    }

    if (unchangedCount >= UNCHANGED_THRESHOLD) {
      hideOverlaySafe();
      setIracingRunning(false);
      try { ws.close(); } catch(e){}
      return;
    }

    if (ts !== null) lastTs = ts;

    handleDeltaData(d);
  };

  ws.onclose = () => {
    wsConnected = false;
    hideOverlaySafe();
    setIracingRunning(false);
    cleanupWS();
    scheduleReconnect();
  };

  ws.onerror = () => {};
}

// ---------------------------------------------------
// DELTA LOGIC original intacta (funcionalidad no tocada)
// ---------------------------------------------------
function handleDeltaData(d) {
  const pct = d.LapDistPct ?? 0;
  const lap = d.PlayerCarLap ?? 0;
  const lapCur = d.LapCurrentLapTime ?? null;

  const irDelta = d.LapDeltaToSessionBestLap;
  const best = d.LapBestLapTime;
  if (best && best > 0) bestLap = best;

  if (pct < prevLapDist) {
    resetMicros();
  }
  prevLapDist = pct;

  let delta = null;
  if (typeof irDelta === "number" && isFinite(irDelta)) {
    delta = irDelta;
  }

  if (delta !== null) {
    const v = delta;
    deltaEl.innerText = (v >= 0 ? "+" : "") + v.toFixed(3) + "s";
    deltaEl.style.color = (v < 0 ? "#00ff66" : (v > 0.2 ? "#ff4444" : "#ffffff"));
  } else {
    deltaEl.innerText = "+0.000s";
  }

  let est = null;
  if (bestLap && delta !== null) est = bestLap + delta;
  predEl.innerText = "Est. Lap: " + fmt(est);

  if (
    bestLap && pct > 0.01 && pct < 0.999 &&
    typeof delta === "number" &&
    microBlocks.length > 0
  ) {
    const idx = Math.floor(pct * MICRO_COUNT);
    if (idx >= 0 && idx < MICRO_COUNT) {

      let color = "yellow";
      if (delta < -0.05) color = "purple";
      else if (delta <= 0.08) color = "green";

      const block = microBlocks[idx];
      if (block && block.dataset.lastColor !== color) {
        block.style.backgroundColor = color;
        block.dataset.lastColor = color;
      }
    }
  }
}

// ---------------------------------------------------
// RESIZE (NO tocar, sólo integración con cambios)
// ---------------------------------------------------
let resizeTimer = null;
let lastSize = {w:0,h:0};

function requestResize(w,h){
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(()=>{
    try{
      window.api.resizeOverlay(w,h);
      lastSize = {w,h};
    } catch(e){}
  },60);
}

function applyScale(s){
  document.documentElement.style.setProperty("--scale", String(s));
  requestAnimationFrame(()=>{
    const r = panel.getBoundingClientRect();
    requestResize(Math.ceil(r.width), Math.ceil(r.height));
  });
}

// ---------------------------------------------------
// INIT (no romper, solo añadir conexión nueva)
// ---------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  buildMicroBar();
  const r = panel.getBoundingClientRect();
  requestResize(r.width, r.height);
  connectWS(); // sustituye connect() original pero misma función
});
