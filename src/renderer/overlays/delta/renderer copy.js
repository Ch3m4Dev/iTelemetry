// ----------- ELEMENTOS UI -----------
const deltaEl = document.getElementById("delta-value");
const predEl  = document.getElementById("estimated-lap");
const panel   = document.getElementById("panel");
const microBar = document.getElementById("microsector-bar");

// Estado inicial: overlay activado
window.__overlayEnabled = true;
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

// ----------- WEBSOCKET -----------
let ws = null;

function connect() {
  ws = new WebSocket("ws://localhost:3030");

  ws.onopen = () => {
    try { window.api.overlayShow(); } catch(e){}
  };

  ws.onclose = () => {
    try { window.api.overlayHide(); } catch(e){}
    setTimeout(connect, 1000);
  };

  ws.onmessage = (msg) => {
    let d;
    try { d = JSON.parse(msg.data); } catch(e){ return; }
    if (!d) return;

    const pct = d.LapDistPct ?? 0;
    const lap = d.PlayerCarLap ?? 0;
    const lapCur = d.LapCurrentLapTime ?? null;

    const irDelta = d.LapDeltaToSessionBestLap;
    const best = d.LapBestLapTime;

    if (best && best > 0) bestLap = best;

    // --------------------------
    // RESET por nueva vuelta
    // --------------------------
    if (pct < prevLapDist) {
      resetMicros();
    }
    prevLapDist = pct;

    // --------------------------
    // CALCULAR DELTA
    // --------------------------
    let delta = null;
    if (typeof irDelta === "number" && isFinite(irDelta)) {
      delta = irDelta;
    }

    // RENDER DELTA
    if (delta !== null) {
      const v = delta;
      deltaEl.innerText = (v >= 0 ? "+" : "") + v.toFixed(3) + "s";
      deltaEl.style.color = (v < 0 ? "#00ff66" : (v > 0.2 ? "#ff4444" : "#ffffff"));
    } else {
      deltaEl.innerText = "+0.000s";
    }

    // --------------------------
    // ESTIMATED LAP
    // --------------------------
    let est = null;
    if (bestLap && delta !== null) {
      est = bestLap + delta;
    }
    predEl.innerText = "Est. Lap: " + fmt(est);

    // --------------------------
    // MICROSECTORES (PINTAR SOLO)
    // --------------------------
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
  };
}

// ----------- RESIZE AUTO -----------
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

// ----------- INIT -----------
window.addEventListener("DOMContentLoaded", () => {
  buildMicroBar();
  const r = panel.getBoundingClientRect();
  requestResize(r.width, r.height);
  connect();
});

window.overlayAPI?.onDeltaConfigUpdate?.((cfg)=>{
  if (!cfg || cfg.scale === undefined) return;
  const s = Number(cfg.scale);
  if (s > 0) applyScale(s);
});
