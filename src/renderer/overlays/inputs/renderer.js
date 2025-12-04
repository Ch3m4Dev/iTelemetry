// src/renderer/overlays/inputs/renderer.js
const canvas = document.getElementById("telemetryCanvas");
const panel = document.getElementById("panel");
const ctx = canvas.getContext("2d");

let samples = [];
let maxSamples = 300;
let lastTs = 0;

// paddings en CSS pixels (configurables)
const bottomPadding = 1;
const topPadding = 1;
const minGraphHeight = 28;

// Estado inicial: overlay activado
window.__overlayEnabled = true;

// ------------------------------
// CONFIG UPDATE (solo 1 handler)
// ------------------------------
if (window.overlayAPI) {
  window.overlayAPI.onConfigUpdate((cfg) => {
    if (cfg.enabled === false) {
      window.__overlayEnabled = false;
      if (ws) try { ws.close(); } catch(e){}
      ws = null;
      resetRetries();
      hideOverlaySafe();
      return;
    }

    if (cfg.enabled === true) {
      window.__overlayEnabled = true;
      resetRetries();
      connectWS();
    }

    applyOverlayConfig(cfg);
  });
}

// ---------- resize ----------
function resizeCanvasReal() {
  const rect = panel.getBoundingClientRect();
  const style = getComputedStyle(panel);

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;

  const cssW = Math.max(120, Math.round(rect.width - paddingLeft - paddingRight));
  const cssH = Math.max(40, Math.round(rect.height - paddingTop - paddingBottom));

  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { cssW, cssH };
}

let dims = resizeCanvasReal();
window.addEventListener("resize", () => { dims = resizeCanvasReal(); });

// --------------------------------
// WEBSOCKET + reconexión
// --------------------------------
let ws = null;
let wsConnected = false;
let lastMsgTime = 0;
let shownSinceOpen = false;
let unchangedCount = 0;

const UNCHANGED_THRESHOLD = 4;
const INACTIVITY_MS = 3000;

let retryCount = 0;
const MAX_RETRIES = 5;
let retryDelayMs = 1500;
let retryTimer = null;

function resetRetries() {
  retryCount = 0;
  retryDelayMs = 1500;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

function hideOverlaySafe() {
  try { window.api.overlayHide(); } catch(e){}
}

function showOverlaySafe() {
  try { window.api.overlayShow(); } catch(e){}
}

function setIracingRunning(state) {
  try { window.api.setIracingState(!!state); } catch(e){}
}

function clearSamples() {
  samples.length = 0;
  lastTs = 0;
  unchangedCount = 0;
}

function checkInactivity() {
  const now = Date.now();
  if (ws && wsConnected) {
    if (lastMsgTime && (now - lastMsgTime) > INACTIVITY_MS) {
      console.log("[overlay] inactivity timeout - closing socket");
      try { ws.close(); } catch(e){}
    }
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


// --------------------------------
// FIX REAL: connectWS funcional
// --------------------------------
function connectWS() {
  // No conectar si overlay está apagado
  if (!window.__overlayEnabled) return;

  // Evitar reconexiones infinitas
  if (retryCount >= MAX_RETRIES) return;

  // Si ya hay socket conectando o conectado → no hacer nada
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  // Limpiar socket viejo
  try {
    if (ws) {
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      ws = null;
    }
  } catch(e){}

  shownSinceOpen = false;
  lastMsgTime = 0;
  unchangedCount = 0;

  console.log("[renderer] connectWS called");  // DEBUG IMPORTANTE

  try {
    ws = new WebSocket("ws://localhost:3030");
  } catch (e) {
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    wsConnected = true;
    resetRetries();
    lastMsgTime = 0;
    console.log("[renderer] ws.onopen");  // DEBUG
  };

  ws.onmessage = (msg) => {
    lastMsgTime = Date.now();

    try {
      const data = JSON.parse(msg.data);
      if (!data || !data.ts) return;

      if (data.ts === lastTs) {
        unchangedCount++;
      } else {
        unchangedCount = 0;
      }

      if (!shownSinceOpen && data.ts !== lastTs) {
        shownSinceOpen = true;
        clearSamples();
        showOverlaySafe();
        setIracingRunning(true);
        console.log("[renderer] first new sample received");
      }

      if (unchangedCount >= UNCHANGED_THRESHOLD) {
        console.log("[renderer] UNCHANGED -> restart");
        hideOverlaySafe();
        setIracingRunning(false);
        clearSamples();
        try { ws.close(); } catch(e){}
        return;
      }

      if (data.ts !== lastTs) pushSample(data);

    } catch(e){}
  };

  ws.onclose = () => {
    wsConnected = false;
    console.log("[renderer] ws.onclose");
    hideOverlaySafe();
    setIracingRunning(false);
    clearSamples();

    try { ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; } catch(e){}
    ws = null;

    scheduleReconnect();
  };

  ws.onerror = () => {};
}


// ---------- push sample ----------
function pushSample(s) {
  if (!s.ts || s.ts === lastTs) return;
  lastTs = s.ts;
  samples.push(s);
  if (samples.length > maxSamples) samples.shift();
}


// ---------- draw loop ----------
function draw() {
  dims = resizeCanvasReal();
  const cssW = dims.cssW;
  const cssH = dims.cssH;

  const baselineY = cssH - bottomPadding;
  const available = baselineY - topPadding;
  const usableH = Math.max(minGraphHeight, available);

  ctx.clearRect(0, 0, cssW, cssH);

  // baseline
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.moveTo(0.5, baselineY + 0.5);
  ctx.lineTo(cssW - 0.5, baselineY + 0.5);
  ctx.stroke();

  const levels = [0.25, 0.5, 0.75];
  ctx.strokeStyle = "rgba(255,255,255,0.07)";

  levels.forEach(lvl => {
    const y = baselineY - lvl * usableH + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cssW, y);
    ctx.stroke();
  });

  if (samples.length > 1) {
    drawLine("throttle", "#00ff00", cssW, baselineY, usableH);
    drawLine("brake", "#ff0000", cssW, baselineY, usableH);
    drawLine("clutch", "#006eff", cssW, baselineY, usableH);
  }

  requestAnimationFrame(draw);
}

function drawLine(field, color, cssW, baselineY, usableH) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const count = samples.length;
  const denom = Math.max(1, maxSamples - 1);

  for (let i = 0; i < count; i++) {
    const s = samples[i];
    const x = (i / denom) * cssW;
    const v = Math.max(0, Math.min(1, Number(s[field] ?? 0)));
    const y = baselineY - v * usableH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}


// ------------ apply config ------------
function applyOverlayConfig(cfg) {
  if (cfg.opacity !== undefined) {
    const value = Number(cfg.opacity);
    document.body.style.opacity = value / 100;
  }
}

// ----------------------------
// ARRANQUE DEL OVERLAY
// ----------------------------
connectWS();   // ← OBLIGATORIO
draw();
