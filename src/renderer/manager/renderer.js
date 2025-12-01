// src/renderer/manager/renderer.js

// --- SELECTORES CORRECTOS ---
const sidebarItems = document.querySelectorAll(".sidebar-item");
const currentOverlayEl = document.getElementById("current-overlay");
const contentInner = document.querySelector("#content-body");

// overlay inicial
let currentOverlay = "inputs";


// ---------------------------------------------------------
// Función para cargar dinámicamente un panel según overlay
// ---------------------------------------------------------
async function loadPanelForOverlay(overlayName, config, saveCallback) {

  if (overlayName === "inputs") {
    const module = await import("./panels/inputsPanel.js");
    module.render(contentInner, config);
    module.init(contentInner, saveCallback);
  }

  // actualizar título bonito estilo Discord
  const formattedName =
    overlayName.charAt(0).toUpperCase() + overlayName.slice(1);

  if (currentOverlayEl)
    currentOverlayEl.innerText = `Configuración de ${formattedName}`;
}


// ---------------------------------------------------------
// Guardar configuración del overlay actual
// ---------------------------------------------------------
function saveOverlayConfig(update) {
  window.managerAPI.updateOverlayConfig(currentOverlay, update);
}


// ---------------------------------------------------------
// Actualización de campos cuando el main manda updates
// ---------------------------------------------------------
function updatePanelFields(fields) {
  if (currentOverlay !== "inputs") return;

  const toggleEl = document.getElementById("toggle-overlay");
  const x = document.getElementById("inputs-x");
  const y = document.getElementById("inputs-y");
  const w = document.getElementById("inputs-width");
  const h = document.getElementById("inputs-height");
  const o = document.getElementById("inputs-opacity");

  if (!x) return; // panel aún no montado

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

    // UI sidebar
    sidebarItems.forEach((el) => el.classList.remove("selected"));
    item.classList.add("selected");

    currentOverlay = item.dataset.overlay;

    // pedir config al main
    window.managerAPI.getOverlayState(currentOverlay).then((state) => {
      loadPanelForOverlay(
        currentOverlay,
        { ...state.config, enabled: state.enabled },
        saveOverlayConfig
      );
    });

    // avisar al main qué overlay está seleccionado (si es necesario)
    window.managerAPI.selectOverlay(currentOverlay);
  });
});


// ---------------------------------------------------------
// Inicialización al abrir el Manager
// ---------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {

  // recibir updates del main en tiempo real
  window.managerAPI.onOverlayFieldsUpdate((fields) => {
    updatePanelFields(fields);
  });

  // cargar overlay inicial
  window.managerAPI.getOverlayState(currentOverlay).then((state) => {
    loadPanelForOverlay(
      currentOverlay,
      { ...state.config, enabled: state.enabled },
      saveOverlayConfig
    );
  });
});
