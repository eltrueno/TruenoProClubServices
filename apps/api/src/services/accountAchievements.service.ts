import { ACCOUNT_ACHIEVEMENT_DEFINITIONS, type IAccountAchievements } from "@trueno-proclub-services/shared"
import { AccountAchievementUnlockedModel, PlayerClubTotalsModel } from "@trueno-proclub-services/shared/models"

/**
 * Logros de cuenta (comunes a todos los clubes). Las definiciones salen del repo (shared), y
 * de la base compartida, los desbloqueos y lo que lleva el jugador en cada club. Aquí solo se
 * lee: quien evalúa y guarda es el worker.
 */

const definitions = new Map(ACCOUNT_ACHIEVEMENT_DEFINITIONS.map(({ _id, ...definition }) => [_id, definition]))

const getDefinitions = () => ACCOUNT_ACHIEVEMENT_DEFINITIONS

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
                ? PlayerClubTotalsModel.find({ playerId }, { _id: 0, clubId: 1, points: 1, achievements: 1 }).sort({ clubId: 1 }).lean()
                : [],
        ])
        const achievements = unlocked.map((u) => ({ ...u, definition: definitions.get(u.achievementId) }))
        const clubs = clubTotals.map((c) => ({ clubId: c.clubId, points: c.points ?? 0, achievements: c.achievements ?? 0 }))
        const account = achievements.reduce((sum, a) => sum + (a.definition?.points ?? 0), 0)
        return {
            userId,
            achievements,
            points: { account, clubs, total: account + clubs.reduce((sum, c) => sum + c.points, 0) }
        }
    } catch (err) {
        console.warn("[achievements] Base compartida no disponible, se sirve sin logros de cuenta:", err instanceof Error ? err.message : err)
        return null
    }
}

export { getDefinitions, getFor }
