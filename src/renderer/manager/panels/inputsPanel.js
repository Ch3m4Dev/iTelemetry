// src/renderer/manager/panels/inputsPanel.js

export function render(container, config) {
  container.innerHTML = `
    <div class="row">
      <div class="left">
        <label class="toggle">
          <input type="checkbox" id="toggle-overlay" ${config.enabled ? "checked" : ""}>
          <span></span>
        </label>
      </div>

      <div class="right">
        <button id="center-overlay-btn" class="btn-primary small-btn">Centrar overlay</button>
      </div>
    </div>

    <div class="setting-group">
      <label>X</label>
      <input type="number" id="inputs-x" value="${config.x ?? 0}">
    </div>

    <div class="setting-group">
      <label>Y</label>
      <input type="number" id="inputs-y" value="${config.y ?? 0}">
    </div>

    <div class="setting-group">
      <label>Anchura</label>
      <input type="number" id="inputs-width" value="${config.width ?? 920}">
    </div>

    <div class="setting-group">
      <label>Altura</label>
      <input type="number" id="inputs-height" value="${config.height ?? 260}">
    </div>

    <div class="setting-group">
      <label>Opacidad</label>
      <input type="range" id="inputs-opacity" min="20" max="100" value="${config.opacity ?? 100}">
    </div>
  `;
}

export function init(container, saveConfigCallback) {
  const xInput = container.querySelector("#inputs-x");
  const yInput = container.querySelector("#inputs-y");
  const wInput = container.querySelector("#inputs-width");
  const hInput = container.querySelector("#inputs-height");
  const oInput = container.querySelector("#inputs-opacity");
  const centerBtn = container.querySelector("#center-overlay-btn");
  const toggleEl = container.querySelector("#toggle-overlay"); // ahora está dentro del panel

  // Center button
  if (centerBtn) {
    centerBtn.addEventListener("click", () => {
      try { window.managerAPI.centerOverlay("inputs"); } catch (e) {}
    });
  }

  // Guardar helper
  const save = () => {
    if (typeof saveConfigCallback === "function") {
      saveConfigCallback({
        x: Number(xInput?.value ?? 0),
        y: Number(yInput?.value ?? 0),
        width: Number(wInput?.value ?? 920),
        height: Number(hInput?.value ?? 260),
        opacity: Number(oInput?.value ?? 100)
      });
    }
  };

  // Toggle ON/OFF: EL toggle del panel es la fuente de la verdad
  if (toggleEl) {
    // asegurar estado inicial (por si config llegó después)
    toggleEl.checked = !!toggleEl.checked;
    toggleEl.addEventListener("change", () => {
      const enabled = !!toggleEl.checked;
      try {
        // Actualiza config.enabled en main
        window.managerAPI.toggleOverlay("inputs", enabled);
      } catch (e) {}
    });
  }

  // Inputs listeners
  if (xInput) xInput.addEventListener("change", save);
  if (yInput) yInput.addEventListener("change", save);
  if (wInput) wInput.addEventListener("change", save);
  if (hInput) hInput.addEventListener("change", save);
  if (oInput) oInput.addEventListener("input", save);
}
