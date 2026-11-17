import {
    achievementProgress, progressMetrics,
    type IAchievementDefinition, type IAchievementDefinitionWithStats, type IAchievementProgress, type IAchievementProgressValue, type Metrics
} from "@trueno-proclub-services/shared"
import {
    AchievementDefinitionModel, AchievementProgressModel, AchievementUnlockedModel, PlayerStatsFriendlyModel, PlayerStatsOfficialModel
} from "@trueno-proclub-services/shared/models"

const percent = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0)

/** Jugadores del club con algún partido que cuente (los que pueden tener logros) */
async function countPlayers(): Promise<number> {
    const [official, friendly] = await Promise.all([
        PlayerStatsOfficialModel.distinct("playerId", { gamesPlayed: { $gt: 0 } }),
        PlayerStatsFriendlyModel.distinct("playerId", { gamesPlayed: { $gt: 0 } }),
    ])
    return new Set([...official, ...friendly]).size
}

/** Definiciones de los logros de club con cuánta gente del club tiene cada uno */
const getAllDefinitions = async (): Promise<IAchievementDefinitionWithStats[]> => {
    const [definitions, counts, total] = await Promise.all([
        AchievementDefinitionModel.find({}, { __v: 0, createdAt: 0, updatedAt: 0 }).lean<IAchievementDefinition[]>(),
        // Jugadores distintos por logro (en los hitos, cada escalón es otro desbloqueo)
        AchievementUnlockedModel.aggregate<{ _id: string, count: number }>([
            { $group: { _id: { achievementId: "$achievementId", playerId: "$playerId" } } },
            { $group: { _id: "$_id.achievementId", count: { $sum: 1 } } },
        ]),
        countPlayers(),
    ])
    const countOf = new Map(counts.map((c) => [c._id, c.count]))
    return definitions.map((d) => {
        const unlockedCount = countOf.get(d._id) ?? 0
        return { ...d, unlockedCount, unlockedPercent: percent(unlockedCount, total), outOf: total }
    })
}

/** Métricas acumuladas de un jugador en el club: sus totales más rachas y calendario */
async function playerMetrics(playerId: string): Promise<Metrics> {
    const [stats, progress] = await Promise.all([
        Promise.all([PlayerStatsOfficialModel.find({ playerId }).lean(), PlayerStatsFriendlyModel.find({ playerId }).lean()]).then((r) => r.flat()),
        AchievementProgressModel.findOne({ playerId }).lean<IAchievementProgress>(),
    ])
    const totals: Record<string, number> = {}
    for (const doc of stats as unknown as Record<string, unknown>[]) {
        for (const [key, value] of Object.entries(doc)) {
            if (typeof value === "number" && key !== "position") totals[key] = (totals[key] ?? 0) + value
        }
    }
    return { ...(totals as Metrics), ...(progress ? progressMetrics(progress) : {}) }
}

/**
 * Cuánto le falta a un jugador para cada logro de club que no tiene (o para el siguiente
 * escalón de los hitos). Los de un partido y los de sí/no no tienen barra.
 */
const getProgressFor = async (playerId: string, unlocked: { achievementId: string, reached?: number | null }[]): Promise<Record<string, IAchievementProgressValue>> => {
    const [definitions, metrics] = await Promise.all([
        AchievementDefinitionModel.find({ scope: "cumulative" }).lean<IAchievementDefinition[]>(),
        playerMetrics(playerId),
    ])
    const out: Record<string, IAchievementProgressValue> = {}
    for (const def of definitions) {
        const mine = unlocked.filter((u) => u.achievementId === def._id)
        if (def.mode === "unique" && mine.length > 0) continue
        const lastReached = mine.reduce((max, u) => Math.max(max, u.reached ?? 0), 0)
        const progress = achievementProgress(def, metrics, lastReached)
        if (progress) out[def._id] = progress
    }
    return out
}

const getUnlockedByPlayerId = async (playerId: string) => {
    const response = await AchievementUnlockedModel.aggregate([
        { $match: { playerId } },
        {
            $lookup: {
                from: "achievements_definitions",
                localField: "achievementId",
                foreignField: "_id",
                as: "definition"
            }
        },
        {
            $addFields: {
                definition: { $arrayElemAt: ["$definition", 0] }
            }
        },
        {
            $unset: [
                "definition._id",
                "definition.__v",
                "definition.createdAt",
                "definition.updatedAt"
            ]
        },
        {
            $project: {
                _id: 0,
                playerId: 1,
                playerName: 1,
                achievementId: 1,
                reached: 1,
                unlockedAt: 1,
                matchId: 1,
                definition: 1
            }
        }
    ]);
    return response
}

export { getAllDefinitions, getUnlockedByPlayerId, getProgressFor }