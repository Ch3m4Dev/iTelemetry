const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  overlayHide: () => ipcRenderer.send("overlay-hide"),
  overlayShow: () => ipcRenderer.send("overlay-show")
});
