const { app } = require("electron");
const { createOverlayWindow } = require("./windows/overlayInputs");
const { createTray } = require("./tray/tray");
const { setupSettingsIPC } = require("./ipc/settingsIPC");
const { setupAutoUpdate } = require("./update/update");

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  setupSettingsIPC();
  // Solo checkea por updates en produccion
  if(app.isPackaged){
    setupAutoUpdate();
  }
});

app.on("window-all-closed", () => app.quit());
