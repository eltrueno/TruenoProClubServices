import type { Request } from "express"
import type { AdminAction, IAdminAuditEntry } from "@trueno-proclub-services/shared"
import { AdminAuditModel } from "@trueno-proclub-services/shared/models"

const CLUB_ID = Number(process.env.CLUBID) || null

/**
 * Registro de acciones de admin (base compartida, con el club). Apuntar nunca rompe la acción:
 * si falla, se avisa en el log y la respuesta sigue igual.
 */
export async function logAdminAction(
    req: Request,
    action: AdminAction,
    entry: { target?: string | null; targetName?: string | null; details?: Record<string, unknown> | null; global?: boolean } = {}
): Promise<void> {
    try {
        await AdminAuditModel.create({
            action,
            actorId: req.user?.id ?? null,
            actorName: req.user?.name ?? null,
            target: entry.target ?? null,
            targetName: entry.targetName ?? null,
            // Lo global (vínculos, fotos globales) sin club; lo del club (nulos, worker), con el suyo
            clubId: entry.global ? null : CLUB_ID,
            details: entry.details ?? null,
        })
    } catch (err) {
        console.warn(`[Admin audit] No se ha podido apuntar ${action}:`, err instanceof Error ? err.message : err)
    }
}

/**
 * Últimas acciones: las de este club y las globales (las de otros clubes las da su api).
 * `before` (ISO) para paginar hacia atrás.
 */
export async function listAdminActions(limit = 100, before?: string): Promise<IAdminAuditEntry[]> {
    const filter: Record<string, unknown> = { $or: [{ clubId: CLUB_ID }, { clubId: null }] }
    if (before && !Number.isNaN(Date.parse(before))) filter.createdAt = { $lt: new Date(before) }
    const docs = await AdminAuditModel.find(filter).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 500))
    return docs.map((d) => d.toJSON() as IAdminAuditEntry)
}
