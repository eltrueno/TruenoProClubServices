# ===========================
# Stage 1: Build
# ===========================
FROM node:20-slim AS builder

RUN npm install -g pnpm

WORKDIR /workspace

# Copiar workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


COPY apps/discordbot/package.json ./apps/discordbot/
RUN pnpm install

# Copiar código
COPY apps/discordbot ./apps/discordbot

# ===========================
# Stage 2: Runtime
# ===========================
FROM node:20-slim

WORKDIR /app

COPY --from=builder /workspace ./

CMD ["node", "apps/discordbot/index.js"]