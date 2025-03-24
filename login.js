const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { getPuppeteerConfig } = require("./config");
const {
  captureErrorScreenshot,
  logError,
  ensureDirectoryExists,
} = require("./error");

/**
 * Inicia sesión en la interfaz de txAdmin y guarda las credenciales para uso futuro
 * @param {Object} config Configuración con URL y credenciales
 * @returns {Promise<Object>} Resultado del proceso de inicio de sesión
 */
async function loginToTxAdmin(config) {
  const {
    txAdminBaseUrl,
    username,
    password,
    dataStoragePath = "./data/storage",
  } = config;

  console.log("🔑 Iniciando navegador para inicio de sesión en txAdmin...");
  
  // Obtener configuración de Puppeteer del módulo centralizado
  const puppeteerConfig = getPuppeteerConfig();
  console.log(`🔧 Modo headless: ${puppeteerConfig.headless ? 'activado' : 'desactivado'}`);
  
  const browser = await puppeteer.launch(puppeteerConfig);

  const page = await browser.newPage();

  try {
    // Asegurar que existan las rutas de almacenamiento
    ensureDirectoryExists(dataStoragePath);

    // Navegar a la página de inicio de sesión
    console.log("🌐 Navegando a la página de inicio de sesión de txAdmin...");
    await page.goto(`${txAdminBaseUrl}/auth`);

    // Esperar a que aparezca el formulario de inicio de sesión
    await page.waitForSelector("#frm-login", { timeout: 10000 });

    // Rellenar formulario de inicio de sesión con los selectores correctos
    console.log("🔒 Introduciendo credenciales...");
    await page.type("#frm-login", username);
    await page.type("#frm-password", password);

    // Buscar y hacer clic en el botón específico de login con SVG
    console.log("🔍 Buscando el botón específico de login...");
    const loginButtonWithSVG = await page.evaluate(() => {
      // Buscar todos los botones
      const buttons = Array.from(document.querySelectorAll("button"));

      // Encontrar el que contiene SVG y texto "Login"
      const loginButton = buttons.find((button) => {
        return (
          button.innerHTML.includes("svg") &&
          button.textContent.trim().includes("Login")
        );
      });

      // Si se encontró un botón, hacer clic en él
      if (loginButton) {
        // Obtener las coordenadas para hacer clic desde JavaScript
        const rect = loginButton.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          found: true,
        };
      } else {
        return { found: false };
      }
    });

    await handleLoginButton(page, loginButtonWithSVG);

    // Verificar si el inicio de sesión fue exitoso
    const url = page.url();
    if (url.includes("/auth") || url.includes("/login")) {
      // Si seguimos en la página de inicio de sesión, algo salió mal
      await captureErrorScreenshot(page, "login-failed");
      throw new Error(
        "No se pudo iniciar sesión. Credenciales incorrectas o error de autenticación.",
      );
    }

    console.log("✅ Inicio de sesión exitoso");

    // Captura después de iniciar sesión
    await captureErrorScreenshot(page, "post-login");

    // Guardar credenciales de la sesión
    const sessionData = await saveSessionCredentials(page, dataStoragePath);

    return {
      success: true,
      ...sessionData,
    };
  } catch (error) {
    console.error("❌ Error:", error);

    // Registrar el error y capturar pantalla
    logError(error, { step: "login" });

    try {
      await captureErrorScreenshot(page, "error");
    } catch (screenshotError) {
      console.error("No se pudo guardar la captura:", screenshotError);
    }

    return {
      success: false,
      error: error.message,
    };
  } finally {
    // Cerrar el navegador
    await browser.close();
    console.log("🔄 Navegador cerrado");
  }
}

/**
 * Maneja diferentes métodos para hacer clic en el botón de inicio de sesión
 * @param {Object} page Objeto página de Puppeteer
 * @param {Object} loginButtonInfo Información del botón encontrado
 */
async function handleLoginButton(page, loginButtonInfo) {
  if (loginButtonInfo.found) {
    console.log("🔄 Haciendo clic en el botón de login con SVG...");
    // Hacer clic en las coordenadas exactas
    await page.mouse.click(loginButtonInfo.x, loginButtonInfo.y);
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 });
  } else {
    // Intentar métodos alternativos
    console.log(
      "⚠️ No se encontró el botón específico, probando alternativas...",
    );

    // Método 1: Buscar por texto interno
    const loginButtonByText = await page.$('button:has-text("Login")');
    if (loginButtonByText) {
      console.log(
        '🔄 Haciendo clic en el botón encontrado por texto "Login"...',
      );
      await Promise.all([
        loginButtonByText.click(),
        page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
      ]);
    } else {
      // Método 2: Buscar cualquier botón submit
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        console.log("🔄 Haciendo clic en el botón de tipo submit...");
        await Promise.all([
          submitButton.click(),
          page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
        ]);
      } else {
        // Método 3: Usar Enter para enviar el formulario
        console.log(
          "🔄 Ningún botón encontrado, enviando formulario con Enter...",
        );
        await Promise.all([
          page.keyboard.press("Enter"),
          page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
        ]);
      }
    }
  }
}

/**
 * Obtiene y guarda las credenciales de la sesión (cookies y CSRF token)
 * @param {Object} page Objeto página de Puppeteer
 * @param {string} dataStoragePath Ruta donde guardar los datos
 * @returns {Object} Datos de la sesión obtenidos
 */
async function saveSessionCredentials(page, dataStoragePath) {
  // Guardar cookies para uso futuro
  const cookies = await page.cookies();
  fs.writeFileSync(
    path.join(dataStoragePath, "txadmin-cookies.json"),
    JSON.stringify(cookies, null, 2),
    "utf8",
  );
  console.log("💾 Cookies guardadas en: txadmin-cookies.json");

  // Obtener el CSRF token
  const csrfToken = await page.evaluate(() => {
    // Buscar en el JavaScript de la página
    const scripts = document.querySelectorAll("script:not([src])");
    for (const script of scripts) {
      const match = script.textContent.match(
        /csrfToken\s*=\s*["']([^"']+)["']/,
      );
      if (match) return match[1];
    }

    // Otra alternativa: buscar en cualquier script
    for (const script of document.querySelectorAll("script")) {
      const content = script.textContent || "";
      const match = content.match(/csrfToken\s*=\s*["']([^"']+)["']/);
      if (match) return match[1];
    }

    return null;
  });

  if (csrfToken) {
    console.log(`✅ Token CSRF obtenido: ${csrfToken}`);
    fs.writeFileSync(
      path.join(dataStoragePath, "txadmin-csrf.json"),
      JSON.stringify({ csrfToken }, null, 2),
      "utf8",
    );
    console.log("💾 Token CSRF guardado en: txadmin-csrf.json");
  } else {
    console.log("⚠️ No se pudo obtener el token CSRF");
  }

  // Crear y guardar el archivo de credenciales unificado
  const credentials = {
    timestamp: new Date().toISOString(),
    csrfToken: csrfToken || null,
    cookieString: cookies
      .filter((c) => c.name.startsWith("tx:default"))
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  };

  fs.writeFileSync(
    path.join(dataStoragePath, "txadmin-credentials.json"),
    JSON.stringify(credentials, null, 2),
    "utf8",
  );
  console.log(
    "💾 Credenciales completas guardadas en: txadmin-credentials.json",
  );

  return {
    cookies,
    csrfToken,
  };
}

module.exports = { loginToTxAdmin };
