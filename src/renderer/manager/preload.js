const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('managerAPI', {
  getOverlayState: (overlayName) =>
    ipcRenderer.invoke('manager:getOverlayState', overlayName),

  toggleOverlay: (overlayName, state) =>
    ipcRenderer.send('manager:toggleOverlay', overlayName, state),

  selectOverlay: (overlayName) =>
    ipcRenderer.send('manager:selectOverlay', overlayName),

  updateOverlayConfig: (overlayName, newConfig) =>
  ipcRenderer.send("manager:updateOverlayConfig", overlayName, newConfig),

  onOverlayFieldsUpdate: (callback) =>
  ipcRenderer.on("manager:update-overlay-fields", (event, fields) => callback(fields)),

  centerOverlay: (overlayName) =>
  ipcRenderer.send("manager:centerOverlay", overlayName),

  onOverlayConfigUpdate: (callback) => {
    ipcRenderer.on('manager:overlayConfig', (event, overlayName, config) => {
      callback(overlayName, config);
    });
  }
});
