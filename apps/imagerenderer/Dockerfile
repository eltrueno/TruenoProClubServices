# ===========================
# Stage 1: Build
# ===========================
FROM node:20-bookworm AS builder

# Instala pnpm global
RUN npm install -g pnpm

# WORKDIR en la raíz del repo dentro de la imagen
WORKDIR /workspace

# Copia archivos de lock y package.json para cache de deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia package.json de la app y archivos necesarios para el build
COPY apps/imagerenderer/package.json ./apps/imagerenderer/
COPY apps/imagerenderer/tsconfig.json ./apps/imagerenderer/
COPY apps/imagerenderer/src ./apps/imagerenderer/src

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install

# Build de la app
RUN pnpm --filter @trueno-proclub-services/imagerenderer build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:20-bookworm

# Instala Chromium y deps del sistema para Puppeteer
RUN apt-get update \
    && apt-get install -y \
        chromium \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-khmeros \
        fonts-kacst \
        fonts-freefont-ttf \
        libxss1 \
        dbus \
        dbus-x11 \
        --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r pptruser \
    && useradd -rm -g pptruser -G audio,video pptruser

WORKDIR /app

# Copiar el workspace (symlinks de pnpm incluidos)
COPY --from=builder /workspace ./

# Crear el directorio para cache de imágenes y dar permisos
RUN mkdir -p apps/imagerenderer/imagescache && chown -R pptruser:pptruser apps/imagerenderer/imagescache

USER pptruser

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Exponer el puerto por defecto (80)
EXPOSE 80

# Ejecutar la app compilada
CMD ["node", "apps/imagerenderer/dist/index.js"]
