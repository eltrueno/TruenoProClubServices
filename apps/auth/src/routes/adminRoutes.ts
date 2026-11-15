import { Router } from "express"
import { db } from "../db/index.js"
import { apiTokenService } from "../services/apiTokenService.js"

const router = Router()

/**
 * GET /api/admin/users?q=texto
 * Listado de usuarios para el panel admin (vincular cuenta ↔ jugador).
 * Protegido en index.ts con requireAuth + requireRole(admin).
 */
router.get("/users", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const filter = q ? { name: { $regex: escaped, $options: "i" } } : {}

    const users = await db
        .collection("user")
        .find(filter, { projection: { name: 1, image: 1, role: 1, twitchId: 1, discordId: 1 } })
        .sort({ name: 1 })
        .limit(200)
        .toArray()

    res.json({
        status: "success",
        data: users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            image: u.image ?? null,
            role: u.role ?? "visitor",
            twitchId: u.twitchId ?? null,
            discordId: u.discordId ?? null
        }))
    })
})

/**
 * Tokens de API para servicios externos (GET /api/v1/*).
 * GET lista (sin el token), POST { name } crea y devuelve el token UNA sola vez, DELETE revoca.
 */
router.get("/tokens", async (_req, res) => {
    res.json({ status: "success", data: await apiTokenService.list() })
})

router.post("/tokens", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
    if (!name || name.length > 60) {
        return res.status(400).json({ status: "error", code: "INVALID_NAME", message: "name is required (max 60 chars)" })
    }
    res.status(201).json({ status: "success", data: await apiTokenService.create(name, req.user?.id ?? null) })
})

router.delete("/tokens/:id", async (req, res) => {
    const revoked = await apiTokenService.revoke(req.params.id)
    if (!revoked) return res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Token not found" })
    res.json({ status: "success", data: { revoked: true } })
})

export default router
