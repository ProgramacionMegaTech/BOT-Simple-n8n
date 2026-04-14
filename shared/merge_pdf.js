const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');


/**
 * Verifica si pdftk está instalado en el sistema
 */
function checkPdftkInstalled() {
    try {
        execSync('pdftk --version', { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Función principal para combinar PDFs usando pdftk
 * @param {Object} data - Estructura: { COMPAÑIA: { ADMINISTRADORA: [archivos] } }
 */
async function mergePDFsByAdministradora(data) {
    try {
        // Verificar si pdftk está instalado
        if (!checkPdftkInstalled()) {
            console.error('❌ ERROR: pdftk no está instalado en el sistema');
            console.log('\n📦 Para instalar pdftk:');
            console.log('   Ubuntu/Debian: sudo apt-get install pdftk');
            console.log('   Fedora/RHEL:   sudo dnf install pdftk');
            console.log('   Arch Linux:    sudo pacman -S pdftk');
            console.log('   macOS:         brew install pdftk-java\n');
            throw new Error('pdftk no está instalado');
        }

        // Configuración
        const filesFromPath = path.resolve(__dirname, '..', 'temp_downloads', 'chrome-simple-session', data.path);
        // const filesFromPath = path.join('/app/temp_downloads/chrome-simple-session', data.path);
        const outputPath = path.resolve(__dirname, '..', 'Downloads', data.path);

        // Crear carpeta de salida si no existe
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
            console.log(`✓ Carpeta creada: ${outputPath}`);
        }

        const items = data.data;

        // Recorrer cada compañía
        for (const [compania, administradoras] of Object.entries(items)) {
            console.log(`\n📁 Procesando compañía: ${compania}`);

            // Recorrer cada administradora
            for (const [administradora, archivos] of Object.entries(administradoras)) {
                console.log(`  → Administradora: ${administradora} (${archivos.length} archivos)`);

                // Validar que hay archivos para combinar
                if (!archivos || archivos.length === 0) {
                    console.log(`  ⚠️  No hay archivos para combinar`);
                    continue;
                }

                // Verificar que todos los archivos existen
                const validFiles = [];
                for (const archivo of archivos) {
                    const filePath = path.join(filesFromPath, archivo);
                    if (fs.existsSync(filePath)) {
                        validFiles.push(filePath);
                        console.log(`     ✓ Encontrado: ${archivo}`);
                    } else {
                        console.warn(`     ⚠️  Archivo no encontrado: ${archivo}`);
                    }
                }

                // Si no hay archivos válidos, continuar
                if (validFiles.length === 0) {
                    console.log(`  ⚠️  No se pudo crear el PDF (ningún archivo válido)\n`);
                    continue;
                }

                // Generar nombre del archivo de salida
                const outputFileName = `${compania}_${administradora}.pdf`
                    .replace(/\s+/g, '_')  // Reemplazar espacios por guiones bajos
                    .replace(/[^a-zA-Z0-9_.-]/g, '');  // Eliminar caracteres especiales

                const outputFilePath = path.join(outputPath, outputFileName);

                try {
                    // Construir comando pdftk
                    // Escapar rutas con comillas para manejar espacios
                    const inputFiles = validFiles.map(f => `"${f}"`).join(' ');
                    const command = `pdftk ${inputFiles} cat output "${outputFilePath}"`;

                    console.log(`  🔧 Ejecutando pdftk...`);

                    // Ejecutar pdftk
                    execSync(command, { stdio: 'pipe' });

                    // Verificar que el archivo se creó correctamente
                    if (fs.existsSync(outputFilePath)) {
                        const stats = fs.statSync(outputFilePath);
                        console.log(`  ✅ PDF creado: ${outputFileName} (${validFiles.length} archivos, ${(stats.size / 1024).toFixed(2)} KB)\n`);
                    } else {
                        console.error(`  ❌ Error: El archivo no se creó correctamente\n`);
                    }

                } catch (error) {
                    console.error(`  ❌ Error al combinar PDFs:`, error.message);
                    console.log(`     Archivos intentados: ${validFiles.length}`);
                }
            }
        }

        console.log('\n🎉 Proceso completado exitosamente!');
    } catch (error) {
        console.error('\n❌ Error en el proceso:', error.message);
        throw error;
    }
}


module.exports = mergePDFsByAdministradora;