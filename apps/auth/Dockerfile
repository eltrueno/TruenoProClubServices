# ===========================
# Stage 1: Build
# ===========================
FROM node:20-alpine AS builder

# Instala pnpm global
RUN npm install -g pnpm

# WORKDIR en la raíz del repo dentro de la imagen
WORKDIR /workspace

# Copia archivos de lock y package.json para cache de deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copia package.json de la app
COPY apps/auth/package.json ./apps/auth/
COPY apps/auth/tsconfig.json ./apps/auth/
COPY apps/auth/src ./apps/auth/src
COPY packages/auth/package.json ./packages/auth/
COPY packages/auth/tsconfig.json ./packages/auth/
COPY packages/auth/src ./packages/auth/src

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install

# Build de la app
RUN pnpm --filter @trueno-proclub-services/auth build
RUN pnpm --filter @trueno-proclub-services/authservice build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:20-alpine

WORKDIR /app

# Copiar el workspace (symlinks de pnpm incluidos)
COPY --from=builder /workspace ./

# Ejecuta el build
CMD ["node", "apps/auth/dist/index.js"]
