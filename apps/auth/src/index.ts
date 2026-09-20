import "dotenv/config"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { connectToDatabase, db } from "./db/index.js"
import { createRequireAuth, requireRole } from "./middleware/requireAuth.js"
import twitchRoutes from "./routes/twitchRoutes.js"
import { twitchService } from "./services/twitchService.js"
import { createAuth, User } from "@trueno-proclub-services/auth"
import publicRoutes from "./routes/publicRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import { UserRole } from "@trueno-proclub-services/shared"

const app = express()
export const auth = createAuth(db, async (user: User) => {
  await twitchService.syncTwitchData(user)
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

    app.listen(PORT, () => {
      console.log(`Auth service ready at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error("Failed to start auth service:", error)
    process.exit(1)
  }
}

start()
