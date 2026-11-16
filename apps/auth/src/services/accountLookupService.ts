import { ObjectId, type Document, type Filter } from "mongodb"
import { db } from "../db/index.js"

/**
 * Consulta de cuentas para servicios externos con token de API: de una cuenta de Twitch a
 * la cuenta de Casemuro y su jugador vinculado. No aplica los ajustes de privacidad del
 * usuario (son para la ficha pública del jugador) y nunca devuelve el email.
 */
export interface ExternalAccount {
    id: string
    name: string
    image: string | null
    role: string
    twitchId: string | null
    twitchFollowing: boolean
    twitchSub: boolean
    /** "1000" | "2000" | "3000" si es sub */
    twitchSubTier: string | null
    /** última comprobación correcta de follow / sub / rol con Twitch */
    twitchSyncedAt: Date | null
    /** el permiso de Twitch ya no sirve: follow / sub pueden estar desfasados */
    twitchNeedsReauth: boolean
    /** cuenta de Discord vinculada (id y nombre de usuario), null si no tiene */
    discordId: string | null
    discordName: string | null
    /** cuándo se creó la cuenta */
    createdAt: Date | null
    /** EA ID del jugador vinculado (el mismo en todos los clubes), null si no tiene */
    playerId: string | null
}

export const MAX_LOOKUP = 100

export interface LookupQuery {
    ids: string[]
    twitchIds: string[]
    twitchLogins: string[]
    discordIds?: string[]
}

type LookupResult =
    | { ok: true; data: ExternalAccount[] }
    | { ok: false; error: { code: "NO_VALID_PARAMS" | "TOO_MANY" | "PLAYERS_UNAVAILABLE" } }

/** Api de un club cualquiera: la vinculación es global, todos responden lo mismo */
const clubApiUrl = () => (process.env.CLUB_API_URL || "https://api.casemuro.stream").replace(/\/+$/, "")

const PROJECTION = {
    name: 1, image: 1, role: 1, twitchId: 1, twitchFollowing: 1, twitchSub: 1, twitchSubTier: 1, twitchSyncedAt: 1, twitchNeedsReauth: 1,
    discordId: 1, discordName: 1, createdAt: 1
}

/** userId -> playerId, preguntando al api (los vínculos viven en la base compartida de los clubes) */
async function fetchPlayerIds(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map()
    const res = await fetch(`${clubApiUrl()}/members/by-user?ids=${userIds.join(",")}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = (await res.json()) as { response?: { userId: string; playerId: string }[] }
    return new Map((body.response ?? []).map((p) => [p.userId, p.playerId]))
}

export const accountLookupService = {
    async lookup(query: LookupQuery): Promise<LookupResult> {
        const ids = query.ids.filter((id) => ObjectId.isValid(id))
        const twitchIds = query.twitchIds.filter((id) => /^\d{1,20}$/.test(id))
        // Los nombres de usuario de Twitch solo llevan letras, números y _
        const twitchLogins = query.twitchLogins.filter((l) => /^\w{1,25}$/.test(l))

        const discordIds = (query.discordIds ?? []).filter((id) => /^\d{1,20}$/.test(id))

        const total = ids.length + twitchIds.length + twitchLogins.length + discordIds.length
        if (total === 0) return { ok: false, error: { code: "NO_VALID_PARAMS" } }
        if (total > MAX_LOOKUP) return { ok: false, error: { code: "TOO_MANY" } }

        const users = db.collection("user")
        const find = (filter: Filter<Document>) => users.find(filter, { projection: PROJECTION })
        const found = (await Promise.all([
            ids.length ? find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }).toArray() : [],
            twitchIds.length ? find({ twitchId: { $in: twitchIds } }).toArray() : [],
            // `name` es el nombre visible de Twitch: igual que el de usuario salvo mayúsculas
            twitchLogins.length ? find({ name: { $in: twitchLogins } }).collation({ locale: "en", strength: 2 }).toArray() : [],
            discordIds.length ? find({ discordId: { $in: discordIds } }).toArray() : [],
        ])).flat()

        // Por id de cuenta: la misma puede salir por dos criterios
        const byId = new Map(found.map((u) => [u._id.toString(), u]))

        let playerIds: Map<string, string>
        try {
            playerIds = await fetchPlayerIds([...byId.keys()])
        } catch (err) {
            console.error("[accounts] No se han podido consultar los jugadores vinculados:", err instanceof Error ? err.message : err)
            return { ok: false, error: { code: "PLAYERS_UNAVAILABLE" } }
        }

        const data: ExternalAccount[] = [...byId.entries()].map(([id, u]) => ({
            id,
            name: u.name,
            image: u.image ?? null,
            role: u.role ?? "visitor",
            twitchId: u.twitchId ?? null,
            twitchFollowing: u.twitchFollowing === true,
            twitchSub: u.twitchSub === true,
            twitchSubTier: u.twitchSubTier ?? null,
            twitchSyncedAt: u.twitchSyncedAt ?? null,
            twitchNeedsReauth: u.twitchNeedsReauth === true,
            discordId: u.discordId || null,
            discordName: u.discordName || null,
            createdAt: u.createdAt ?? null,
            playerId: playerIds.get(id) ?? null,
        }))
        return { ok: true, data }
    }
}
