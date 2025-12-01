const { BrowserWindow } = require("electron");

function getActiveOverlays() {
  return BrowserWindow.getAllWindows().filter(win => {
    const url = win.webContents.getURL().replace(/\\/g, "/").toLowerCase();
    return url.includes("renderer/overlays/");
  });
}

module.exports = { getActiveOverlays };
