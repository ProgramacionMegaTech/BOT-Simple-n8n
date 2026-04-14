const express = require('express');
const cors = require('cors');

const certificadoIndividualSimple = require('./simple')
const mergePDFsByAdministradora = require('./shared/merge_pdf')

const app = express();
const PORT = process.env.PORT || 5858;


//#region MIDDLEWARES

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);

    res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
    });
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


async function descargarConReintento(data, codigoEPS) {
    let response = await certificadoIndividualSimple(data, codigoEPS);

    // Si falló (result es false), lo intentamos una vez más
    if (response && response.result === false) {
        console.log(`⚠️ Falló el primer intento para ${codigoEPS}. Reintentando...`);
        response = await certificadoIndividualSimple(data, codigoEPS);
    }

    return response;
}


//#region END POINTS
app.post('/bot/n8n', async (req, res) => {
    const data = req.body;

    let rest_nuevaEPS = {};
    let rest_SOS = {};
    let rest_nuevaEPSMovilidad = {};
    let rest_compensar = {};

    console.log(data);


    try {
        if (data.COMPENSAR > 0) {
            console.log('🔄 Descargando Certificados de COMPENSAR...');
            rest_compensar = await descargarConReintento(data, "EPS008");
        }

        if (data.NUEVA_EPS > 0) {
            console.log('🔄 Descargando Certificados de Nueva EPS...');
            rest_nuevaEPS = await descargarConReintento(data, "EPS037");
        }

        if (data.SOS > 0) {
            console.log('🔄 Descargando Certificados de SOS...');
            rest_SOS = await descargarConReintento(data, "EPS018");
        }

        if (data.NUEVA_EPS_M > 0) {
            console.log('🔄 Descargando Certificados de Nueva EPS Movilidad...');
            rest_nuevaEPSMovilidad = await descargarConReintento(data, "EPS041");
        }

        if (data.FAMISANAR > 0) {
            console.log('🔄 Descargando Certificados de Famisanar...');
            // Corregido: asignación a rest_famisanar
            rest_famisanar = await descargarConReintento(data, "EPS017");
        }

        const response = {
            COMPENSAR: (typeof rest_compensar !== 'undefined') ? rest_compensar.result : null,
            NUEVA_EPS: (typeof rest_nuevaEPS !== 'undefined') ? rest_nuevaEPS.result : null,
            SOS: (typeof rest_SOS !== 'undefined') ? rest_SOS.result : null,
            NUEVA_EPS_M: (typeof rest_nuevaEPSMovilidad !== 'undefined') ? rest_nuevaEPSMovilidad.result : null,
            FAMISANAR: (typeof rest_famisanar !== 'undefined') ? rest_famisanar.result : null
        };

        res.json(response);

    } catch (error) {
        console.error('Error ejecutando el bot:', error);
    }

});


app.post('/bot/n8n/mergePdf', async (req, res) => {
    const data = req.body;

    try {
        mergePDFsByAdministradora(data)
            .then(() => {
                res.json({
                    result: true
                });
            })
            .catch((error) => {
                console.error('\n✗ Error fatal:', error.message);
                process.exit(1);
            });

    } catch (error) {
        console.error('Error ejecutando el bot:', error);
    }

});


//#region INIT SERVER
// Iniciar servidor - Escuchar en todas las interfaces de red
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
});


module.exports = app;