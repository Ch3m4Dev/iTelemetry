const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsAPI", {
  loadConfig: () => ipcRenderer.invoke("settings-load-config"),
  saveOverlayConfig: (cfg) => ipcRenderer.invoke("settings-save-config", cfg),
  getScreenSize: () => ipcRenderer.sendSync("get-screen-size")
});

ipcRenderer.on("overlay-updated", (event, jsonString) => {
  window.dispatchEvent(
    new CustomEvent("overlay-updated", { detail: jsonString })
  );
});