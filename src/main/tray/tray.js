const { Tray, Menu, app } = require("electron");
const path = require("path");

let tray = null;

function createTray() {
  const iconPath = path.join(__dirname, "..", "..", "assets", "tray_icon.ico");

  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.warn("Tray icon no encontrado:", e);
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Cerrar Overlay",
      click: () => app.quit()
    }
  ]);
  

  tray.setToolTip("iTelemetry Overlay");
  tray.setContextMenu(contextMenu);

  return tray;
}

module.exports = {
  createTray
};
