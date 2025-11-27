const sidebarItems = document.querySelectorAll('.overlay-item');
const currentOverlayEl = document.getElementById('current-overlay');
const toggleEl = document.getElementById('toggle-overlay');
const contentInner = document.getElementById("content-inner");

let currentOverlay =
  document.querySelector('.overlay-item.selected')?.dataset?.overlay || 'inputs';

  // Función para cargar panel dinámico
async function loadPanelForOverlay(overlayName, config, saveCallback) {
  if (overlayName === "inputs") {
    const module = await import("./panels/inputsPanel.js");
    module.render(contentInner, config);
    module.init(contentInner, saveCallback);
  }
}

function saveOverlayConfig(update) {
  window.managerAPI.updateOverlayConfig(currentOverlay, update);
}

function updatePanelFields(fields) {
  // solo si estamos editando el overlay actual
  if (currentOverlay !== "inputs") return;

  const x = document.getElementById("inputs-x");
  const y = document.getElementById("inputs-y");
  const w = document.getElementById("inputs-width");
  const h = document.getElementById("inputs-height");

  if (!x) return; // el panel puede no estar cargado

  if (fields.x !== undefined) x.value = fields.x;
  if (fields.y !== undefined) y.value = fields.y;
  if (fields.width !== undefined) w.value = fields.width;
  if (fields.height !== undefined) h.value = fields.height;
}


// Cambia el overlay seleccionado
sidebarItems.forEach((item) => {
  item.addEventListener('click', () => {
    sidebarItems.forEach((el) => el.classList.remove('selected'));
    item.classList.add('selected');

    currentOverlay = item.dataset.overlay;
    currentOverlayEl.innerText = currentOverlay;

    window.managerAPI.selectOverlay(currentOverlay);

    window.managerAPI.requestOverlayState(currentOverlay).then((state) => {
        toggleEl.checked = !!state.enabled;
        loadPanelForOverlay(currentOverlay, state.config || {}, saveOverlayConfig);
        });
  });
});

// Interruptor ON/OFF
toggleEl.addEventListener('change', () => {
  const state = toggleEl.checked;
  window.managerAPI.toggleOverlay(currentOverlay, state);
});

// Cargar estado inicial al abrir la ventana
window.addEventListener('DOMContentLoaded', () => {
    window.managerAPI.onOverlayFieldsUpdate((fields) => {
        updatePanelFields(fields);
    });

    window.managerAPI.requestOverlayState(currentOverlay).then((state) => {
        toggleEl.checked = !!state.enabled;
        loadPanelForOverlay(currentOverlay, state.config || {}, saveOverlayConfig);
    });
});
