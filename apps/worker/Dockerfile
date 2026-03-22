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

# Copia package.json de la app y los packages compartidos
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/tsconfig.json ./apps/worker/
COPY apps/worker/src ./apps/worker/src
COPY packages/eafcapi/package.json ./packages/eafcapi/
COPY packages/eafcapi/tsconfig.json ./packages/eafcapi/
COPY packages/eafcapi/src ./packages/eafcapi/src

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install


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


WORKDIR /app

# Copiar el workspace (symlinks de pnpm incluidos)
COPY --from=builder /workspace ./

USER pptruser

# Puppeteer config
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Ejecuta TS directamente con ts-node + tsconfig-paths
CMD ["node", "apps/worker/dist/index.js"]