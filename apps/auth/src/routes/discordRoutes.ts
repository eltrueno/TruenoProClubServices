import { Router } from "express"
import { discordService, isDiscordEnabled } from "../services/discordService.js"

const router = Router()

/**
 * Discord vinculado a la cuenta con sesión. Protegido en index.ts con requireAuth.
 * Vincular lo hace Better Auth (`POST /api/auth/link-social` con provider "discord").
 */

/** GET /api/discord: si se puede vincular (hay credenciales de Discord) y qué hay vinculado */
router.get("/", (req, res) => {
    res.json({
        status: "success",
        data: {
            enabled: isDiscordEnabled(),
            discordId: (req.user as any)?.discordId ?? null,
            discordName: (req.user as any)?.discordName ?? null,
        }
    })
})

/** DELETE /api/discord/link: desvincula Discord de la cuenta */
router.delete("/link", async (req, res) => {
    try {
        const unlinked = await discordService.unlink(req.user!.id)
        res.json({ status: "success", data: { unlinked } })
    } catch (error) {
        console.error("[discord] unlink:", error)
        res.status(500).json({ status: "error", message: "Internal server error" })
    }
})

export default router
