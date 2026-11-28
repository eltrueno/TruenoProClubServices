# ===========================
# Stage 1: Build
# ===========================
FROM node:24-bookworm AS builder

# Instala pnpm global
# Versión fijada (la de los workflows y el lockfile v9): sin fijar coge la última mayor y pnpm install falla
RUN npm install -g pnpm@10


# WORKDIR en la raíz del repo dentro de la imagen
WORKDIR /workspace

# Copia archivos de lock y package.json para cache de deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia package.json de la app y los packages compartidos
COPY apps/api/package.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/src ./apps/api/src
COPY packages/eafcapi/package.json ./packages/eafcapi/
COPY packages/eafcapi/tsconfig.json ./packages/eafcapi/
COPY packages/eafcapi/src ./packages/eafcapi/src
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src
COPY packages/mq/package.json ./packages/mq/
COPY packages/mq/tsconfig.json ./packages/mq/
COPY packages/mq/src ./packages/mq/src

# El postinstall de puppeteer descarga Chrome for Testing, que no existe para linux/arm64 (y aquí sobra:
# el runtime usa el chromium del sistema). Sin esto el build arm64 falla.
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install --frozen-lockfile


# Build de los packages compartidos y la app
RUN pnpm --filter @trueno-proclub-services/eafcapi build
RUN pnpm --filter @trueno-proclub-services/shared build
RUN pnpm --filter @trueno-proclub-services/mq build
RUN pnpm --filter @trueno-proclub-services/api build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:24-bookworm

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

# Ejecuta el build ESM
CMD ["node", "apps/api/dist/app.js"]