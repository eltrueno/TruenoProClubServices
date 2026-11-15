import { Router } from "express"
import { accountLookupService, MAX_LOOKUP } from "../services/accountLookupService.js"

const router = Router()

const list = (value: unknown): string[] =>
    typeof value === "string" ? [...new Set(value.split(",").map((s) => s.trim()).filter(Boolean))] : []

/**
 * GET /api/v1/accounts?twitchIds=1,2&twitchLogins=a,b&discordIds=3,4&ids=x,y
 * Cuentas (con su jugador vinculado) a partir de su id de Twitch, su nombre de usuario de
 * Twitch, su id de Discord o su id de cuenta. Protegido en index.ts con requireApiToken. Las que no existen
 * simplemente no vienen en la respuesta.
 */
router.get("/accounts", async (req, res) => {
    const result = await accountLookupService.lookup({
        ids: list(req.query.ids),
        twitchIds: list(req.query.twitchIds),
        twitchLogins: list(req.query.twitchLogins),
        discordIds: list(req.query.discordIds),
    })

    if (!result.ok) {
        switch (result.error.code) {
            case "NO_VALID_PARAMS":
                return res.status(400).json({ status: "error", code: "NO_VALID_PARAMS", message: "Use twitchIds, twitchLogins, discordIds or ids (comma separated)" })
            case "TOO_MANY":
                return res.status(400).json({ status: "error", code: "TOO_MANY", message: `At most ${MAX_LOOKUP} accounts per request` })
            default:
                return res.status(502).json({ status: "error", code: "PLAYERS_UNAVAILABLE", message: "Linked players could not be fetched, try again later" })
        }
    }

    res.json({ status: "success", data: result.data })
})

export default router
