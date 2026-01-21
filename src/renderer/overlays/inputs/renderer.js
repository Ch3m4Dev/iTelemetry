// src/renderer/overlays/inputs/renderer.js
const canvas = document.getElementById("telemetryCanvas");
const panel = document.getElementById("panel");
const middlePedals = document.getElementById("middle-pedals");
const rightGear = document.getElementById("right-gear");
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
  const rect = document.getElementById("left-wrap").getBoundingClientRect();
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
resizeOtherElements();

// ----------------------------------------
// AQUI AÑADIMOS EL MISMO MÉTODO DE RESIZE
// ----------------------------------------
function resizeOtherElements() {
  const rect = panel.getBoundingClientRect();
  const h = rect.height;

  // altura pedales → misma lógica: valores mínimos y máximos sin romper
  const pedalH = Math.max(55, Math.min(h * 0.85, 140));
  document.querySelectorAll(".pedal").forEach(p => {
    p.style.height = pedalH + "px";
  });

  // tamaño texto de pedales
  const pedalFont = Math.max(8, Math.min(11, pedalH / 9));
  document.querySelectorAll(".pedal-val").forEach(v => {
    v.style.fontSize = pedalFont + "px";
  });

  // tamaño font gear → proporción del panel
  const gearFont = Math.max(24, Math.min(38, h * 0.34));
  document.getElementById("gear").style.fontSize = gearFont + "px";

  const speedFont = Math.max(12, Math.min(16, gearFont * 0.42));
  document.getElementById("speed").style.fontSize = speedFont + "px";
}

// ---------------------------
// LISTENER ÚNICO (no inventar)
// ---------------------------
window.addEventListener("resize", () => {
  dims = resizeCanvasReal();  // ya existía
  resizeOtherElements();      // añadido respetando tu patrón
});

// primera llamada
resizeOtherElements();

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
  clearPedalsAndGear();
}


function clearPedalsAndGear(){
   // limpiar pedales y valores UI
  document.getElementById("throttle-bar").style.height = "0%";
  document.getElementById("brake-bar").style.height = "0%";
  document.getElementById("clutch-bar").style.height = "0%";

  document.getElementById("throttle-val").textContent = "0";
  document.getElementById("brake-val").textContent = "0";
  document.getElementById("clutch-val").textContent = "0";

  // Gear reseteado a neutro
  document.getElementById("gear").textContent = "N"; 
  document.getElementById("speed").textContent = "0 km/h";
}

function checkInactivity() {
  const now = Date.now();
  if (ws && wsConnected) {
    if (lastMsgTime && (now - lastMsgTime) > INACTIVITY_MS) {
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

function connectWS() {
  if (!window.__overlayEnabled) return;
  if (retryCount >= MAX_RETRIES) return;
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  try {
    if (ws) {
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      ws = null;
    }
  } catch(e){}

  shownSinceOpen = false;
  lastMsgTime = 0;
  unchangedCount = 0;

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
      }

      if (unchangedCount >= UNCHANGED_THRESHOLD) {
        hideOverlaySafe();
        setIracingRunning(false);
        clearSamples();
        try { ws.close(); } catch(e){}
        return;
      }

      if (data.ts !== lastTs){
        pushSample(data);
        updatePedalUI(data);
        updateGearAndSpeed(data);
      } 

    } catch(e){}
  };

  ws.onclose = () => {
    wsConnected = false;
    hideOverlaySafe();
    setIracingRunning(false);
    clearSamples();

    try { ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; } catch(e){}
    ws = null;

    scheduleReconnect();
  };

  ws.onerror = () => {};
}

function pushSample(s) {
  if (!s.ts || s.ts === lastTs) return;
  lastTs = s.ts;
  samples.push(s);
  if (samples.length > maxSamples) samples.shift();
}

function updatePedalUI(data) {
  // valores ya vienen 0 → 1
  const t = Math.max(0, Math.min(1, data.throttle));
  const b = Math.max(0, Math.min(1, data.brake));
  const c = Math.max(0, Math.min(1, data.clutch));

  // bars
  document.getElementById("throttle-bar").style.height = `${t * 100}%`;
  document.getElementById("brake-bar").style.height = `${b * 100}%`;
  document.getElementById("clutch-bar").style.height = `${c * 100}%`;

  // % text (redondeado)
  document.getElementById("throttle-val").textContent = Math.round(t * 100);
  document.getElementById("brake-val").textContent = Math.round(b * 100);
  document.getElementById("clutch-val").textContent = Math.round(c * 100);

  // colores según pedal
  document.getElementById("throttle-bar").style.background = "linear-gradient(#0a0,#0f0)";
  document.getElementById("brake-bar").style.background = "linear-gradient(#a00,#f00)";
  document.getElementById("clutch-bar").style.background = "linear-gradient(#0044ff,#3388ff)";
}

function updateGearAndSpeed(data) {
  // ----- GEAR -----
  let g = data.gear;

  if (g === 0) {
    document.getElementById("gear").textContent = "N";
  } else if (g === -1) {
    document.getElementById("gear").textContent = "R";
  } else {
    document.getElementById("gear").textContent = g; // 1..n
  }

  // ----- SPEED (m/s → km/h) -----
  const kmh = Math.round((data.speed || 0) * 3.6);
  document.getElementById("speed").textContent = `${kmh} km/h`;
}


function draw() {
  dims = resizeCanvasReal();
  const cssW = dims.cssW;
  const cssH = dims.cssH;

  const baselineY = cssH - bottomPadding;
  const available = baselineY - topPadding;
  const usableH = Math.max(minGraphHeight, available);

  ctx.clearRect(0, 0, cssW, cssH);

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

function applyOverlayConfig(cfg) {
  if (cfg.opacity !== undefined) {
    const value = Number(cfg.opacity);
    document.body.style.opacity = value / 100;
  }
}

// ----------------------------S
// ARRANQUE DEL OVERLAY
// ----------------------------
connectWS();
draw();
