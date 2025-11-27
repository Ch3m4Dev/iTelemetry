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

// ---------- resize (usa padding real del panel) ----------
function resizeCanvasReal() {
  const rect = panel.getBoundingClientRect();
  const style = getComputedStyle(panel);

  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;

  // dimensiones interiores visibles (CSS pixels)
  const cssW = Math.max(120, Math.round(rect.width - paddingLeft - paddingRight));
  const cssH = Math.max(40, Math.round(rect.height - paddingTop - paddingBottom));

  const dpr = window.devicePixelRatio || 1;

  // estilo CSS para que el canvas ocupe exactamente el interior del panel
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  // tamaño real en pixels del canvas
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // escalar el contexto para dibujar en coordenadas CSS (más cómodo)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // devolver valores útiles
  return { cssW, cssH, dpr, paddingLeft, paddingRight, paddingTop, paddingBottom, rect };
}

// inicial y onresize
let dims = resizeCanvasReal();
window.addEventListener("resize", () => { dims = resizeCanvasReal(); });

// ---------- websocket ----------
let ws = null;
let wsConnected = false;
let lastMsgTime = 0;
let shownSinceOpen = false; // para mostrar solo en el primer mensaje válido
let unchangedCount = 0;     // cuenta mensajes con mismo ts
const UNCHANGED_THRESHOLD = 4; // tras 4 mensajes idénticos consideramos inactividad
const INACTIVITY_MS = 3000; // si no llega ningún mensaje en este tiempo, reiniciamos

function hideOverlaySafe() {
  try { window.api.overlayHide(); } catch (e) { /* noop */ }
}
function showOverlaySafe() {
  try { window.api.overlayShow(); } catch (e) { /* noop */ }
}

// Notificar al main que iRacing NO está enviando datos
function setIracingRunning(state) {
  try { window.api.setIracingState(!!state); } catch (e) { /* noop */ }
}

function clearSamples() {
  samples.length = 0;
  lastTs = 0;
  unchangedCount = 0;
}

// Ocultar por defecto al arrancar
hideOverlaySafe();
setIracingRunning(false); // estado inicial: iRacing no está corriendo

function checkInactivity() {
  const now = Date.now();
  // si no ha llegado mensaje en INACTIVITY_MS y hay un socket abierto, reiniciamos
  if (ws && wsConnected) {
    if (lastMsgTime && (now - lastMsgTime) > INACTIVITY_MS) {
      console.log("[overlay] inactivity timeout - closing socket");
      try { ws.close(); } catch(e){}
      // onclose hará limpieza y notificará al main
    }
  }
}
setInterval(checkInactivity, 1000);

function connectWS() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;

  // limpiar socket viejo
  try {
    if (ws) {
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      ws = null;
    }
  } catch (e) {}

  shownSinceOpen = false;
  lastMsgTime = 0;
  unchangedCount = 0;

  ws = new WebSocket("ws://localhost:3030");

  ws.onopen = () => {
    wsConnected = true;
    lastMsgTime = 0;
    console.log("[renderer] ws.onopen");
  };

  ws.onmessage = (msg) => {
    lastMsgTime = Date.now();
    console.log("[renderer] ws.onmessage raw:", msg.data && msg.data.slice ? msg.data.slice(0,200) : msg.data);
    try {
      const data = JSON.parse(msg.data);
      console.log("[renderer] parsed ts:", data.ts);

      // Si el payload no tiene ts válido, lo ignoramos (no mostramos)
      if (!data || !data.ts) {
        console.log("[renderer] received message without ts, ignoring");
        return;
      }

      // Si el timestamp coincide con el último, consideramos que no hay nueva telemetría
      if (data.ts === lastTs) {
        unchangedCount++;
      } else {
        unchangedCount = 0; // nuevo dato real
      }

      // Si no hemos mostrado desde la apertura y este es un dato NUEVO, mostramos
      if (!shownSinceOpen && data.ts !== lastTs) {
        shownSinceOpen = true;
        clearSamples(); // arrancamos buffer limpio
        showOverlaySafe();
        // Notificamos al main que iRacing está corriendo AHORA
        setIracingRunning(true);
        console.log("[renderer] first new sample received - showing overlay and set iracing=true");
      }

      // Si recibimos demasiados mensajes sin cambios, consideramos inactividad
      if (unchangedCount >= UNCHANGED_THRESHOLD) {
        console.log("[renderer] unchangedCount threshold reached - treating as inactive");
        // ocultar/limpiar y forzar reconexión
        hideOverlaySafe();
        setIracingRunning(false); // iRacing dejó de mandar datos
        clearSamples();
        try { ws.close(); } catch(e){}
        return;
      }

      // Sólo empujar sample si ts es nuevo
      if (data.ts !== lastTs) {
        pushSample(data);
      }
    } catch (e) {
      console.error("[renderer] Error parseando WS:", e);
    }
  };

  ws.onclose = () => {
    wsConnected = false;
    console.log("[renderer] ws.onclose - hiding and clearing");
    hideOverlaySafe();
    setIracingRunning(false); // desconectado -> iRacing no está enviando
    clearSamples();

    try { ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null; } catch (e) {}
    ws = null;
    setTimeout(connectWS, 1500); // reintento rápido
  };

  ws.onerror = (e) => {
    console.log("[overlay] ws.onerror", e && e.message ? e.message : e);
  };
}

connectWS();

// ---------- push sample ----------
function pushSample(s) {
  if (!s.ts || s.ts === lastTs) return;
  lastTs = s.ts;
  samples.push(s);
  if (samples.length > maxSamples) samples.shift();
}

// ---------- draw ----------
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

  // reference lines at 25%, 50%, 75%
  const levels = [0.25, 0.5, 0.75];
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;

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

// debug helper
window._debugCanvas = () => {
  console.log(
    "DEBUG canvas:",
    canvas.getBoundingClientRect(),
    "canvas.width/height:",
    canvas.width,
    canvas.height,
    "dpr:",
    window.devicePixelRatio
  );
};

// -------------------- CONFIG DESDE MANAGER --------------------

function applyOverlayConfig(cfg) {
  // opacidad (0–100)
  if (cfg.opacity !== undefined) {
    const value = Number(cfg.opacity);
    document.body.style.opacity = value / 100;
  }
}

// Escucha IPC del Manager
if (window.overlayAPI) {
  window.overlayAPI.onConfigUpdate((cfg) => {
    applyOverlayConfig(cfg);
  });
}


draw();
