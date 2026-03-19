# ===========================
# Stage 1: Build
# ===========================
FROM node:20-bookworm AS builder

# Instala pnpm global
RUN npm install -g pnpm

# Definimos un ARG que indica la raíz del repo relativa al Dockerfile
ARG ROOT=../.. 

# WORKDIR en la raíz del repo dentro de la imagen
WORKDIR /workspace

# Copia archivos de lock y package.json para cache de deps
COPY $ROOT/package.json $ROOT/pnpm-lock.yaml $ROOT/pnpm-workspace.yaml ./

# Copia package.json de la app y los packages compartidos
COPY ./package.json ./apps/api/
COPY $ROOT/packages/eafcapi/package.json $ROOT/packages/eafcapi/

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install --frozen-lockfile

# Copia todo el código desde la raíz
COPY $ROOT ./

# Build de los packages compartidos y la app
RUN pnpm --filter @trueno-proclub-services/eafcapi build
RUN pnpm --filter @trueno-proclub-services/worker build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:20-bookworm

# Instala Chromium y deps del sistema
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

USER pptruser
WORKDIR /app

# Copia node_modules completos y código
COPY --from=builder /app ./

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ejecuta TS directamente con ts-node + tsconfig-paths
CMD ["node", "-r", "ts-node/register/transpile-only", "-r", "tsconfig-paths/register", "src/index.ts"]