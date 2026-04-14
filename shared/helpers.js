const { By, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');


// #region ESPERAR ELEMENTO
async function esperarElemento(driver, locator, timeout = 10000) {
    try {
        return await driver.wait(until.elementLocated(locator), timeout);
    } catch (error) {
        logger.error(`No se pudo encontrar el elemento: ${locator} | ${error.message}`);
        throw (`No se pudo encontrar el elemento: ${locator}`);
    }
}


// #region HACER CLICK
async function hacerClick(driver, locator, descripcion, timeout = 5000) {
    try {
        const elemento = await esperarElemento(driver, locator, timeout);
        await driver.wait(until.elementIsEnabled(elemento), timeout);
        await elemento.click();
        return elemento;
    } catch (error) {
        logger.error(`Error al hacer click en ${descripcion}: ${error.message}`);
        throw "Error en el portal de la Equidad";
    }
}


// #region LLENAR INPUT
async function llenarCampo(driver, locator, texto, descripcion) {
    try {
        const elemento = await esperarElemento(driver, locator);
        await elemento.clear();
        await elemento.sendKeys(texto);
        return elemento;
    } catch (error) {
        logger.error(`Error al llenar ${descripcion}: ${error.message}`);
        throw (`Error al llenar ${descripcion}`);
    }
}


// #region SELECCIONAR SELECT
async function seleccionarOpcion(driver, locator, valor, descripcion) {
    try {
        const selectElement = await esperarElemento(driver, locator);
        const opcion = await selectElement.findElement(By.css(`option[value="${valor}"]`));
        await opcion.click();
        return selectElement;
    } catch (error) {
        logger.error(`Error al seleccionar opción en ${descripcion}: ${error.message}`);
        throw (`Error al seleccionar opción en ${descripcion}`);
    }
}


// #region NAVEGAR A URL
async function navegarA(driver, url, descripcion) {
    console.log(`📄 Navegando a ${descripcion}...`);
    try {
        await driver.get(url);
    } catch (error) {
        logger.error(`Error al navegar a ${descripcion}: ${error.message}`);
        throw "Error en el portal de la Equidad";
    }

    console.log(`✅ Navegación a ${descripcion} completada`);
}


// #region CONF DESCARGAS
function configurarDescarga(sessionId) {
    // const downloadPath = path.resolve(__dirname, 'temp_downloads', sessionId);
    const downloadPath = path.resolve(__dirname, '..', 'temp_downloads', sessionId);

    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    return downloadPath;
}


// #region ESPERAR DESCARGA
async function esperarDescarga(downloadPath, timeout = 10000) {
    console.log('⏳ Esperando que se complete la descarga...');

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const files = fs.readdirSync(downloadPath);

        const pdfFiles = files.filter(file =>
            file.endsWith('.pdf') &&
            !file.endsWith('.crdownload') &&
            !file.endsWith('.tmp')
        );

        if (pdfFiles.length > 0) {
            const pdfPath = path.join(downloadPath, pdfFiles[0]);
            console.log(`✅ Descarga completada: ${pdfFiles[0]}`);
            return pdfPath;
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    throw new Error('Timeout: La descarga no se completó en el tiempo esperado');
}



module.exports = {
    esperarElemento,
    hacerClick,
    llenarCampo,
    seleccionarOpcion,
    navegarA,
    configurarDescarga,
    esperarDescarga,
};
