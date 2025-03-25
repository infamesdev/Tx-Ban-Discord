const fs = require("fs");
const path = require("path");
const {
  captureErrorScreenshot,
  logError,
  ensureDirectoryExists,
} = require("./error");

/**
 * Navega a la página de historial y extrae la información
 * @param {Object} page Objeto página de Puppeteer
 * @param {Object} config Configuración con URL y rutas
 * @returns {Promise<Object>} Resultado de la operación con los datos extraídos
 */
async function navigateToHistoryPage(page, config) {
  const { txAdminBaseUrl, dataStoragePath = "./data/storage" } = config;

  try {
    console.log("🌐 Navegando a la página de historial...");
    
    // Capturar screenshot antes de navegar para diagnóstico
    
    // Verificar la URL actual
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    
    // Usar la URL completa y específica en lugar de relativa
    const historyUrl = `${txAdminBaseUrl}/history`;
    console.log(`🔗 Intentando acceder a: ${historyUrl}`);
    
    // Navegar a la página con timeout y opciones de carga más estrictas
    await page.goto(historyUrl, {
      waitUntil: ["load", "networkidle2"],
      timeout: 30000
    });
    
    // Verificar si seguimos en la página de autenticación
    const newUrl = page.url();
    console.log(`📍 URL después de navegación: ${newUrl}`);
    
    if (newUrl.includes("/auth") || newUrl.includes("/login")) {
      throw new Error("Redirección a página de autenticación. La sesión puede haber expirado.");
    }
    
    // Si llegamos a una URL que no es la de historia, intentar hacer clic en el enlace del menú
    if (!newUrl.includes("/history")) {
      console.log("⚠️ No estamos en la página de historial, intentando encontrar el enlace en el menú...");
      
      // Buscar enlaces en el menú que puedan llevar a la página de historial
      const historyLinkFound = await page.evaluate(() => {
        // Buscar enlaces que contengan "history" o "historial" en el texto o href
        const links = Array.from(document.querySelectorAll('a'));
        const historyLink = links.find(link => {
          const href = link.getAttribute('href') || '';
          const text = link.textContent.toLowerCase();
          return href.includes('history') || text.includes('history') || text.includes('historial');
        });
        
        if (historyLink) {
          historyLink.click();
          return true;
        }
        return false;
      });
      
      if (historyLinkFound) {
        console.log("🔍 Enlace de historial encontrado en el menú, esperando navegación...");
        await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 20000 });
      } else {
        console.log("⚠️ No se encontró enlace al historial en el menú, intentando navegación directa nuevamente...");
        await page.goto(`${txAdminBaseUrl}/history`, { 
          waitUntil: "networkidle2",
          timeout: 20000 
        });
      }
    }
    
    // Esperar a que la página cargue completamente buscando elementos específicos
    console.log("⏳ Esperando a que la página de historial cargue...");
    
    // Intentar diferentes selectores que puedan estar presentes en la página de historial
    try {
      await Promise.race([
        page.waitForSelector("table", { timeout: 10000 }),
        page.waitForSelector(".history-table", { timeout: 10000 }),
        page.waitForSelector("#history-table", { timeout: 10000 }),
        page.waitForSelector("[data-table-history]", { timeout: 10000 })
      ]);
    } catch (timeoutError) {
      console.log("⚠️ No se encontró la tabla, pero continuando para verificar la página...");
      // Continuar y verificar manualmente el contenido de la página
    }
    
    // Verificar si estamos en la página correcta analizando el contenido
    const isHistoryPage = await page.evaluate(() => {
      // Verificar por título de la página
      const pageTitle = document.title.toLowerCase();
      if (pageTitle.includes('history') || pageTitle.includes('historial')) return true;
      
      // Verificar por encabezados o textos relevantes
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      for (const heading of headings) {
        if (heading.textContent.toLowerCase().includes('history') || 
            heading.textContent.toLowerCase().includes('historial')) {
          return true;
        }
      }
      
      // Verificar si hay una tabla que pueda ser la de historial
      return document.querySelector('table') !== null;
    });
    
    if (!isHistoryPage) {
      throw new Error("No se pudo confirmar que estamos en la página de historial. Verifica la captura de pantalla.");
    }

    // Extraer datos de la tabla de historial
    console.log("🔍 Extrayendo datos de la tabla de historial...");
    const historyData = await page.evaluate(() => {
      // Función para obtener el texto seguro de un elemento
      const safeText = (element) => element ? element.textContent.trim() : "";
      
      // Buscar cualquier tabla en la página
      const tables = document.querySelectorAll("table");
      if (tables.length === 0) {
        return { error: "No se encontraron tablas en la página" };
      }
      
      // Usar la primera tabla encontrada (o intentar identificar la correcta)
      const table = tables[0];
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      
      if (rows.length === 0) {
        return { error: "La tabla no tiene filas en el cuerpo (tbody)" };
      }
      
      // Obtener encabezados para identificar las columnas correctamente
      const headers = Array.from(table.querySelectorAll("thead th"))
        .map(th => safeText(th).toLowerCase());
      
      // Mapear índices de columnas basados en encabezados
      const colIndices = {
        fecha: headers.findIndex(h => h.includes('date') || h.includes('fecha')),
        accion: headers.findIndex(h => h.includes('action') || h.includes('acción') || h.includes('accion')),
        admin: headers.findIndex(h => h.includes('admin') || h.includes('autor')),
        target: headers.findIndex(h => h.includes('target') || h.includes('objetivo')),
        detalles: headers.findIndex(h => h.includes('details') || h.includes('detalles'))
      };
      
      // Usar índices predeterminados si no se encuentran los encabezados
      const fallbackIndices = {
        fecha: colIndices.fecha >= 0 ? colIndices.fecha : 0,
        accion: colIndices.accion >= 0 ? colIndices.accion : 1,
        admin: colIndices.admin >= 0 ? colIndices.admin : 2,
        target: colIndices.target >= 0 ? colIndices.target : 3,
        detalles: colIndices.detalles >= 0 ? colIndices.detalles : 4
      };
      
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length === 0) return null;
        
        return {
          fecha: safeText(cells[fallbackIndices.fecha]),
          accion: safeText(cells[fallbackIndices.accion]),
          admin: safeText(cells[fallbackIndices.admin]),
          target: safeText(cells[fallbackIndices.target]),
          detalles: safeText(cells[fallbackIndices.detalles]),
          rawHTML: row.innerHTML // Para diagnóstico
        };
      }).filter(item => item !== null);
    });
    
    // Verificar si tenemos datos o un error
    if (historyData.error) {
      throw new Error(`Error al extraer datos: ${historyData.error}`);
    }

    // Guardar los datos del historial en un archivo
    ensureDirectoryExists(dataStoragePath);
    fs.writeFileSync(
      path.join(dataStoragePath, "txadmin-history.json"),
      JSON.stringify(historyData, null, 2),
      "utf8"
    );
    console.log(`💾 Datos de historial guardados en: txadmin-history.json (${historyData.length} registros)`);

    return {
      success: true,
      historyData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Error al navegar a la página de historial:", error);
    logError(error, { step: "history-navigation" });

    try {
      await captureErrorScreenshot(page, "history-error");
    } catch (screenshotError) {
      console.error(
        "No se pudo guardar la captura de error del historial:",
        screenshotError
      );
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Procesa los datos del historial para buscar entradas específicas
 * @param {Array} historyData Datos extraídos del historial
 * @param {Object} filters Filtros a aplicar (acción, admin, target, etc.)
 * @returns {Array} Entradas filtradas del historial
 */
function processHistoryData(historyData, filters = {}) {
  if (!Array.isArray(historyData)) {
    console.error("❌ Los datos del historial no son un array válido");
    return [];
  }

  console.log(`📊 Procesando ${historyData.length} entradas del historial...`);

  // Aplicar filtros si existen
  let filteredData = [...historyData];

  if (filters.accion) {
    filteredData = filteredData.filter((entry) =>
      entry.accion.toLowerCase().includes(filters.accion.toLowerCase())
    );
  }

  if (filters.admin) {
    filteredData = filteredData.filter((entry) =>
      entry.admin.toLowerCase().includes(filters.admin.toLowerCase())
    );
  }

  if (filters.target) {
    filteredData = filteredData.filter((entry) =>
      entry.target.toLowerCase().includes(filters.target.toLowerCase())
    );
  }

  if (filters.desde) {
    const desdeDate = new Date(filters.desde);
    filteredData = filteredData.filter((entry) => {
      try {
        const entryDate = new Date(entry.fecha);
        return entryDate >= desdeDate;
      } catch (e) {
        return true; // Si hay error al parsear la fecha, incluir la entrada
      }
    });
  }

  console.log(
    `✅ Encontradas ${filteredData.length} entradas que coinciden con los filtros`
  );
  return filteredData;
}

/**
 * Función principal para acceder y procesar el historial
 * @param {Object} browser Instancia del navegador de Puppeteer
 * @param {Object} config Configuración con URL y rutas
 * @param {Object} filters Filtros para procesar el historial
 * @returns {Promise<Object>} Resultado de la operación
 */
async function fetchHistory(browser, config, filters = {}) {
  const page = await browser.newPage();

  try {
    const historyResult = await navigateToHistoryPage(page, config);

    if (!historyResult.success) {
      return historyResult;
    }

    // Procesar y filtrar los datos si hay filtros
    if (Object.keys(filters).length > 0) {
      const processedData = processHistoryData(
        historyResult.historyData,
        filters
      );
      return {
        ...historyResult,
        filteredData: processedData,
      };
    }

    return historyResult;
  } catch (error) {
    console.error("❌ Error al obtener el historial:", error);
    logError(error, { step: "fetch-history", context: "history.js" });
    return {
      success: false,
      error: error.message,
    };
  } finally {
    await page.close();
  }
}

module.exports = {
  navigateToHistoryPage,
  processHistoryData,
  fetchHistory,
};
