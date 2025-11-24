function showSavedMessage() {
  const status = document.getElementById("status");
  const err = document.getElementById("errorMsg");

  err.style.display = "none"; // ocultar error si existía

  status.style.display = "block";
  status.textContent = "Cambios guardados.";

  setTimeout(() => {
    status.style.display = "none";
  }, 1500);
}

function showError(msg) {
  const err = document.getElementById("errorMsg");
  const status = document.getElementById("status");

  status.style.display = "none"; // ocultar success si existía

  err.style.display = "block";
  err.textContent = msg;
}

window.addEventListener("DOMContentLoaded", async () => {
  const cfg = await window.settingsAPI.loadConfig();

  const posX = document.getElementById("posX");
  const posY = document.getElementById("posY");
  const width = document.getElementById("width");
  const height = document.getElementById("height");

  posX.value = cfg.x ?? 0;
  posY.value = cfg.y ?? 0;
  width.value = cfg.width ?? 920;
  height.value = cfg.height ?? 260;

  document.getElementById("saveBtn").addEventListener("click", () => {

    const x = Number(posX.value);
    const y = Number(posY.value);
    const w = Number(width.value);
    const h = Number(height.value);

    // Validación estricta
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
      showError("Todos los valores deben ser números.");
      return;
    }

    if (x < 0 || y < 0) {
      showError("La posición no puede ser negativa.");
      return;
    }

    if (w < 150 || h < 80) {
      showError("El tamaño mínimo del overlay es 150x80.");
      return;
    }

    // Si todo está OK -> guardar
    const newCfg = {
      ...cfg,
      x, y, width: w, height: h
    };

    window.settingsAPI.saveOverlayConfig(newCfg);
    showSavedMessage();
  });

  document.getElementById("centerBtn").addEventListener("click", async () => {
    const screenWidth = window.settingsAPI.getScreenSize().width;
    const screenHeight = window.settingsAPI.getScreenSize().height;

    // centro horizontal
    const idealX = Math.round((screenWidth - Number(width.value)) / 2);

    // altura tipo volante
    const idealY = Math.round(screenHeight * 0.70);

    posX.value = idealX;
    posY.value = idealY;

    // autoguardado
    const newCfg = {
        ...cfg,
        x: idealX,
        y: idealY,
        width: Number(width.value),
        height: Number(height.value)
    };

    window.settingsAPI.saveOverlayConfig(newCfg);
    showSavedMessage();
    });


  // hotchange updater
  window.addEventListener("overlay-updated", (ev) => {
    const data = JSON.parse(ev.detail);

    if (data.x !== undefined) document.getElementById("posX").value = data.x;
    if (data.y !== undefined) document.getElementById("posY").value = data.y;
    if (data.width !== undefined) document.getElementById("width").value = data.width;
    if (data.height !== undefined) document.getElementById("height").value = data.height;
    });

});
