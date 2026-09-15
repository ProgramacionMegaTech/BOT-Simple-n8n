const fs = require('fs');
const path = require('path');
const logger = require('./logger');


// #region ESPERAR ELEMENTO
// `target` puede ser una Page o un FrameLocator, ambos exponen .locator()
async function esperarElemento(target, selector, timeout = 10000) {
    try {
        const locator = target.locator(selector).first();
        await locator.waitFor({ state: 'visible', timeout });
        return locator;
    } catch (error) {
        logger.error(`No se pudo encontrar el elemento: ${selector} | ${error.message}`);
        throw `No se pudo encontrar el elemento: ${selector}`;
    }
}


// #region HACER CLICK
async function hacerClick(target, selector, descripcion, timeout = 5000) {
    try {
        const locator = await esperarElemento(target, selector, timeout);
        await locator.click({ timeout });
        return locator;
    } catch (error) {
        logger.error(`Error al hacer click en ${descripcion}: ${error.message}`);
        throw 'Error en el portal';
    }
}


// #region LLENAR INPUT
async function llenarCampo(target, selector, texto, descripcion) {
    try {
        const locator = await esperarElemento(target, selector);
        await locator.fill(String(texto));
        return locator;
    } catch (error) {
        logger.error(`Error al llenar ${descripcion}: ${error.message}`);
        throw `Error al llenar ${descripcion}`;
    }
}


// #region SELECCIONAR SELECT
async function seleccionarOpcion(target, selector, valor, descripcion) {
    try {
        const locator = await esperarElemento(target, selector);
        await locator.selectOption(String(valor));
        return locator;
    } catch (error) {
        logger.error(`Error al seleccionar opción en ${descripcion}: ${error.message}`);
        throw `Error al seleccionar opción en ${descripcion}`;
    }
}


// #region NAVEGAR A URL
async function navegarA(page, url, descripcion) {
    console.log(`📄 Navegando a ${descripcion}...`);
    try {
        await page.goto(url);
    } catch (error) {
        logger.error(`Error al navegar a ${descripcion}: ${error.message}`);
        throw 'Error en el portal';
    }

    console.log(`✅ Navegación a ${descripcion} completada`);
}


// #region CONF DESCARGAS
function configurarDescarga(sessionId) {
    const downloadPath = path.resolve(__dirname, '..', 'temp_downloads', sessionId);

    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    return downloadPath;
}


// #region DESCARGAR ARCHIVO
// `page` se usa para escuchar el evento 'download' (siempre a nivel de página,
// incluso si el click que la dispara ocurre dentro de un iframe).
// `target` es quien recibe el click (Page o FrameLocator).
async function descargarArchivo(page, target, selector, descripcion, finalPath, timeout = 20000) {
    console.log('⏳ Esperando que se complete la descarga...');
    try {
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout }),
            target.locator(selector).click(),
        ]);

        await download.saveAs(finalPath);
        console.log(`✅ Descarga completada: ${path.basename(finalPath)}`);
        return finalPath;
    } catch (error) {
        logger.error(`Error al descargar ${descripcion}: ${error.message}`);
        throw new Error('Timeout: La descarga no se completó en el tiempo esperado');
    }
}


module.exports = {
    esperarElemento,
    hacerClick,
    llenarCampo,
    seleccionarOpcion,
    navegarA,
    configurarDescarga,
    descargarArchivo,
};
