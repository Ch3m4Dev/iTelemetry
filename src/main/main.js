const { app } = require("electron");
const { createOverlayWindow } = require("./overlayWindow");
const { createTray } = require("./tray");
const { setupSettingsIPC } = require("./settingsIPC");
const { setupAutoUpdate } = require("./update");

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
