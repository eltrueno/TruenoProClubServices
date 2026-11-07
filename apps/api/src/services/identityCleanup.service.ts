import { isValidObjectId } from "mongoose"
import { LinkRequestModel, PlayerIdentityModel } from "@trueno-proclub-services/shared/models"

/**
 * Vínculos cuenta ↔ jugador de cuentas que ya no existen.
 *
 * La vinculación vive en la base compartida (player_identity.userId) y las cuentas en la
 * del auth, que puede estar en otro servidor: borrar la cuenta en Better Auth no toca
 * nada de aquí. Sin limpiar, el jugador se quedaba "vinculado" a una cuenta borrada: no
 * salía como libre y nadie podía volver a pedirlo (PLAYER_TAKEN).
 *
 * Dos caminos:
 *  - accounts desvincula antes de borrar la cuenta (`unlinkUser`, DELETE /members/me/identity).
 *  - Red de seguridad: `sweepOrphanLinks` pregunta al auth qué cuentas existen y libera las
 *    que no. Lo corre cada api de club; es idempotente, da igual que lo hagan dos.
 */

const AUTH_URL = (process.env.AUTH_URL || "https://auth.casemuro.stream").replace(/\/+$/, "")
/** Máximo que acepta GET /api/public/users del auth */
const BATCH = 50

/** Desvincula la cuenta de su jugador y descarta sus solicitudes pendientes */
export async function unlinkUser(userId: string): Promise<{ unlinked: number; requests: number }> {
    const [identities, requests] = await Promise.all([
        PlayerIdentityModel.updateMany({ userId }, { $set: { userId: null } }),
        LinkRequestModel.deleteMany({ userId, status: "pending" }),
    ])
    return { unlinked: identities.modifiedCount, requests: requests.deletedCount }
}

/** Ids (de entre `ids`) que existen en el auth. Lanza si el auth no responde bien. */
async function existingUserIds(ids: string[], fetchImpl: typeof fetch = fetch): Promise<Set<string>> {
    const res = await fetchImpl(`${AUTH_URL}/api/public/users?ids=${ids.map(encodeURIComponent).join(",")}`)
    if (!res.ok) throw new Error(`auth respondió ${res.status}`)
    const body = (await res.json()) as { data?: { id: string }[] }
    if (!Array.isArray(body?.data)) throw new Error("respuesta del auth sin data")
    return new Set(body.data.map((u) => u.id))
}

export interface SweepResult {
    checked: number
    orphans: string[]
    /** true si no se tocó nada por precaución (auth caído o demasiados "borrados" de golpe) */
    aborted: boolean
    reason?: string
}

/**
 * Busca cuentas vinculadas que ya no existen en el auth y las desvincula. Por seguridad no
 * cambia nada si el auth falla en cualquier lote, si no aparece ninguna de las cuentas o si de
 * golpe "faltaran" más de la mitad (con 3 o más): eso huele a fallo del auth o de su base, no a
 * gente borrándose.
 */
export async function sweepOrphanLinks(fetchImpl: typeof fetch = fetch): Promise<SweepResult> {
    const linked = await PlayerIdentityModel.find({ userId: { $nin: [null, ""] } }, { _id: 0, userId: 1 }).lean<{ userId: string }[]>()
    const userIds = [...new Set(linked.map((l) => l.userId))]
    // Ids que no tienen forma de ObjectId no pueden ser cuentas de Better Auth: no se tocan, por si acaso
    const checkable = userIds.filter((id) => isValidObjectId(id))
    if (checkable.length === 0) return { checked: 0, orphans: [], aborted: false }

    const existing = new Set<string>()
    try {
        for (let i = 0; i < checkable.length; i += BATCH) {
            for (const id of await existingUserIds(checkable.slice(i, i + BATCH), fetchImpl)) existing.add(id)
        }
    } catch (err) {
        return { checked: checkable.length, orphans: [], aborted: true, reason: `auth no disponible: ${err instanceof Error ? err.message : err}` }
    }

    const orphans = checkable.filter((id) => !existing.has(id))
    // Que no exista NINGUNA de las cuentas vinculadas huele a auth apuntando a otra base (o
    // vacía), no a gente borrándose: con pocas cuentas la regla de "más de la mitad" no lo veía.
    if (orphans.length === checkable.length) {
        return { checked: checkable.length, orphans, aborted: true, reason: "no existe ninguna de las cuentas vinculadas" }
    }
    if (orphans.length >= 3 && orphans.length > checkable.length / 2) {
        return { checked: checkable.length, orphans, aborted: true, reason: "demasiadas cuentas ausentes de golpe" }
    }
    for (const userId of orphans) await unlinkUser(userId)
    return { checked: checkable.length, orphans, aborted: false }
}

export function startOrphanLinkSweep(): void {
    // En desarrollo el auth (local) no tiene las cuentas reales: todas parecerían borradas
    if (process.env.DEVMODE === "true") {
        console.log("[identity] DEVMODE: limpieza de vínculos desactivada")
        return
    }
    const hours = Number(process.env.IDENTITY_CLEANUP_HOURS)
    const intervalMs = (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600_000
    const run = async () => {
        try {
            const r = await sweepOrphanLinks()
            if (r.aborted) console.warn(`[identity] Limpieza de vínculos cancelada (${r.reason}); no se ha tocado nada`)
            else if (r.orphans.length) console.log(`[identity] ${r.orphans.length} vínculo(s) de cuentas borradas liberados`)
        } catch (err) {
            console.error("[identity] Error en la limpieza de vínculos:", err)
        }
    }
    setTimeout(run, 5 * 60_000).unref()
    setInterval(run, intervalMs).unref()
}
