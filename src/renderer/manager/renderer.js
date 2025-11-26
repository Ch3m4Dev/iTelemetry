const sidebarItems = document.querySelectorAll('.overlay-item');
const currentOverlayEl = document.getElementById('current-overlay');
const toggleEl = document.getElementById('toggle-overlay');

let currentOverlay =
  document.querySelector('.overlay-item.selected')?.dataset?.overlay || 'inputs';

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
  window.managerAPI.requestOverlayState(currentOverlay).then((state) => {
    toggleEl.checked = !!state.enabled;
  });
});
