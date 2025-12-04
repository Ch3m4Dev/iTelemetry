// src/renderer/manager/renderer.js

// --- SELECTORES ---
const sidebarItems = document.querySelectorAll(".sidebar-item");
const currentOverlayEl = document.getElementById("current-overlay");
const contentInner = document.querySelector("#content-body");
const centerBtn = document.getElementById("center-overlay");

// overlay inicial
let currentOverlay = "inputs";


// ---------------------------------------------------------
// Carga dinámica del panel (Inputs / Delta / futuros overlays)
// ---------------------------------------------------------
async function loadPanelForOverlay(overlayName, config, saveCallback) {

  if (overlayName === "inputs") {
    const module = await import("./panels/inputsPanel.js");
    module.render(contentInner, config);
    module.init(contentInner, saveCallback);
  }

  if (overlayName === "delta") {
    const module = await import("./panels/deltaPanel.js");
    module.render(contentInner, config);
    module.init(contentInner, saveCallback);
  }

  // título
  const formattedName =
    overlayName.charAt(0).toUpperCase() + overlayName.slice(1);

  if (currentOverlayEl)
    currentOverlayEl.innerText = `Configuración de ${formattedName}`;
}


// ---------------------------------------------------------
// Enviar cambios de campos al main
// ---------------------------------------------------------
function saveOverlayConfig(update) {
  window.managerAPI.updateOverlayConfig(currentOverlay, update);
}


// ---------------------------------------------------------
// UPDATE en caliente (desde overlayInputs/Delta win.on("move"/"resize"))
// Funciona para todos los overlays automáticamente
// ---------------------------------------------------------
function updatePanelFields(fields) {
  const prefix = currentOverlay; // "inputs" o "delta"

  const toggleEl = document.getElementById(`${prefix}-enabled`);
  const x = document.getElementById(`${prefix}-x`);
  const y = document.getElementById(`${prefix}-y`);
  const w = document.getElementById(`${prefix}-width`);
  const h = document.getElementById(`${prefix}-height”`);
  const o = document.getElementById(`${prefix}-opacity`);

  // si el panel no está montado todavía, ignoramos
  if (!x) return;

  if (fields.enabled !== undefined && toggleEl) toggleEl.checked = fields.enabled;
  if (fields.x !== undefined) x.value = fields.x;
  if (fields.y !== undefined) y.value = fields.y;
  if (fields.width !== undefined) w.value = fields.width;
  if (fields.height !== undefined) h.value = fields.height;
  if (fields.opacity !== undefined && o) o.value = fields.opacity;
}


// ---------------------------------------------------------
// Sidebar: cambiar de overlay
// ---------------------------------------------------------
sidebarItems.forEach((item) => {
  item.addEventListener("click", () => {

    sidebarItems.forEach((el) => el.classList.remove("selected"));
    item.classList.add("selected");

    currentOverlay = item.dataset.overlay;

    window.managerAPI.getOverlayState(currentOverlay).then((state) => {
      loadPanelForOverlay(
        currentOverlay,
        { ...state.config, enabled: state.enabled },
        saveOverlayConfig
      );
    });

    window.managerAPI.selectOverlay(currentOverlay);
  });
});


// ---------------------------------------------------------
// Botón centrar overlay (ahora funciona Inputs + Delta)
// ---------------------------------------------------------
centerBtn.addEventListener("click", () => {
  window.managerAPI.centerOverlay(currentOverlay);
});


// ---------------------------------------------------------
// Inicialización al arrancar Manager
// ---------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {

  window.managerAPI.onOverlayFieldsUpdate((fields) => {
    updatePanelFields(fields);
  });

  window.managerAPI.getOverlayState(currentOverlay).then((state) => {
    loadPanelForOverlay(
      currentOverlay,
      { ...state.config, enabled: state.enabled },
      saveOverlayConfig
    );
  });
});
