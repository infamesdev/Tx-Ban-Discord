const fs = require("fs");
const path = require("path");

// Asegurar que los directorios existen
function ensureDirectoryExists(dirPath) {
  // Convertir ruta relativa a absoluta
  const absolutePath = path.isAbsolute(dirPath)
    ? dirPath
    : path.resolve(process.cwd(), dirPath);

  if (!fs.existsSync(absolutePath)) {
    try {
      fs.mkdirSync(absolutePath, { recursive: true });
      console.log(`📁 Directorio creado: ${absolutePath}`);
    } catch (error) {
      console.error(
        `❌ Error al crear directorio ${absolutePath}:`,
        error.message,
      );
      throw error;
    }
  }

  return absolutePath;
}

// Formato de fecha y hora para nombres de archivo - CORREGIDO PARA WINDOWS
function getTimestampString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  // Usar guiones
  return `${day}-${month}-${year}-${hours}-${minutes}-${seconds}`;
}

// Capturar y guardar screenshot de error
async function captureErrorScreenshot(page, errorType = "error") {
  try {
    // Cargar variables de entorno
    const errorPath = process.env.ERROR_SCREENSHOTS_PATH || "./data/errors";
    const absoluteErrorPath = ensureDirectoryExists(errorPath);

    // Generar nombre de archivo con timestamp
    const timestamp = getTimestampString();
    const screenshotPath = path.join(
      absoluteErrorPath,
      `${errorType}-${timestamp}.png`,
    );

    // Tomar la captura de pantalla
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Captura de pantalla guardada en: ${screenshotPath}`);

    return {
      success: true,
      path: screenshotPath,
    };
  } catch (error) {
    console.error("❌ No se pudo guardar la captura de error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Registrar error en archivo de log
function logError(error, context = {}) {
  try {
    const errorPath = process.env.ERROR_SCREENSHOTS_PATH || "./data/errors";
    const absoluteErrorPath = ensureDirectoryExists(errorPath);

    const timestamp = getTimestampString();
    const logPath = path.join(absoluteErrorPath, `error-log.txt`);

    const logEntry =
      `[${timestamp}] ERROR: ${error.message}\n` +
      `Context: ${JSON.stringify(context)}\n` +
      `Stack: ${error.stack}\n` +
      `----------------------------------------\n`;

    fs.appendFileSync(logPath, logEntry);
    console.error(`❌ Error registrado en: ${logPath}`);

    return { success: true };
  } catch (logError) {
    console.error(
      "❌ No se pudo registrar el error en el log:",
      logError.message,
    );
    return { success: false };
  }
}

module.exports = {
  captureErrorScreenshot,
  logError,
  getTimestampString,
  ensureDirectoryExists,
};
