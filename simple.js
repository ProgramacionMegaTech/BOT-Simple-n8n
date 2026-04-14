const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');


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
    await driver.sleep(60000);

    console.log('⏳ Ingresando Password...');
    await hacerClick(driver, By.id('0'), 'Input password');
    await hacerClick(driver, By.id('9'), 'Input password');
    await hacerClick(driver, By.id('1'), 'Input password');
    await hacerClick(driver, By.id('1'), 'Input password');
    await hacerClick(driver, By.id('login'), 'Boton login');
    await driver.sleep(3000);
}


//#region BUSCAR APORTANTE
async function buscarAportante(driver, data, EPS_CODE) {

    // Busqueda del Aportate
    await seleccionarOpcion(driver, By.id('doc-types'), data.TIPO_EMPRESA_SALUD, 'Tipo de documento de identificación');
    await llenarCampo(driver, By.id('numeroIdentificacion'), data.NUMERO_EMPRESA_SALUD, 'Número de identificación');
    await hacerClick(driver, By.className('btn btn-tertiary'), 'Boton Buscar Aportante');
    await driver.sleep(2000);

    await hacerClick(driver, By.className('aportante-card-hover'), 'Ingresar al Aportante');
    await driver.sleep(3000);

    await navegarA(driver, 'https://www.simple.co/gestion/#/content-other-app/337?url=%2FWeb%2Ffaces%2Fpages%2Fcomprobantes%2Findividuales%2Findividuales.xhtml', 'Página de Informe individual');
    await driver.sleep(3000);

    // Llenar campos dentro del iframe
    const iframe = await driver.findElement(By.id('iframeApp'));
    await driver.switchTo().frame(iframe);

    await llenarCampo(driver, By.xpath('//*[@id="tx_ntu:numeroPlanilla"]'), data.NUMERO_PLANILLA, 'Input Número de planilla');
    await hacerClick(driver, By.xpath('//*[@id="radio_reporte:1"]'), 'Tipo Reporte');
    await hacerClick(driver, By.xpath('//a[@id="href-tab2" and not(contains(@style,"display:none"))]'), 'Tab Grupal');
    await driver.sleep(1000);
    await hacerClick(driver, By.xpath('//*[@id="radio_administradora:0"]'), 'Reporte por administradora');
    await driver.sleep(1000);
    await seleccionarOpcion(driver, By.id('tipoAdministradora'), "EPS", 'Tipo de administradora');
    await driver.sleep(1000);
    await seleccionarOpcion(driver, By.id('codigoAdministradora'), EPS_CODE, 'Tipo de administradora');
    await hacerClick(driver, By.id('btnGenerarComprobante'), 'Descargar');

    // Esperar y capturar el PDF descargado
    // let downloadPath;

    const downloadPath = configurarDescarga('chrome-simple-session');
    const pdfPath = await esperarDescarga(downloadPath);

    const company = data.EMPRESA_SALUD;
    const nameAdmon = epsCodes[EPS_CODE];
    const numeroPlanilla = data.NUMERO_PLANILLA

    const finalDir = path.join(path.dirname(pdfPath), data.OPERACION);
    fs.mkdirSync(finalDir, { recursive: true });

    const fileName = `${numeroPlanilla}_${company}_${nameAdmon}.pdf`;
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


async function certificadoIndividualSimple(data, EPS_CODE) {
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
        let response_buscarAportante = null;

        if (currentUrl === "https://www.simple.co/gestion/#/administrar-aportantes") {
            response_buscarAportante = await buscarAportante(driver, data, EPS_CODE);
        } else if (currentUrl === "https://www.simple.co/sso/#/") {
            await hacerLogin(driver);
            response_buscarAportante = await buscarAportante(driver, data, EPS_CODE);
        } else {
            console.warn('⚠️ URL no reconocida:', currentUrl);
            return {
                result: false,
                error: 'URL no reconocida'
            };
        }

        // Asegurar que siempre retornamos un objeto válido
        return {
            result: response_buscarAportante?.result || false,
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

module.exports = certificadoIndividualSimple;


