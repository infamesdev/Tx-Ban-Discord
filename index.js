const path = require("path");
const dotenv = require("dotenv");
const { getTxAdminConfig, getStoragePaths } = require("./config");
const { logError } = require("./error");
const { loginToTxAdmin } = require("./login");

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, "data", "config", ".env") });

// Función principal
async function main() {
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

    if (loginResult.success) {
      console.log("✅ Inicio de sesión completado con éxito");
      console.log(
        "🔑 Ya puedes usar las credenciales guardadas para tus solicitudes API",
      );
      return { success: true };
    } else {
      console.error(
        `❌ Error en el proceso de inicio de sesión: ${loginResult.error}`,
      );
      return { success: false, error: loginResult.error };
    }
  } catch (error) {
    console.error("❌ Error inesperado:", error);
    logError(error, { context: "main execution" });
    return { success: false, error: error.message };
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
