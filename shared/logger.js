// logger.js
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Carpeta donde se guardarán los logs
const logDir = path.join(__dirname, '..', 'logs');

// Crear carpeta si no existe
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const rotateTransport = new DailyRotateFile({
    dirname: logDir,
    filename: 'error-%DATE%.log',   // Nombre de archivo con fecha
    datePattern: 'YYYY-MM-DD',      // Se crea un archivo por día
    zippedArchive: true,            // Comprimir logs antiguos (.gz)
    maxSize: '20m',                 // Máx 20MB por archivo
    maxFiles: '14d',                // Mantener solo 14 días de logs
    level: 'error'                  // Solo errores
});

const logger = createLogger({
    level: 'error',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack }) => {
            return `[${timestamp}] [${level.toUpperCase()}] [${message}]`;
        })
    ),
    transports: [
        new transports.Console(), // Mostrar en consola
        rotateTransport           // Guardar con rotación diaria
    ]
});

module.exports = logger;
