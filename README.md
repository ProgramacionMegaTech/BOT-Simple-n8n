# n8n Certificados EPS

Automatización con n8n y Selenium para descargar certificados EPS desde el portal Simple.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Estructura del proyecto

```
n8n-Certificados-EPS/
├── docker-compose.yml
├── Dockerfile
├── server.js
├── data.js
├── shared/
├── Downloads/          # Certificados descargados
├── shared-downloads/   # Archivos temporales compartidos entre contenedores
├── logs/               # Logs del bot Selenium
└── n8n-data/           # Workflows y configuración de n8n
```

## Primer uso — preparar carpetas y permisos

Antes de levantar los contenedores por primera vez, ejecuta los siguientes comandos desde la raíz del proyecto:

```bash
# Crear carpetas de datos
mkdir -p ./n8n-data ./shared-downloads ./Downloads ./logs

# Asignar permisos para los procesos internos de los contenedores
sudo chown -R 1000:1000 ./n8n-data ./shared-downloads
chmod -R 777 ./Downloads ./logs
```

> **Por qué uid 1000:** el contenedor de n8n corre con el usuario `node` (uid 1000). Sin este permiso, n8n no puede escribir sus workflows ni configuración.

## Levantar los contenedores

```bash
# Primera vez — construir la imagen del bot y levantar todo
docker compose up --build -d

# Siguientes veces (sin cambios en el Dockerfile)
docker compose up -d
```

## Verificar que están corriendo

```bash
docker compose ps
```

## Ver logs

```bash
# Todos los servicios
docker compose logs -f

# Solo el bot Selenium
docker compose logs -f selenium-bot

# Solo n8n
docker compose logs -f n8n
```

## Acceder a los servicios

| Servicio | URL |
|---|---|
| n8n (interfaz web) | http://localhost:5678 |
| Bot Selenium (API) | http://localhost:5858 |
| VNC (visualizar Chrome) | localhost:5900 |

## Detener los contenedores

```bash
# Detener sin eliminar datos
docker compose down

# Detener y eliminar imágenes construidas (los datos en carpetas locales se conservan)
docker compose down --rmi local
```

> Los datos persisten siempre en las carpetas locales del proyecto, independientemente de si los contenedores están corriendo o eliminados.
