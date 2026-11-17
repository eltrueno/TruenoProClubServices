import { ACHIEVEMENT_DEFINITIONS, type IAchievementDefinition, type IAchievementUnlocked, type IMatch } from "@trueno-proclub-services/shared"
import { AchievementDefinitionModel, AchievementUnlockedModel, MemberTotwAppearancesModel } from "@trueno-proclub-services/shared/models"
import { getMilestoneProducer, getAchievementProducer } from "../events/index.js"
import type { Metrics } from "./achievementMetrics.js"

/**
 * Logros de club: qué se desbloquea con unas métricas dadas. Las métricas las calculan
 * playerStats.service (totales), achievementMetrics.ts (partido, rachas, calendario) y, para
 * el equipo de la semana, este mismo fichero.
 */

/** Métricas que se evalúan con las apariciones en el equipo de la semana, no con los partidos */
const TOTW_METRICS = ["totwBest", "totwWorst"]

type NewUnlock = { unlock: IAchievementUnlocked, def: IAchievementDefinition }

/** Escalones de un hito que faltan por desbloquear: de `lastReached` hasta el valor actual */
export function pendingSteps(value: number, lastReached: number, step: number): number[] {
    const steps: number[] = []
    if (!(step > 0)) return steps
    for (let reached = lastReached + step; reached <= value; reached += step) steps.push(reached)
    return steps
}

/** ¿Se cumple la condición de un logro único con este valor? (sin valor, nunca) */
function conditionMet(def: IAchievementDefinition, value: number | undefined): boolean {
    if (value === undefined || Number.isNaN(value)) return false
    return def.exact !== undefined ? value === def.exact : value >= (def.threshold ?? 1)
}

/**
 * Lo que se desbloquea con estas métricas, dadas las definiciones y lo que el jugador ya
 * tiene. `cumulative` son los acumulados y el estado; `match`, las del partido (si lo hay).
 */
export function evaluateAchievements(
    definitions: IAchievementDefinition[],
    alreadyUnlocked: Pick<IAchievementUnlocked, "achievementId" | "reached">[],
    metrics: { cumulative: Metrics, match?: Metrics },
    base: Pick<IAchievementUnlocked, "playerId" | "playerName" | "unlockedAt" | "matchId">
): NewUnlock[] {
    const result: NewUnlock[] = []

    for (const def of definitions) {
        const source = def.scope === "match" ? metrics.match : metrics.cumulative
        if (!source) continue
        const value = source[def.metric]
        const mine = alreadyUnlocked.filter((u) => u.achievementId === def._id)

        if (def.mode === "infinite") {
            const lastReached = mine.reduce((max, u) => Math.max(max, u.reached || 0), 0)
            // Un desbloqueo por cada escalón superado (cada hito da sus puntos), no solo el último
            for (const reached of pendingSteps(value ?? 0, lastReached, def.step ?? 0)) {
                result.push({ unlock: { ...base, achievementId: def._id, reached }, def })
            }
        } else if (mine.length === 0 && conditionMet(def, value)) {
            result.push({ unlock: { ...base, achievementId: def._id }, def })
        }
    }
    return result
}

/** Guarda los desbloqueos (sin duplicar) y, si no es en silencio, los anuncia por RabbitMQ */
async function saveAndAnnounce(newUnlocks: NewUnlock[], silent: boolean) {
    for (const { unlock, def } of newUnlocks) {
        // upsert: no falla si ya estaba (recálculos, reintentos). `reached` va en el filtro:
        // sin él en los únicos y con su escalón en los hitos
        await AchievementUnlockedModel.updateOne(
            { playerId: unlock.playerId, achievementId: unlock.achievementId, reached: unlock.reached },
            { $setOnInsert: unlock },
            { upsert: true }
        )
        if (silent) continue

        const { _id, ...definition } = def
        const payload = { ...unlock, ...definition, achievementId: _id }
        if (def.mode === "infinite") {
            console.info(`[Milestone] ${unlock.achievementId} for ${unlock.playerName} (reached: ${unlock.reached})`)
            await getMilestoneProducer().publish(payload as any)
        } else {
            console.info(`[Achievement] ${unlock.achievementId} for ${unlock.playerName}`)
            await getAchievementProducer().publish(payload as any)
        }
    }
}

const clubDefinitions = (filter: Record<string, unknown>) =>
    AchievementDefinitionModel.find({ type: "club", ...filter }).lean<IAchievementDefinition[]>()

/**
 * Evalúa y guarda los logros de un jugador después de un partido que le cuenta.
 * `cumulative`: sus totales en el club más su estado de rachas y calendario.
 * `match`: las métricas de ese partido.
 */
const processAchievements = async (
    player: { playerId: string, playerName: string },
    metrics: { cumulative: Metrics, match?: Metrics },
    matchObj?: IMatch,
    silent = false
) => {
    const definitions = await clubDefinitions({ metric: { $nin: TOTW_METRICS } })
    if (definitions.length === 0) return
    const unlocked = await AchievementUnlockedModel.find({ playerId: player.playerId }, { achievementId: 1, reached: 1 }).lean()

    const newUnlocks = evaluateAchievements(definitions, unlocked, metrics, {
        playerId: player.playerId,
        playerName: player.playerName,
        unlockedAt: matchObj ? new Date(matchObj.timestamp * 1000) : new Date(),
        matchId: matchObj?.matchId?.toString(),
    })
    await saveAndAnnounce(newUnlocks, silent)
}

