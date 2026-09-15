const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');


const {
    hacerClick,
    llenarCampo,
    seleccionarOpcion,
    navegarA,
    configurarDescarga,
    descargarArchivo,
    esperarElemento,
} = require('./shared/helpers_playwright');


//#region EPS CODES
const epsCodes = {
    EPS037: "NUEVA EPS",
    EPS018: "SOS",
    EPS041: "NUEVA EPS MOVILIDAD",
    EPS008: "COMPENSAR",
    EPS017: "FAMISANAR",
    EPS005: "SANITAS",
    EPS010: "SURA"
}


//#region LOGIN
async function hacerLogin(page) {
    await navegarA(page, 'https://www.simple.co/sso/#/login', 'Página de login');
    await page.waitForTimeout(3000);
    await esperarElemento(page, '#login-continue', 3000);

    console.log('🚀 Haciendo Login...');
    await seleccionarOpcion(page, '#doc-types', "CC", 'Tipo de documento de identificación');
    await llenarCampo(page, '#nro-doc-login', "14467044", 'Número de identificación');
    console.log('⏳ reCaptcha...');
    await page.waitForTimeout(7000);

    console.log('⏳ Ingresando Password...');
    await hacerClick(page, '[id="0"]', 'Input password');
    await page.waitForTimeout(300);
    await hacerClick(page, '[id="4"]', 'Input password');
    await page.waitForTimeout(150);
    await hacerClick(page, '[id="1"]', 'Input password');
    await page.waitForTimeout(120);
    await hacerClick(page, '[id="1"]', 'Input password');
    await page.waitForTimeout(160);
    await hacerClick(page, '#login', 'Boton login');
    await page.waitForTimeout(7000);
}


//#region BUSCAR APORTANTE
async function buscarAportante(page, data, EPS_CODE) {

    // Busqueda del Aportate
    await seleccionarOpcion(page, '#doc-types', data.TIPO_EMPRESA_SALUD, 'Tipo de documento de identificación');
    await llenarCampo(page, '#numeroIdentificacion', data.NUMERO_EMPRESA_SALUD, 'Número de identificación');
    await hacerClick(page, '.btn.btn-tertiary', 'Boton Buscar Aportante');
    await page.waitForTimeout(2000);

    await hacerClick(page, '.aportante-card-hover', 'Ingresar al Aportante');
    await page.waitForTimeout(3000);

    await navegarA(page, 'https://www.simple.co/gestion/#/content-other-app/337?url=%2FWeb%2Ffaces%2Fpages%2Fcomprobantes%2Findividuales%2Findividuales.xhtml', 'Página de Informe individual');
    await page.waitForTimeout(3000);

    // Operar dentro del iframe
    const frame = page.frameLocator('#iframeApp');

    await llenarCampo(frame, '[id="tx_ntu:numeroPlanilla"]', data.NUMERO_PLANILLA, 'Input Número de planilla');
    await hacerClick(frame, '[id="radio_reporte:1"]', 'Tipo Reporte');
    await hacerClick(frame, 'xpath=//a[@id="href-tab2" and not(contains(@style,"display:none"))]', 'Tab Grupal');
    await page.waitForTimeout(1000);
    await hacerClick(frame, '[id="radio_administradora:0"]', 'Reporte por administradora');
    await page.waitForTimeout(1000);
    await seleccionarOpcion(frame, '#tipoAdministradora', "EPS", 'Tipo de administradora');
    await page.waitForTimeout(1000);
    await seleccionarOpcion(frame, '#codigoAdministradora', EPS_CODE, 'Tipo de administradora');

    const company = data.EMPRESA_SALUD;
    const nameAdmon = epsCodes[EPS_CODE];
    const numeroPlanilla = data.NUMERO_PLANILLA;

    const downloadPath = configurarDescarga('chrome-simple-session');
    const finalDir = path.join(downloadPath, data.OPERACION);
    fs.mkdirSync(finalDir, { recursive: true });

    const fileName = `${numeroPlanilla}_${company}_${nameAdmon}.pdf`;
    const finalPath = path.join(finalDir, fileName);

    // Descargar y guardar directamente en su destino final
    await descargarArchivo(page, frame, '#btnGenerarComprobante', 'Descargar', finalPath);
    console.log(`✅ El archivo ha sido renombrado a: ${fileName}`);

    await page.waitForTimeout(5000);

    return {
        result: true,
    };

}


async function certificadoIndividualSimple(data, EPS_CODE) {
    let context;

    try {
        // Configurar directorio de descarga
        configurarDescarga('chrome-simple-session');

        // Perfil independiente al de Selenium para evitar bloqueos de user-data-dir
        const userDataDir = path.join(__dirname, 'profiles', 'chrome-simple-session-playwright');

        const launchOptions = {
            headless: false,
            viewport: null,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--start-maximized',
                '--disable-blink-features=AutomationControlled',
            ],
        };

        if (process.env.CHROME_BIN) {
            launchOptions.executablePath = process.env.CHROME_BIN;
        } else {
            launchOptions.channel = 'chrome';
        }

        context = await chromium.launchPersistentContext(userDataDir, launchOptions);
        const page = context.pages()[0] || await context.newPage();

        console.log('🚀 Iniciando automatización...');

        await navegarA(page, 'https://www.simple.co/sso/#/', 'Página de Simple');
        await page.waitForTimeout(3000);

        let currentUrl = page.url();
        let response_buscarAportante = null;

        if (currentUrl === "https://www.simple.co/gestion/#/administrar-aportantes") {
            response_buscarAportante = await buscarAportante(page, data, EPS_CODE);
        } else if (currentUrl === "https://www.simple.co/sso/#/") {
            await hacerLogin(page);
            response_buscarAportante = await buscarAportante(page, data, EPS_CODE);
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
        if (context) {
            console.log('🔚 Cerrando navegador...');
            try {
                await context.close();
            } catch (closeError) {
                console.error('❌ Error al cerrar el navegador:', closeError);
            }
        }
    }
}

module.exports = certificadoIndividualSimple;
