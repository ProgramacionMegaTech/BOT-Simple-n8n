function obtenerFecha() {
    const ahora = new Date();

    // Opciones para asegurar el formato de 24 horas y ceros a la izquierda
    const opciones = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    // Reemplazamos las barras y comas por guiones bajos
    return ahora.toLocaleString('es-ES', opciones)
        .replace(/\//g, '_')   // Cambia las barras del formato de fecha por _
        .replace(', ', '_')    // Cambia la coma y espacio que separa fecha y hora por _
        .replace(/:/g, '_');   // Cambia los dos puntos de la hora por _
}

module.exports = {
    obtenerFecha
};