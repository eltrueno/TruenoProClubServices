import { Router } from "express"
import { db } from "../db/index.js"

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

export default router
