import "dotenv/config"
import express from "express"
import cors from "cors"
import { toNodeHandler } from "better-auth/node"
import { auth } from "./auth"
import { connectToDatabase } from "./db"

const app = express()

app.set("trust proxy", true)
app.use(cors({
  origin: [process.env.WWW_URL || "https://www.casemurocity.org"],
  credentials: true
}))

// Better Auth handles everything under /api/auth/*
app.all("/api/auth/*", toNodeHandler(auth))

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "auth" })
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
