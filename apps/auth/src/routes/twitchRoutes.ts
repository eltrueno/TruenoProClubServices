import { Router } from "express"
import { twitchService } from "../services/twitchService.js"

const router = Router()

/**
 * GET /api/twitch/sync
 * Sincroniza el estado de Twitch del usuario autenticado (follow, sub, rol).
 */
router.get("/sync", async (req, res) => {
  try {
    const user = req.user!

    if (!user.twitchId) {
      return res.status(400).json({
        status: "error",
        message: "User not logged in or Twitch not linked"
      })
    }

    const result = await twitchService.syncTwitchDataManual(user)

    if (!result.ok) {
      switch (result.error.code) {
        case "NO_TWITCH_ACCOUNT":
          return res.status(404).json({ status: "error", message: "Twitch account not found" })
        case "MISSING_CHANNEL_ID":
          return res.status(500).json({ status: "error", message: "TWITCH_CHANNEL_ID not configured" })
        case "TOKEN_EXPIRED":
          return res.status(401).json({ status: "error", message: "Twitch token expired", code: "TWITCH_TOKEN_EXPIRED" })
        case "FOLLOW_CHECK_FAILED":
          // Twitch no respondió bien a ninguna de las dos consultas; no se ha cambiado nada
          return res.status(result.error.status >= 400 ? result.error.status : 502).json({
            status: "error",
            message: "Error checking Twitch follow status",
            code: "TWITCH_UNAVAILABLE",
            details: result.error.details
          })
        case "TOO_SOON":
          res.setHeader("Retry-After", String(result.error.retryAfterSeconds))
          return res.status(429).json({
            status: "error",
            message: "Sync requested too soon",
            code: "TWITCH_SYNC_TOO_SOON",
            retryAfterSeconds: result.error.retryAfterSeconds
          })
        default:
          return res.status(500).json({ status: "error", message: "Unknown error during sync" })
      }
    }

    res.json({ status: "success", ...result.data })
  } catch (error) {
    console.error("[twitchRoutes] /sync error:", error)
    res.status(500).json({ status: "error", message: "Internal server error" })
  }
})

export default router
