import { db } from "../db/index.js"

/**
 * Registro de acciones de admin hechas en el servicio de cuentas (roles y tokens de API). Las de
 * los clubes (vínculos, fotos, nulos) las guarda cada api en la base compartida; el panel junta
 * las dos listas. Se borran solas a los 180 días. Apuntar nunca rompe la acción.
 */
const COLLECTION = "admin_audit"
const TTL_SECONDS = 60 * 60 * 24 * 180

export type AuthAdminAction = "user.role" | "token.create" | "token.revoke"

interface AuditDoc {
    action: AuthAdminAction
    actorId: string | null
    actorName: string | null
    target: string | null
    targetName: string | null
    clubId: null
    details: Record<string, unknown> | null
    createdAt: Date
}

const audit = () => db.collection<AuditDoc>(COLLECTION)
let indexed = false

export const adminAuditService = {
    async log(actor: { id?: string; name?: string } | undefined, action: AuthAdminAction, entry: { target?: string | null; targetName?: string | null; details?: Record<string, unknown> | null } = {}) {
        try {
            if (!indexed) {
                indexed = true
                await audit().createIndex({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS }).catch(() => undefined)
            }
            await audit().insertOne({
                action,
                actorId: actor?.id ?? null,
                actorName: actor?.name ?? null,
                target: entry.target ?? null,
                targetName: entry.targetName ?? null,
                clubId: null,
                details: entry.details ?? null,
                createdAt: new Date(),
            })
        } catch (err) {
            console.warn(`[Admin audit] No se ha podido apuntar ${action}:`, err instanceof Error ? err.message : err)
        }
    },

    async list(limit = 100, before?: string) {
        const filter: Record<string, unknown> = {}
        if (before && !Number.isNaN(Date.parse(before))) filter.createdAt = { $lt: new Date(before) }
        const docs = await audit().find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 500)).toArray()
        return docs.map(({ _id, ...d }) => ({ id: _id.toString(), ...d }))
    },
}
