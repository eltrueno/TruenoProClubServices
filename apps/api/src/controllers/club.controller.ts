import { getClubStats, getClubInfo, type TPlatformType } from "@trueno-proclub-services/eafcapi"
import { ClubModel } from "@trueno-proclub-services/shared/models"
import type { IClub, IClubStats } from "@trueno-proclub-services/shared"

const CACHE_TTL_MS = Number(process.env.CLUB_CACHE_MS || 60 * 60 * 1000)
/** Tras un fallo de EA no se reintenta hasta pasado este tiempo: evita lanzar puppeteer en cada request */
const RETRY_AFTER_FAILURE_MS = Number(process.env.CLUB_RETRY_MS || 5 * 60 * 1000)

let lastFailedFetchAt = 0

const mapClubInfo = (raw: any): Pick<IClub, "name" | "regionId" | "clubId"> | null => {
    // Sin clubId la respuesta no es válida (EA a veces responde 200 con {} o [])
    const clubId = Number(raw?.clubId)
    if (!Number.isFinite(clubId) || clubId <= 0) return null
    return {
        name: String(raw?.name ?? ""),
        regionId: Number(raw?.regionId) || 0,
        clubId
    }
}

const mapClubStats = (raw: any): IClubStats | null => {
    const s = Array.isArray(raw) ? raw[0] : raw
    // gamesPlayed siempre viene en una respuesta real; si falta, no hay stats que guardar
    if (s?.gamesPlayed === undefined || s?.gamesPlayed === null) return null
    return {
        bestDivision: Number(s.bestDivision) || 0,
        bestFinishGroup: Number(s.bestFinishGroup) || 0,
        gamesPlayed: Number(s.gamesPlayed) || 0,
        gamesPlayedPlayoff: Number(s.gamesPlayedPlayoff) || 0,
        goals: Number(s.goals) || 0,
        goalsAgainst: Number(s.goalsAgainst) || 0,
        promotions: Number(s.promotions) || 0,
        relegations: Number(s.relegations) || 0,
        wins: Number(s.wins) || 0,
        ties: Number(s.ties) || 0,
        losses: Number(s.losses) || 0,
        winstreak: Number(s.wstreak) || 0,
        unbeatenstreak: Number(s.unbeatenstreak) || 0,
        skill: Number(s.skillRating) || 0,
        reputationtier: Number(s.reputationtier) || 0
    }
}

const clean = (doc: any) => {
    const { _id, __v, createdAt, ...rest } = doc.toObject()
    return rest
}

/**
 * Caché en Mongo de info + stats del club con TTL. Reglas:
 * - Nunca se pisa un dato bueno con una respuesta vacía / inválida de EA.
 * - info y stats se refrescan por separado (allSettled): si una falla, la otra se guarda.
 * - Si EA falla se sirve la caché aunque esté caducada y no se reintenta hasta RETRY_AFTER_FAILURE_MS.
 */
export const getClubDataCache = async (platform: TPlatformType, clubId: number) => {
    const cached = await ClubModel.findOne({ clubId })
    const updatedAt = (cached as any)?.updatedAt?.getTime?.() ?? 0
    const isExpired = !cached || Date.now() - updatedAt > CACHE_TTL_MS
    const inFailureCooldown = Date.now() - lastFailedFetchAt < RETRY_AFTER_FAILURE_MS

    if (!isExpired) return clean(cached)
    if (inFailureCooldown && cached) {
        console.log("[Club] EA failed recently, serving stale cache")
        return clean(cached)
    }

    console.log(`[Club] Cache ${cached ? "EXPIRED" : "MISS"}, fetching from EA...`)
    const [infoResult, statsResult] = await Promise.allSettled([
        getClubInfo(platform, clubId),
        getClubStats(platform, clubId)
    ])

    const info = infoResult.status === "fulfilled" ? mapClubInfo(infoResult.value) : null
    const stats = statsResult.status === "fulfilled" ? mapClubStats(statsResult.value) : null
    if (infoResult.status === "rejected") console.error("[Club] getClubInfo failed:", infoResult.reason?.message ?? infoResult.reason)
    if (statsResult.status === "rejected") console.error("[Club] getClubStats failed:", statsResult.reason?.message ?? statsResult.reason)

    const update: Record<string, unknown> = {}
    if (info) {
        update.name = info.name
        update.regionId = info.regionId
    }
    if (stats) update.stats = stats

    if (Object.keys(update).length === 0) {
        lastFailedFetchAt = Date.now()
        if (cached) {
            console.warn("[Club] EA returned nothing valid, serving stale cache")
            return clean(cached)
        }
        return undefined
    }

    if (!info || !stats) {
        // Refresco parcial: se guarda lo válido pero se recuerda el fallo para no martillear a EA
        lastFailedFetchAt = Date.now()
    } else {
        lastFailedFetchAt = 0
    }

    const saved = await ClubModel.findOneAndUpdate(
        { clubId },
        { $set: update, $setOnInsert: { clubId } },
        { upsert: true, new: true }
    )
    return saved ? clean(saved) : undefined
}
