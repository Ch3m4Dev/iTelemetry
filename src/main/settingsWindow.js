const { BrowserWindow } = require("electron");
const path = require("path");

let settingsWin = null;

function createSettingsWindow() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }

  settingsWin = new BrowserWindow({
    width: 360,
    height: 300,
    title: "Ajustes del Overlay",
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "..", "renderer", "settings_preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWin.loadFile(path.join(__dirname, "..", "renderer", "settings.html"));

  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}

module.exports = {
  createSettingsWindow
};
