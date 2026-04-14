# Usar imagen base de Node.js 24.8.0 con Debian
FROM node:24.8.0-bookworm

# Instalar dependencias del sistema necesarias para Chrome, Selenium, X11 y pdftk
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    pdftk \
    # Servidor X virtual
    xvfb \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Instalar Google Chrome (última versión estable)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm install --production

# Copiar el resto del código
COPY . .

# Crear directorio de descargas con permisos amplios
RUN mkdir -p /app/Downloads /app/temp_downloads && \
    chmod -R 777 /app/Downloads /app/temp_downloads

# Crear script de inicio para Xvfb
RUN echo '#!/bin/bash\n\
    # Establecer umask para permisos amplios en archivos creados\n\
    umask 000\n\
    # Iniciar Xvfb\n\
    Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &\n\
    export DISPLAY=:99\n\
    sleep 2\n\
    # Iniciar VNC server (opcional, para ver la pantalla remotamente)\n\
    x11vnc -display :99 -nopw -listen 0.0.0.0 -xkb -ncache 10 -ncache_cr -forever &\n\
    # Iniciar window manager\n\
    fluxbox &\n\
    # Iniciar Node.js\n\
    node server.js' > /app/start.sh && chmod +x /app/start.sh

# Exponer el puerto del servidor y VNC
EXPOSE 5858 5900

# Variables de entorno para Chrome con interfaz gráfica
ENV CHROME_BIN=/usr/bin/google-chrome \
    DISPLAY=:99

# Comando para iniciar con Xvfb
CMD ["/app/start.sh"]