/**
 * Logros del equipo de la semana para una lista de jugadores: cuenta sus apariciones en el
 * mejor y el peor XI y evalúa las definiciones con esas métricas (hoy no hay ninguna).
 */
const processTOTWAchievements = async (players: { playerId: string, playerName: string }[], silent = false) => {
    const definitions = await clubDefinitions({ metric: { $in: TOTW_METRICS } })
    if (definitions.length === 0) return

    for (const { playerId, playerName } of players) {
        const [totwBest, totwWorst] = await Promise.all([
            MemberTotwAppearancesModel.countDocuments({ playerId, type: "best" }),
            MemberTotwAppearancesModel.countDocuments({ playerId, type: "worst" })
        ])
        const unlocked = await AchievementUnlockedModel.find({ playerId }, { achievementId: 1, reached: 1 }).lean()
        const newUnlocks = evaluateAchievements(definitions, unlocked, { cumulative: { totwBest, totwWorst } }, {
            playerId, playerName, unlockedAt: new Date()
        })
        await saveAndAnnounce(newUnlocks, silent)
    }
}

/**
 * Recalculates TOTW achievements for ALL players with TOTW appearances.
 * Safe to call during a full recalculation.
 */
const recalculateAllTOTWAchievements = async () => {
    const allPlayers = await MemberTotwAppearancesModel.aggregate<{ playerId: string, playerName: string }>([
        { $sort: { createdAt: 1 } },
        { $group: { _id: "$playerId", playerName: { $last: "$playerName" } } },
        { $project: { _id: 0, playerId: "$_id", playerName: 1 } }
    ])
    if (allPlayers.length === 0) return
    // En silencio: en un recálculo no se re-anuncian logros históricos
    await processTOTWAchievements(allPlayers, true)
}

export { processAchievements, processTOTWAchievements, recalculateAllTOTWAchievements }

/**
 * Deja en la DB exactamente las definiciones del repo (shared): upserta las que hay y borra
 * las que ya no existen. Idempotente; se llama al arrancar para que una DB nueva tenga logros
 * desde el primer partido.
 *
 * Devuelve true si hay que rehacer los logros desde el historial:
 *   - desaparece un logro o le cambian las condiciones (lo desbloqueado puede no valer), o
 *   - hay uno nuevo y ya hay partidos guardados (pudo conseguirse en un partido antiguo: un
 *     logro de un partido o de una racha no se desbloquea solo con el siguiente).
 * Cambiar nombre, descripción, apartado o puntos no rehace nada.
 */
const CONDITION_FIELDS = ["metric", "scope", "type", "mode", "step", "threshold", "exact"] as const

const syncAchievementDefinitions = async (): Promise<boolean> => {
    if (ACHIEVEMENT_DEFINITIONS.length === 0) return false
    const current = await AchievementDefinitionModel.find({}).lean()
    const byId = new Map(current.map((d) => [String(d._id), d as unknown as Record<string, unknown>]))
    const ids = new Set(ACHIEVEMENT_DEFINITIONS.map((d) => d._id))
    const field = (def: IAchievementDefinition, f: string) => (def as unknown as Record<string, unknown>)[f]

    const removed = current.map((d) => String(d._id)).filter((id) => !ids.has(id))
    const added = ACHIEVEMENT_DEFINITIONS.filter((def) => !byId.has(def._id)).map((d) => d._id)
    const changed = ACHIEVEMENT_DEFINITIONS.filter((def) => {
        const old = byId.get(def._id)
        return !!old && CONDITION_FIELDS.some((f) => (old[f] ?? null) !== (field(def, f) ?? null))
    }).map((d) => d._id)

    await AchievementDefinitionModel.bulkWrite(
        ACHIEVEMENT_DEFINITIONS.map((def) => {
            // Lo que la definición ya no lleva (p. ej. `exact`) se quita, no se queda de antes
            const unset = Object.fromEntries([...CONDITION_FIELDS, "icon"].filter((f) => field(def, f) === undefined).map((f) => [f, "" as const]))
            return {
                updateOne: {
                    filter: { _id: def._id },
                    update: { $set: def, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
                    upsert: true
                }
            }
        })
    )
    if (removed.length > 0) await AchievementDefinitionModel.deleteMany({ _id: { $in: removed } })

    console.info(`[Achievements] Definitions synced: ${added.length} new, ${changed.length} changed, ${removed.length} removed, ${ACHIEVEMENT_DEFINITIONS.length} total`)
    // La primera vez (DB vacía) todo es nuevo y no hay nada que rehacer
    const firstTime = current.length === 0
    return removed.length > 0 || changed.length > 0 || (added.length > 0 && !firstTime)
}

export { syncAchievementDefinitions }
