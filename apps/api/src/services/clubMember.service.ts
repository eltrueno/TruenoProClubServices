import { ClubMemberModel } from "@trueno-proclub-services/shared/models"
import type { IClubMemberAdminPatch } from "@trueno-proclub-services/shared"
import * as PlayerStatsService from "./playerStats.service.js"
import * as AchievementsService from "./achievements.service.js"
import * as TOTWService from "./totw.service.js"

const getProfileById = async (playerId: string) => {
    const [member, playerStats, playerAchievements, totwAppearances] = await Promise.all([
        ClubMemberModel.findOne({ playerId }, { _id: 0 }),
        PlayerStatsService.getByPlayerId(playerId),
        AchievementsService.getUnlockedByPlayerId(playerId),
        TOTWService.getAppearancesByPlayer(playerId)
    ])
    if (!member) return null
    return {
        member,
        "stats": playerStats,
        "achievements": playerAchievements,
        "totw": totwAppearances
    }
}

const getAll = async () => {
    return ClubMemberModel.find({}, { _id: 0 }).sort({ playerName: 1 })
}

/** Miembro vinculado a una cuenta (para "mi jugador" en la web) */
const getByUserId = async (userId: string) => {
    return ClubMemberModel.findOne({ userId }, { _id: 0 })
}

const exists = async (playerId: string) => !!(await ClubMemberModel.exists({ playerId }))

/** Solo los campos gestionados desde el panel admin */
const adminPatch = async (playerId: string, patch: IClubMemberAdminPatch) => {
    // Una cuenta solo puede estar vinculada a un jugador: si se asigna, se libera de cualquier otro
    if (patch.userId) {
        await ClubMemberModel.updateMany({ userId: patch.userId, playerId: { $ne: playerId } }, { $set: { userId: null } })
    }
    return ClubMemberModel.findOneAndUpdate(
        { playerId },
        { $set: patch },
        { new: true, projection: { _id: 0 } }
    )
}

export { getProfileById, getAll, getByUserId, exists, adminPatch }
