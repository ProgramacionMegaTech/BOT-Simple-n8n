const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

const { obtenerFecha } = require('./shared/utils');

const {
    esperarElemento,
    hacerClick,
    llenarCampo,
    seleccionarOpcion,
    navegarA,
    configurarDescarga,
    esperarDescarga,
} = require('./shared/helpers');


//#region EPS CODES
const epsCodes = {
    EPS037: "NUEVA EPS",
    EPS018: "SOS",
    EPS041: "NUEVA EPS MOVILIDAD",
    EPS008: "COMPENSAR",
    EPS017: "FAMISANAR"
}


//#region LOGIN
async function hacerLogin(driver) {
    await navegarA(driver, 'https://www.simple.co/sso/#/login', 'Página de login');
    await driver.sleep(3000);
    await esperarElemento(driver, By.id('login-continue'), 3000);

    console.log('🚀 Haciendo Login...');
    await seleccionarOpcion(driver, By.id('doc-types'), "CC", 'Tipo de documento de identificación');
    await llenarCampo(driver, By.id('nro-doc-login'), "14467044", 'Número de identificación');
    console.log('⏳ reCaptcha...');
    await driver.sleep(15000);

    console.log('⏳ Ingresando Password...');
    await hacerClick(driver, By.id('0'), 'Input password');
    await hacerClick(driver, By.id('9'), 'Input password');
    await hacerClick(driver, By.id('1'), 'Input password');
    await hacerClick(driver, By.id('1'), 'Input password');
    await hacerClick(driver, By.id('login'), 'Boton login');
    await driver.sleep(3000);
}


//#region BUSCAR APORTANTE
async function buscarPlanillaRetiro(driver, data) {

    // Busqueda del Aportate
    await seleccionarOpcion(driver, By.id('doc-types'), "NI", 'Tipo de documento de identificación Empersa');
    await llenarCampo(driver, By.id('numeroIdentificacion'), data.NIT_EMPRESA, 'Número de identificación');
    await hacerClick(driver, By.className('btn btn-tertiary'), 'Boton Buscar Aportante');
    await driver.sleep(2000);

    await hacerClick(driver, By.className('aportante-card-hover'), 'Ingresar al Aportante');
    await driver.sleep(3000);

    await navegarA(driver, 'https://www.simple.co/gestion/#/content-other-app/337?url=%2FWeb%2Ffaces%2Fpages%2Fcomprobantes%2Findividuales%2Findividuales.xhtml', 'Página de Informe individual');
    await driver.sleep(5000);

    // Llenar campos dentro del iframe
    const iframe = await driver.findElement(By.id('iframeApp'));
    await driver.switchTo().frame(iframe);

    await llenarCampo(driver, By.xpath('//*[@id="tx_ntu:numeroPlanilla"]'), data.NUMERO_PLANILLA, 'Input Número de planilla');
    await driver.sleep(500);
    await seleccionarOpcion(driver, By.xpath('//*[@id="tipoDocumentoCotizante"]'), data.TIPO_DOCUMENTO, 'Tipo de documento de identificación Cliente');
    await driver.sleep(500);
    await llenarCampo(driver, By.xpath('//*[@id="inputNroDocCotizante"]'), data.DOCUMENTO_CLIENTE, 'Input Número de documento');


    await hacerClick(driver, By.id('btnGenerarComprobante'), 'Descargar');

    // Esperar y capturar el PDF descargado
    // let downloadPath;

    const downloadPath = configurarDescarga('chrome-simple-session');
    const pdfPath = await esperarDescarga(downloadPath);

    const currentDate = data.FECHA_OPERACION;
    const company = data.NOMBRE_EMPRESA;
    const numeroPlanilla = data.NUMERO_PLANILLA
    const documentoCliente = data.DOCUMENTO_CLIENTE

    const finalDir = path.join(path.dirname(pdfPath), `${company}_${currentDate}`);
    fs.mkdirSync(finalDir, { recursive: true });

    const fileName = `${company}_${numeroPlanilla}_${documentoCliente}.pdf`;
    const finalPath = path.join(finalDir, fileName);

    fs.renameSync(pdfPath, finalPath);
    console.log(`✅ El archivo ha sido renombrado a: ${fileName}`);

    await driver.sleep(5000);

    // Regresar al contenido principal fuera del iframe
    await driver.switchTo().defaultContent();

    return {
        result: true,
    };

}


async function planillasRetiroSimple(data) {
    let driver;

    try {
        // Configurar directorio de descarga
        const downloadPath = configurarDescarga('chrome-simple-session');

        // Configurar opciones de Chrome para descargas
        const options = new chrome.Options();
        options.addArguments(`--user-data-dir=${path.join(__dirname, 'profiles', 'chrome-simple-session')}`);
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--window-size=1920,1080');
        options.addArguments('--start-maximized');
        options.addArguments('--disable-blink-features=AutomationControlled');

        const prefs = {
            'download.default_directory': downloadPath,
            'download.prompt_for_download': false,
            'plugins.always_open_pdf_externally': true,
            'plugins.plugins_disabled': ['Chrome PDF Viewer']
        };
        options.setUserPreferences(prefs);

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        console.log('🚀 Iniciando automatización...');

        await navegarA(driver, 'https://www.simple.co/sso/#/', 'Página de Simple');
        await driver.sleep(3000);

        let currentUrl = await driver.getCurrentUrl();
        let response_buscarPlanillaRetiro = null;

        if (currentUrl === "https://www.simple.co/gestion/#/administrar-aportantes") {
            response_buscarPlanillaRetiro = await buscarPlanillaRetiro(driver, data);
        } else if (currentUrl === "https://www.simple.co/sso/#/") {
            await hacerLogin(driver);
            response_buscarPlanillaRetiro = await buscarPlanillaRetiro(driver, data);
        } else {
            console.warn('⚠️ URL no reconocida:', currentUrl);
            return {
                result: false,
                error: 'URL no reconocida'
            };
        }

        // Asegurar que siempre retornamos un objeto válido
        return {
            result: response_buscarPlanillaRetiro?.result || false,
        };

    } catch (error) {
        console.error('❌ Ocurrió un error durante la automatización:', error);
        // IMPORTANTE: Retornar un objeto en caso de error
        return {
            result: false,
            error: error.message
        };
    } finally {
        if (driver) {
            console.log('🔚 Cerrando navegador...');
            try {
                await driver.quit();
            } catch (quitError) {
                console.error('❌ Error al cerrar el navegador:', quitError);
            }
        }
    }
}

module.exports = planillasRetiroSimple;


