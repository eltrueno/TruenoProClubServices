# ===========================
# Stage 1: Build
# ===========================
FROM node:24-slim AS builder

# Versión fijada (la de los workflows y el lockfile v9): sin fijar coge la última mayor y pnpm install falla
RUN npm install -g pnpm@10

WORKDIR /workspace

# Copiar archivos base del workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copiar el cliente (dependencia interna necesaria)
COPY packages/image-renderer-client ./packages/image-renderer-client

# Copiar la app del bot
COPY apps/discordbot ./apps/discordbot

# Instalar todas las dependencias del workspace
RUN pnpm install --frozen-lockfile

# Compilar el cliente para generar el /dist que usa el bot
RUN pnpm --filter @trueno-proclub-services/imagerenderer-client build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:24-slim

WORKDIR /app

# Copiar el workspace completo
COPY --from=builder /workspace ./

# IMPORTANTE: Cambiamos al directorio del bot para que las rutas relativas funcionen
WORKDIR /app/apps/discordbot

CMD ["node", "index.js"]