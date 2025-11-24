// src/main/main.js
const { app } = require("electron");
const { createOverlayWindow } = require("./overlayWindow");
const { createTray } = require("./tray");

app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
});

app.on("window-all-closed", () => app.quit());
