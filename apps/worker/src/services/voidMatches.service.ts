import { FULL_TIME_MIN_SECONDS } from "@trueno-proclub-services/eafcapi"
import { isShortMatch, maxSecondsPlayed, type IMatch, type IStatsRecalculatePayload, type MatchResult } from "@trueno-proclub-services/shared"
import { MatchModel, WorkerTaskModel } from "@trueno-proclub-services/shared/models"
import { recalculateAllPlayerStats } from "./playerStats.service.js"
import { computePlayerStatsAverages } from "./averageStats.service.js"

/**
 * Partidos nulos y abandonos en amistosos sobre lo ya guardado, más el recálculo que pide el
 * api por RabbitMQ cuando un admin marca un partido como nulo. Lo nuevo ya llega marcado desde
 * MatchDTO. Quien llame a esto lo hace dentro de runExclusive (no se pisa con la sincronización).
 */

const MIGRATION_ID = "migration:void-matches-v1"

const sumGoals = (club: IMatch["localClub"]) => club.players.reduce((acc, p) => acc + (Number(p.goals) || 0), 0)

/**
 * Amistoso con abandono, como detectFriendlyDnf sobre lo ya guardado: cortado antes del final
 * (nadie llega al 80') y con el 3-0 forzado de EA, que no cuadra con los goles de los jugadores.
 * El marcador guardado era ese forzado (`clubs.goals`): el real pasa a ser el de los jugadores y
 * pierde el que se fue (el que tiene el 0 del 3-0).
 */
export const friendlyDnfPatch = (m: IMatch): Record<string, unknown> | null => {
    if (m.matchType !== "friendly" || m.winnerByDnf || m.winnerByPen) return null
    if (maxSecondsPlayed(m) >= FULL_TIME_MIN_SECONDS) return null

    const localForced = Number(m.localClub.matchStats.goals) || 0
    const awayForced = Number(m.awayClub.matchStats.goals) || 0
    const localReal = sumGoals(m.localClub)
    const awayReal = sumGoals(m.awayClub)
    const forced3to0 = (localForced === 3 && awayForced === 0) || (localForced === 0 && awayForced === 3)
    const mismatch = localForced !== localReal || awayForced !== awayReal
    if (!forced3to0 || !mismatch) return null

    const ourForced = m.localTeam === false ? awayForced : localForced
    const result: MatchResult = ourForced === 3 ? "win" : "loose"
    return {
        winnerByDnf: true,
        result,
        "localClub.matchStats.goals": localReal,
        "awayClub.matchStats.goals": awayReal
    }
}

/**
 * Una sola vez: marca los nulos y los abandonos de amistosos de los partidos ya guardados y
 * recalcula stats, logros y medias (también porque el mínimo por jugador pasó de 0 s a 15').
 * Devuelve true si ha recalculado.
 */
export const migrateVoidMatches = async (clubId: number): Promise<boolean> => {
    if (await WorkerTaskModel.exists({ _id: MIGRATION_ID })) return false

    console.info("[Void matches] Marcando partidos nulos y abandonos de amistosos ya guardados...")
    const matches = await MatchModel.find({}).lean<IMatch[]>()
    const ops: { updateOne: { filter: { matchId: number }, update: { $set: Record<string, unknown> } } }[] = []
    let voided = 0
    let friendlyDnf = 0

    for (const m of matches) {
        const set: Record<string, unknown> = {}

        const dnf = friendlyDnfPatch(m)
        if (dnf) {
            Object.assign(set, dnf)
            friendlyDnf++
        }

        // Lo que haya marcado un admin no se toca
        if (m.voidedBy !== "admin") {
            const short = isShortMatch(m)
            if (short) voided++
            if (Boolean(m.voided) !== short || (m.voidedBy ?? null) !== (short ? "auto" : null)) {
                set.voided = short
                set.voidedBy = short ? "auto" : null
            }
        }

        if (Object.keys(set).length > 0) ops.push({ updateOne: { filter: { matchId: m.matchId }, update: { $set: set } } })
    }

    if (ops.length > 0) await MatchModel.bulkWrite(ops)
    console.info(`[Void matches] ${voided} nulos, ${friendlyDnf} amistosos con abandono (${ops.length} partidos actualizados de ${matches.length})`)

    await recalculateEverything(clubId)

    await WorkerTaskModel.updateOne({ _id: MIGRATION_ID }, { $set: { doneAt: new Date() } }, { upsert: true })
    console.info("[Void matches] Migración hecha")
    return true
}

/** Cuándo empezó el último recálculo completo: los avisos anteriores ya están cubiertos */
let lastRecalcStartedAt = 0

const recalculateEverything = async (clubId: number) => {
    lastRecalcStartedAt = Date.now()
    await recalculateAllPlayerStats(clubId)
    await computePlayerStatsAverages()
}

/**
 * Aviso del api (RabbitMQ, `stats.recalculate`): un admin ha marcado o desmarcado un partido como
 * nulo. Si ya hubo un recálculo que empezó después del aviso (varios seguidos), no se repite.
 */
export const handleStatsRecalculate = async (clubId: number, payload: IStatsRecalculatePayload): Promise<void> => {
    const requestedAt = Date.parse(payload?.requestedAt ?? "") || Date.now()
    if (requestedAt < lastRecalcStartedAt) {
        console.info(`[Stats] Aviso de recálculo (${payload.reason}) ya cubierto por el último recálculo`)
        return
    }
    console.info(`[Stats] Recálculo pedido por el api: ${payload.reason}${payload.matchId ? ` (partido ${payload.matchId})` : ""}`)
    await recalculateEverything(clubId)
    console.info("[Stats] Recálculo hecho")
}
