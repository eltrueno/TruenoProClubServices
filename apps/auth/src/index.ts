import "dotenv/config"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { connectToDatabase, db } from "./db/index.js"
import { createRequireAuth, requireRole } from "./middleware/requireAuth.js"
import twitchRoutes from "./routes/twitchRoutes.js"
import { twitchService } from "./services/twitchService.js"
import { startTwitchSyncJob } from "./services/twitchSyncJob.js"
import { initTokenCrypto } from "./services/tokenCrypto.js"
import { createAuth, User } from "@trueno-proclub-services/auth"
import publicRoutes from "./routes/publicRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import { UserRole } from "@trueno-proclub-services/shared"

const app = express()
export const auth = createAuth(db, {
  // Cada inicio de sesión refresca follow/sub/rol (antes solo se hacía el primero)
  onSignIn: async (user: User) => {
    const result = await twitchService.syncTwitchData(user)
    if (!result.ok) console.warn(`[auth] Twitch sync al iniciar sesión (${user.id}): ${result.error.code}`)
  },
  // Al leer la sesión, si los datos de Twitch son viejos se refrescan en segundo plano.
  // Esta petición devuelve los de antes; la siguiente ya trae los nuevos.
  onSessionRead: (user: User) => {
    if (!twitchService.isStale(user)) return
    twitchService.syncTwitchData(user).catch((err) => console.error("[auth] Twitch sync en segundo plano:", err))
  },
})

const requireAuth = createRequireAuth(auth)

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

const DEVMODE = process.env.DEVMODE === "true";

app.set("trust proxy", true)
app.use(cors({
  origin: DEVMODE ? true : ALLOWED_ORIGINS,
  credentials: true,
}));

if (DEVMODE) {
  console.warn("### DEVMODE ACTIVATED ###");
}

// Better Auth handles everything under /api/auth/*
app.all("/api/auth/*", toNodeHandler(auth))

// Public routes (unauthenticated)
app.use("/api/public", publicRoutes)

// Custom API routes protected by middleware
app.use("/api/twitch", requireAuth, twitchRoutes)

// Admin routes (session + admin role)
app.use("/api/admin", requireAuth, requireRole(UserRole.admin), adminRoutes)

app.get("/health", (_, res) => {
  res.json({ status: "ok" })
})

const PORT = process.env.PORT || 3001

async function start() {
  try {
    await connectToDatabase()
    console.log("Connected to MongoDB")

    // Clave para leer/guardar los tokens de Twitch cifrados igual que Better Auth
    await initTokenCrypto(auth)

    app.listen(PORT, () => {
      console.log(`Auth service ready at http://localhost:${PORT}`)
    })
    startTwitchSyncJob()
  } catch (error) {
    console.error("Failed to start auth service:", error)
    process.exit(1)
  }
}

start()
