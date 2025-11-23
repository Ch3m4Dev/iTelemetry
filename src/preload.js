const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  overlayHide: () => ipcRenderer.send("overlay-hide"),
  overlayShow: () => ipcRenderer.send("overlay-show"),
  iracingRunning: (state) => ipcRenderer.send("iracing-running", state)
});
