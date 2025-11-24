// src/main/main.js
const { app } = require("electron");
const { createOverlayWindow } = require("./overlayWindow");
const { createTray } = require("./tray");
const { setupSettingsIPC } = require("./settingsIPC");

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  setupSettingsIPC();
});

app.on("window-all-closed", () => app.quit());
