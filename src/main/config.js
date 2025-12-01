const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config.json");

function loadConfig() {
  try {
    if (!fs.existsSync(configPath)) return {};
    const raw = fs.readFileSync(configPath, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo config.json:', err);
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
