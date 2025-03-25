const path = require("path");
const dotenv = require("dotenv");
const { getTxAdminConfig, getStoragePaths } = require("./config");
const { logError } = require("./error");
const { loginToTxAdmin } = require("./login");
const { fetchHistory } = require("./history");

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, "data", "config", ".env") });

// Función principal
async function main() {
  let browser = null;
  
  try {
    // Obtener configuración de los módulos centralizados
    const txAdminConfig = getTxAdminConfig();
    const storagePaths = getStoragePaths();
    
    // Configuración para el inicio de sesión
    const loginConfig = {
      txAdminBaseUrl: txAdminConfig.baseUrl,
      username: txAdminConfig.username,
      password: txAdminConfig.password,
      dataStoragePath: storagePaths.data,
    };

    console.log("ℹ️ Configuración cargada desde variables de entorno");
    console.log(`ℹ️ Modo de ejecución: ${process.env.NODE_ENV || "development"}`);

    // Iniciar sesión en txAdmin
    const loginResult = await loginToTxAdmin(loginConfig);
    browser = loginResult.browser; // Guardar referencia al navegador
    
    if (!loginResult.success) {
      console.error(
        `❌ Error en el proceso de inicio de sesión: ${loginResult.error}`,
      );
      return { success: false, error: loginResult.error };
    }
    
    console.log("✅ Inicio de sesión completado con éxito");
      
    // Configuración para obtener el historial
    const historyConfig = {
      txAdminBaseUrl: txAdminConfig.baseUrl,
      dataStoragePath: storagePaths.data
    };
    
    // Pequeña pausa para asegurar que la sesión está completamente establecida
    console.log("⏳ Esperando 2 segundos para estabilizar la sesión...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Obtener el historial después del inicio de sesión exitoso
    console.log("🔍 Obteniendo el historial de txAdmin...");
    const historyResult = await fetchHistory(browser, historyConfig);
    
    if (historyResult.success) {
      console.log("📊 Datos de historial obtenidos correctamente");
      console.log(`📄 Total de entradas en el historial: ${historyResult.historyData.length}`);
    } else {
      console.error(`❌ Error al obtener el historial: ${historyResult.error}`);
    }
    
    console.log(
      "🔑 Ya puedes usar las credenciales guardadas para tus solicitudes API",
    );
    return { success: true };
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    logError(error, { context: "main execution" });
    return { success: false, error: error.message };
  } finally {
    // Cerrar el navegador si existe
    if (browser) {
      try {
        await browser.close();
        console.log("🔄 Navegador cerrado");
      } catch (closeError) {
        console.error("Error al cerrar el navegador:", closeError);
      }
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Error fatal:", error);
      process.exit(1);
    });
} else {
  module.exports = { main };
}
