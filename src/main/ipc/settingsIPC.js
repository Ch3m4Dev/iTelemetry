const { ipcMain, screen } = require("electron");
const { loadConfig, saveConfig } = require("../config.js");
const { applyOverlayConfig } = require("../windows/overlayInputs");

function setupSettingsIPC() {
  ipcMain.on("get-screen-size", (event) => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    event.returnValue = { width, height };
    });
  
  ipcMain.handle("settings-load-config", () => {
    return loadConfig();
  });

  ipcMain.handle("settings-save-config", (event, cfg) => {
    saveConfig(cfg);

    // Aplicar cambios al overlay en caliente
    applyOverlayConfig(cfg);
  });
}

module.exports = {
  setupSettingsIPC
};
