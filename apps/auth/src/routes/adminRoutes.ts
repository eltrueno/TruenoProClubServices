import { Router } from "express"
import { db } from "../db/index.js"
import { ObjectId } from "mongodb"
import { UserRole } from "@trueno-proclub-services/shared"
import { apiTokenService } from "../services/apiTokenService.js"
import { adminAuditService } from "../services/adminAuditService.js"

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
        .find(filter, {
            projection: {
                name: 1, image: 1, role: 1, twitchId: 1, discordId: 1, discordName: 1, createdAt: 1,
                twitchFollowing: 1, twitchSub: 1, twitchSubTier: 1, twitchSyncedAt: 1, twitchNeedsReauth: 1
            }
        })
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
            discordId: u.discordId ?? null,
            discordName: u.discordName ?? null,
            twitchFollowing: !!u.twitchFollowing,
            twitchSub: !!u.twitchSub,
            twitchSubTier: u.twitchSubTier ?? null,
            twitchSyncedAt: u.twitchSyncedAt ?? null,
            twitchNeedsReauth: !!u.twitchNeedsReauth,
            createdAt: u.createdAt ?? null
        }))
    })
})

/**
 * PATCH /api/admin/users/:id/role  { role }
 * Roles que pone un admin: vip, mod, admin o visitor (= quitar el rol a mano; la sincronización con
 * Twitch le volverá a poner follower / subscriber si toca). Un admin no puede quitarse el suyo, para
 * no quedarse sin nadie que pueda entrar al panel. Tarda en notarse lo que dure la caché de la sesión.
 */
const ASSIGNABLE_ROLES: string[] = [UserRole.visitor, UserRole.vip, UserRole.mod, UserRole.admin]
router.patch("/users/:id/role", async (req, res) => {
    const role = typeof req.body?.role === "string" ? req.body.role : ""
    if (!ASSIGNABLE_ROLES.includes(role)) {
        return res.status(400).json({ status: "error", code: "INVALID_ROLE", message: `role must be one of ${ASSIGNABLE_ROLES.join(", ")}` })
    }
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ status: "error", code: "NOT_FOUND", message: "User not found" })
    if (req.params.id === req.user?.id && role !== UserRole.admin) {
        return res.status(400).json({ status: "error", code: "CANNOT_DEMOTE_SELF", message: "You cannot remove your own admin role" })
    }
    const users = db.collection("user")
    const before = await users.findOne({ _id: new ObjectId(req.params.id) }, { projection: { name: 1, role: 1 } })
    if (!before) return res.status(404).json({ status: "error", code: "NOT_FOUND", message: "User not found" })
    await users.updateOne({ _id: before._id }, { $set: { role } })
    if ((before.role ?? "visitor") !== role) {
        await adminAuditService.log(req.user, "user.role", { target: req.params.id, targetName: before.name, details: { from: before.role ?? "visitor", to: role } })
    }
    res.json({ status: "success", data: { id: req.params.id, role } })
})

/** GET /api/admin/audit?limit=&before= : acciones de admin hechas aquí (roles y tokens) */
router.get("/audit", async (req, res) => {
    const limit = Number(req.query.limit) || 100
    const before = typeof req.query.before === "string" ? req.query.before : undefined
    res.json({ status: "success", data: await adminAuditService.list(limit, before) })
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
    const created = await apiTokenService.create(name, req.user?.id ?? null)
    await adminAuditService.log(req.user, "token.create", { target: created.id, targetName: name })
    res.status(201).json({ status: "success", data: created })
})

router.delete("/tokens/:id", async (req, res) => {
    const revoked = await apiTokenService.revoke(req.params.id)
    if (!revoked) return res.status(404).json({ status: "error", code: "NOT_FOUND", message: "Token not found" })
    await adminAuditService.log(req.user, "token.revoke", { target: req.params.id })
    res.json({ status: "success", data: { revoked: true } })
})

export default router
