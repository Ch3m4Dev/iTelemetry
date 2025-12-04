// src/renderer/manager/panels/deltaPanel.js

export function render(container, config) {
  const scale = Number(config.scale ?? 1.0);

  container.innerHTML = `
    <div class="row">
      <div class="left">
        <label class="toggle">
          <input type="checkbox" id="delta-enabled" ${config.enabled ? "checked" : ""}>
          <span></span>
        </label>
      </div>

      <div class="right">
        <button id="delta-center-btn" class="btn-primary small-btn">Centrar overlay</button>
      </div>
    </div>
    
    <div class="setting-group">
      <label>Escala: <b id="delta-scale-label">${scale.toFixed(2)}</b></label>
      <div class="scale-row">
        <button id="delta-scale-down" class="btn-secondary small-btn">-</button>
        <button id="delta-scale-up" class="btn-secondary small-btn">+</button>
      </div>
    </div>

    <div class="setting-group">
      <label>X</label>
      <input type="number" id="delta-x" value="${config.x ?? 0}">
    </div>

    <div class="setting-group">
      <label>Y</label>
      <input type="number" id="delta-y" value="${config.y ?? 0}">
    </div>
  `;
}

export function init(container, saveCallback) {

  const enabled = container.querySelector("#delta-enabled");
  const x = container.querySelector("#delta-x");
  const y = container.querySelector("#delta-y");

  const scaleLabel = container.querySelector("#delta-scale-label");
  const btnUp = container.querySelector("#delta-scale-up");
  const btnDown = container.querySelector("#delta-scale-down");

  const centerBtn = container.querySelector("#delta-center-btn");

  // Guardar config helper (solo x,y)
  const save = () => {
    saveCallback({
      x: Number(x.value),
      y: Number(y.value)
    });
  };

  // Toggle
  enabled.addEventListener("change", () => {
    window.managerAPI.toggleOverlay("delta", enabled.checked);
  });

  // Campos básicos
  x.addEventListener("change", save);
  y.addEventListener("change", save);

  // CENTRAR
  centerBtn.addEventListener("click", () => {
    window.managerAPI.centerOverlay("delta");
  });

  // SCALE (+/-)
  btnUp.addEventListener("click", () => {
    const ns = Math.min(3.0, Number(scaleLabel.innerText) + 0.1);
    scaleLabel.innerText = ns.toFixed(2);
    saveCallback({ scale: ns });
  });

  btnDown.addEventListener("click", () => {
    const ns = Math.max(0.3, Number(scaleLabel.innerText) - 0.1);
    scaleLabel.innerText = ns.toFixed(2);
    saveCallback({ scale: ns });
  });
}
