const canvas = document.getElementById("telemetryCanvas");
const panel = document.getElementById("panel");
const ctx = canvas.getContext("2d");

let samples = [];
let maxSamples = 300;
let lastTs = 0;

const bottomPadding = 1;
const topPadding = 1;
const minGraphHeight = 28;

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

  return { cssW, cssH, dpr };
}

let dims = resizeCanvasReal();
window.addEventListener("resize", () => { dims = resizeCanvasReal(); });

let ws = null;
let wsConnected = false;
let lastMsgTime = 0;

let shownSinceOpen = false;
let unchangedCount = 0;

const UNCHANGED_THRESHOLD = 4;
const INACTIVITY_MS = 3000;

function hideOverlaySafe() { try { window.api.overlayHide(); } catch {} }
function showOverlaySafe() { try { window.api.overlayShow(); } catch {} }

function clearSamples() {
  samples.length = 0;
  lastTs = 0;
  unchangedCount = 0;
}

hideOverlaySafe();
window.api.iracingRunning(false);

function checkInactivity() {
  const now = Date.now();
  if (ws && wsConnected) {
    if (lastMsgTime && (now - lastMsgTime) > INACTIVITY_MS) {

      window.api.iracingRunning(false);

      try { ws.close(); } catch {}
    }
  }
}
setInterval(checkInactivity, 1000);

function connectWS() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  try {
    if (ws) {
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      ws = null;
    }
  } catch {}

  shownSinceOpen = false;
  lastMsgTime = 0;
  unchangedCount = 0;

  ws = new WebSocket("ws://localhost:3030");

  ws.onopen = () => {
    wsConnected = true;
    lastMsgTime = 0;
  };

  ws.onmessage = (msg) => {
    lastMsgTime = Date.now();
    try {
      const data = JSON.parse(msg.data);

      if (!data || !data.ts) return;

      // PRIMER SAMPLE REAL → IRACING ESTÁ CORRIENDO
      if (!shownSinceOpen && data.ts !== lastTs) {
        shownSinceOpen = true;
        clearSamples();
        showOverlaySafe();
        window.api.iracingRunning(true);
      }

      if (data.ts === lastTs) {
        unchangedCount++;
      } else {
        unchangedCount = 0;
      }

      if (unchangedCount >= UNCHANGED_THRESHOLD) {
        hideOverlaySafe();
        window.api.iracingRunning(false);
        clearSamples();
        try { ws.close(); } catch {}
        return;
      }

      if (data.ts !== lastTs) {
        pushSample(data);
      }

    } catch (e) {}
  };

  ws.onclose = () => {
    wsConnected = false;
    hideOverlaySafe();
    window.api.iracingRunning(false);

    clearSamples();

    try { ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; } catch {}
    ws = null;
    setTimeout(connectWS, 1500);
  };

  ws.onerror = () => {};
}

connectWS();

function pushSample(s) {
  if (!s.ts || s.ts === lastTs) return;
  lastTs = s.ts;
  samples.push(s);
  if (samples.length > maxSamples) samples.shift();
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
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const count = samples.length;
  const denom = Math.max(1, (maxSamples - 1));

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

draw();
