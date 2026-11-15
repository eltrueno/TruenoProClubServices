# ===========================
# Stage 1: Build
# ===========================
FROM node:24-alpine AS builder

# Instala pnpm global
# Versión fijada (la de los workflows y el lockfile v9): sin fijar coge la última mayor y pnpm install falla
RUN npm install -g pnpm@10

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
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/
COPY packages/shared/src ./packages/shared/src

# Instala dependencias desde la raíz (pnpm detecta workspaces)
RUN pnpm install

# Build de la app
RUN pnpm --filter @trueno-proclub-services/shared build
RUN pnpm --filter @trueno-proclub-services/auth build
RUN pnpm --filter @trueno-proclub-services/authservice build

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:24-alpine

WORKDIR /app

# Copiar el workspace (symlinks de pnpm incluidos)
COPY --from=builder /workspace ./

# Ejecuta el build
CMD ["node", "apps/auth/dist/index.js"]
