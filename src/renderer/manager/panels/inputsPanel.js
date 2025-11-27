export function render(container, config) {
  container.innerHTML = `
    <h3>Configuración del Overlay Inputs</h3>
    <button id="center-overlay-btn" class="action-btn">Centrar overlay</button>
    <div class="setting-group">
      <label>X:
        <input type="number" id="inputs-x" value="${config.x ?? 0}">
      </label>
    </div>

    <div class="setting-group">
      <label>Y:
        <input type="number" id="inputs-y" value="${config.y ?? 0}">
      </label>
    </div>

    <div class="setting-group">
      <label>Anchura (width):
        <input type="number" id="inputs-width" value="${config.width ?? 920}">
      </label>
    </div>

    <div class="setting-group">
      <label>Altura (height):
        <input type="number" id="inputs-height" value="${config.height ?? 260}">
      </label>
    </div>

    <div class="setting-group">
      <label>Opacidad:
        <input type="range" id="inputs-opacity" min="20" max="100" value="${config.opacity ?? 100}">
      </label>
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

  centerBtn.addEventListener("click", () => {
    window.managerAPI.centerOverlay("inputs");
  });


  const save = () => {
    saveConfigCallback({
      x: Number(xInput.value),
      y: Number(yInput.value),
      width: Number(wInput.value),
      height: Number(hInput.value),
      opacity: Number(oInput.value)
    });
  };

  xInput.addEventListener("change", save);
  yInput.addEventListener("change", save);
  wInput.addEventListener("change", save);
  hInput.addEventListener("change", save);
  oInput.addEventListener("input", save);
}
