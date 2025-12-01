const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  onConfigUpdate: (callback) =>
    ipcRenderer.on("overlay:config-update", (event, cfg) => callback(cfg)),
});

contextBridge.exposeInMainWorld("api", {
  overlayHide: () => ipcRenderer.send("overlay-hide"),
  overlayShow: () => ipcRenderer.send("overlay-show"),
  setIracingState: (isRunning) => ipcRenderer.send("iracing-state", !!isRunning)
});
