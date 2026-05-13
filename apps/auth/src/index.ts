import "dotenv/config"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { connectToDatabase, db } from "./db/index"
import { createRequireAuth } from "./middleware/requireAuth"
import twitchRoutes from "./routes/twitchRoutes"
import { twitchService } from "./services/twitchService"
import { createAuth, User } from "@trueno-proclub-services/auth"

const app = express()
export const auth = createAuth(db, async (user: User) => {
  await twitchService.syncTwitchData(user)
})

const requireAuth = createRequireAuth(auth)

app.set("trust proxy", true)
app.use(cors({
  origin: [process.env.WWW_URL || "https://www.casemurocity.org"],
  credentials: true
}))

// Better Auth handles everything under /api/auth/*
app.all("/api/auth/*", toNodeHandler(auth))

// Custom API routes protected by middleware
app.use("/api/twitch", requireAuth, twitchRoutes)

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
