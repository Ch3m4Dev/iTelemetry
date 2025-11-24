const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

function setupAutoUpdate() {
  log.transports.file.level = "info";
  autoUpdater.logger = log;

  // Buscar actualizaciones cuando la app arranca.
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 2000);

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("No update available:", info);
  });

  autoUpdater.on("error", (err) => {
    log.error("Update error:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    log.info(`Downloading: ${Math.round(progressObj.percent)}%`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    log.info("Update downloaded:", info);
    autoUpdater.quitAndInstall();
  });
}

module.exports = { setupAutoUpdate };
