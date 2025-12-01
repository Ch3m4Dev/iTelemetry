const { Tray, Menu, app } = require("electron");
const path = require("path");
const overlayManager = require("../windows/overlayManager");

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
      label: "Abrir Manager",
      click: () => {
        overlayManager.create(); // garantiza que exista
        overlayManager.show();   // la muestra
    }
    },
    {
      label: "Cerrar Overlay",
      click: () => app.quit()
    }
  ]);
  tray.on("double-click", () => {
    overlayManager.create();        // si está destruida, la crea
    overlayManager.window.show();   // mostrar
  });

  

  tray.setToolTip("iTelemetry Overlay");
  tray.setContextMenu(contextMenu);

  return tray;
}

module.exports = {
  createTray
};
