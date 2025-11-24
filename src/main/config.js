const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    return {};
  }
}

function saveConfig(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), "utf8");
  } catch (e) {
    console.error("Error guardando config:", e);
  }
}

module.exports = {
  configPath,
  loadConfig,
  saveConfig
};
