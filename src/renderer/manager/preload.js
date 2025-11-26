const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('managerAPI', {
  requestOverlayState: (overlayName) =>
    ipcRenderer.invoke('manager:getOverlayState', overlayName),

  toggleOverlay: (overlayName, state) =>
    ipcRenderer.send('manager:toggleOverlay', overlayName, state),

  selectOverlay: (overlayName) =>
    ipcRenderer.send('manager:selectOverlay', overlayName),

  onOverlayConfigUpdate: (callback) => {
    ipcRenderer.on('manager:overlayConfig', (event, overlayName, config) => {
      callback(overlayName, config);
    });
  }
});
