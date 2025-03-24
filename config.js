const path = require("path");
const dotenv = require("dotenv");

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, "data", "config", ".env") });

/**
 * Determina el modo headless basado en NODE_ENV
 * @returns {boolean|string} Configuración de headless para Puppeteer
 */
function getHeadlessMode() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Si es producción, usar 'new' para headless, de lo contrario false (navegador visible)
  return nodeEnv.toLowerCase() === 'production' ? 'new' : false;
}

/**
 * Obtiene la configuración completa para Puppeteer
 * @returns {Object} Configuración para iniciar Puppeteer
 */
function getPuppeteerConfig() {
  return {
    headless: getHeadlessMode(),
    defaultViewport: null,
    args: ["--start-maximized"], // Ventana maximizada
  };
}

/**
 * Obtiene las rutas de almacenamiento configuradas
 * @returns {Object} Rutas de almacenamiento
 */
function getStoragePaths() {
  return {
    errors: process.env.ERROR_SCREENSHOTS_PATH || "./data/errors",
    data: process.env.DATA_STORAGE_PATH || "./data/storage"
  };
}

/**
 * Obtiene la configuración de txAdmin
 * @returns {Object} Configuración de txAdmin
 */
function getTxAdminConfig() {
  return {
    baseUrl: process.env.TX_ADMIN_BASE_URL,
    username: process.env.TX_ADMIN_USERNAME,
    password: process.env.TX_ADMIN_PASSWORD
  };
}

/**
 * Obtiene la configuración de Discord
 * @returns {Object} Configuración de Discord
 */
function getDiscordConfig() {
  return {
    token: process.env.DISCORD_BOT_TOKEN,
    allowedChannels: process.env.allowedChannelsCommand
      ? process.env.allowedChannelsCommand.split(",")
      : []
  };
}

module.exports = {
  getHeadlessMode,
  getPuppeteerConfig,
  getStoragePaths,
  getTxAdminConfig,
  getDiscordConfig
};