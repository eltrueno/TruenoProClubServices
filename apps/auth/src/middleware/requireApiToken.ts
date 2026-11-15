import type { NextFunction, Request, Response } from "express"
import { apiTokenService } from "../services/apiTokenService.js"

/** Peticiones por minuto y token (en memoria: vale para una sola instancia del auth) */
const RATE_LIMIT = Number(process.env.API_TOKEN_RATE_LIMIT) || 120
const WINDOW_MS = 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

/** `Authorization: Bearer tpcs_…` de un token creado en el panel admin */
export async function requireApiToken(req: Request, res: Response, next: NextFunction) {
    try {
        const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? "")
        const token = match ? await apiTokenService.verify(match[1]) : null
        if (!token) {
            return res.status(401).json({ status: "error", code: "INVALID_TOKEN", message: "Missing or invalid API token" })
        }

        const now = Date.now()
        let slot = hits.get(token.id)
        if (!slot || slot.resetAt <= now) {
            slot = { count: 0, resetAt: now + WINDOW_MS }
            hits.set(token.id, slot)
        }
        slot.count++
        if (slot.count > RATE_LIMIT) {
            const retryAfterSeconds = Math.ceil((slot.resetAt - now) / 1000)
            res.setHeader("Retry-After", String(retryAfterSeconds))
            return res.status(429).json({ status: "error", code: "RATE_LIMITED", message: "Too many requests", retryAfterSeconds })
        }

        req.apiToken = token
        next()
    } catch (error) {
        console.error("API token middleware error:", error)
        return res.status(500).json({ status: "error", message: "Internal server error" })
    }
}
