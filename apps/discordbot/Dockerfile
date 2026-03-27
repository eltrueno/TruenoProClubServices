# ===========================
# Stage 1: Build
# ===========================
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /workspace

# Copiar archivos base del workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar el cliente (dependencia interna necesaria)
COPY packages/image-renderer-client ./packages/image-renderer-client

# Copiar la app del bot
COPY apps/discordbot ./apps/discordbot

# Instalar todas las dependencias del workspace
RUN pnpm install

# Compilar el cliente para generar el /dist que usa el bot
RUN pnpm --filter @trueno-proclub-services/imagerenderer-client build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:20-slim

WORKDIR /app

# Copiar el workspace completo
COPY --from=builder /workspace ./

# IMPORTANTE: Cambiamos al directorio del bot para que las rutas relativas funcionen
WORKDIR /app/apps/discordbot

CMD ["node", "index.js"]