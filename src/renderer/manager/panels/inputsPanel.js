// src/renderer/manager/panels/inputsPanel.js

export function render(container, config) {
  container.innerHTML = `
    <div class="row">
      <div class="left">
        <label class="toggle">
          <input type="checkbox" id="inputs-enabled" ${config.enabled ? "checked" : ""}>
          <span></span>
        </label>
      </div>

      <div class="right">
        <button id="inputs-center-btn" class="btn-primary small-btn">Centrar overlay</button>
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
  const prefix = "inputs";

  const enabled = container.querySelector(`#${prefix}-enabled`);
  const x = container.querySelector(`#${prefix}-x`);
  const y = container.querySelector(`#${prefix}-y`);
  const w = container.querySelector(`#${prefix}-width`);
  const h = container.querySelector(`#${prefix}-height`);
  const o = container.querySelector(`#${prefix}-opacity`);
  const centerBtn = container.querySelector(`#${prefix}-center-btn`);

  const save = () => {
    saveConfigCallback({
      x: Number(x.value),
      y: Number(y.value),
      width: Number(w.value),
      height: Number(h.value),
      opacity: Number(o.value)
    });
  };

  // toggle overlay
  enabled.addEventListener("change", () => {
    window.managerAPI.toggleOverlay(prefix, enabled.checked);
  });

  // inputs
  x.addEventListener("change", save);
  y.addEventListener("change", save);
  w.addEventListener("change", save);
  h.addEventListener("change", save);
  o.addEventListener("input", save);

  // centrar
  centerBtn.addEventListener("click", () => {
    window.managerAPI.centerOverlay(prefix);
  });
}
