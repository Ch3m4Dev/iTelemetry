// src/renderer/overlays/delta/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  onConfigUpdate: (cb) =>
    ipcRenderer.on("overlay:config-update", (_, cfg) => cb(cfg)),

  onDeltaConfigUpdate: (cb) =>
    ipcRenderer.on("overlay:config-update-delta", (_, cfg) => cb(cfg)),

  onForceResize: (cb) =>
    ipcRenderer.on("overlay:delta-force-resize", () => cb())
});

// ----------- NUEVO BLOQUE: TELEMETRY SAMPLE → renderer -----------
ipcRenderer.on("telemetry-sample", (_, payload) => {
  try {
    // Lo pasamos al renderer EXACTAMENTE como Delta lo espera
    window.postMessage(
      { type: "telemetry-sample", payload },
      "*"
    );
  } catch (e) {
    console.error("[delta-preload] error forwarding telemetry:", e);
  }
});
// -----------------------------------------------------------------

contextBridge.exposeInMainWorld("api", {
  overlayHide: () => ipcRenderer.send("overlay-hide"),
  overlayShow: () => ipcRenderer.send("overlay-show"),
  setIracingState: (running) => ipcRenderer.send("iracing-state", !!running),
  resizeOverlay: (w, h) =>
    ipcRenderer.send("overlay-resize", Number(w), Number(h))
});
