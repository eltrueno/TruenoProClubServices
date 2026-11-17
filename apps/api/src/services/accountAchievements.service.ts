import {
    ACCOUNT_ACHIEVEMENT_DEFINITIONS, accountMetrics, achievementProgress,
    type IAccountAchievements, type IAchievementDefinitionWithStats, type IAchievementProgressValue
} from "@trueno-proclub-services/shared"
import { AccountAchievementUnlockedModel, PlayerClubTotalsModel, PlayerIdentityModel } from "@trueno-proclub-services/shared/models"

/**
 * Logros de cuenta (comunes a todos los clubes). Las definiciones salen del repo (shared), y
 * de la base compartida, los desbloqueos y lo que lleva el jugador en cada club. Aquí solo se
 * lee: quien evalúa y guarda es el worker.
 */

const definitions = new Map(ACCOUNT_ACHIEVEMENT_DEFINITIONS.map(({ _id, ...definition }) => [_id, definition]))

/** Definiciones con cuántas cuentas vinculadas tienen cada logro */
const getDefinitions = async (): Promise<IAchievementDefinitionWithStats[]> => {
    const [counts, total] = await Promise.all([
        AccountAchievementUnlockedModel.aggregate<{ _id: string, count: number }>([
            { $group: { _id: { achievementId: "$achievementId", userId: "$userId" } } },
            { $group: { _id: "$_id.achievementId", count: { $sum: 1 } } },
        ]).catch(() => []),
        PlayerIdentityModel.countDocuments({ userId: { $type: "string" } }).catch(() => 0),
    ])
    const countOf = new Map(counts.map((c) => [c._id, c.count]))
    return ACCOUNT_ACHIEVEMENT_DEFINITIONS.map((d) => {
        const unlockedCount = countOf.get(d._id) ?? 0
        return { ...d, unlockedCount, unlockedPercent: total > 0 ? Math.round((unlockedCount / total) * 1000) / 10 : 0, outOf: total }
    })
}

/**
 * Logros de cuenta y puntos de una persona. `userId`: su cuenta (null si el jugador no tiene);
 * `playerId`: su jugador (null si la cuenta no tiene), para los puntos de cada club.
 * Si la base compartida no responde, devuelve null: mejor una ficha sin logros de cuenta que
 * una ficha rota.
 */
const getFor = async (userId: string | null, playerId: string | null): Promise<IAccountAchievements | null> => {
    try {
        const [unlocked, clubTotals] = await Promise.all([
            userId
                ? AccountAchievementUnlockedModel.find({ userId }, { _id: 0, userId: 1, playerId: 1, achievementId: 1, reached: 1, unlockedAt: 1 }).sort({ unlockedAt: 1 }).lean()
                : [],
            playerId
                ? PlayerClubTotalsModel.find({ playerId }, { _id: 0 }).sort({ clubId: 1 }).lean()
                : [],
        ])
        const achievements = unlocked.map((u) => ({ ...u, definition: definitions.get(u.achievementId) }))
        const clubs = clubTotals.map((c) => ({ clubId: c.clubId, points: c.points ?? 0, achievements: c.achievements ?? 0 }))
        const account = achievements.reduce((sum, a) => sum + (a.definition?.points ?? 0), 0)
        // Progreso de los que aún no tiene. Solo los que dependen del juego (los datos de
        // Twitch y Discord no se piden aquí), y solo si hay jugador vinculado
        const progress: Record<string, IAchievementProgressValue> = {}
        if (playerId) {
            const metrics = accountMetrics(null, clubTotals)
            for (const def of ACCOUNT_ACHIEVEMENT_DEFINITIONS) {
                const mine = unlocked.filter((u) => u.achievementId === def._id)
                if (def.mode === "unique" && mine.length > 0) continue
                const p = achievementProgress(def, metrics, mine.reduce((max, u) => Math.max(max, u.reached ?? 0), 0))
                if (p) progress[def._id] = p
            }
        }
        return {
            userId,
            achievements,
            points: { account, clubs, total: account + clubs.reduce((sum, c) => sum + c.points, 0) },
            progress,
        }
    } catch (err) {
        console.warn("[achievements] Base compartida no disponible, se sirve sin logros de cuenta:", err instanceof Error ? err.message : err)
        return null
    }
}

export { getDefinitions, getFor }
