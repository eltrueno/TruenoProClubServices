import { ClubMemberModel } from "@trueno-proclub-services/shared/models"
import type { IClubMember, IClubMemberAdminPatch } from "@trueno-proclub-services/shared"
import * as PlayerIdentityService from "./playerIdentity.service.js"
import * as PlayerStatsService from "./playerStats.service.js"
import * as AchievementsService from "./achievements.service.js"
import * as TOTWService from "./totw.service.js"

/** Miembro de este club con su vínculo y su foto ya resueltos (identidad global + foto del club) */
const getMerged = async (playerId: string) => {
    const member = await ClubMemberModel.findOne({ playerId }, { _id: 0 }).lean<IClubMember>()
    if (!member) return null
    const identities = await PlayerIdentityService.getMany([playerId])
    return PlayerIdentityService.merge(member, identities.get(playerId))
}

const getProfileById = async (playerId: string) => {
    const [member, playerStats, playerAchievements, totwAppearances] = await Promise.all([
        getMerged(playerId),
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
    const members = await ClubMemberModel.find({}, { _id: 0 }).sort({ playerName: 1 }).lean<IClubMember[]>()
    const identities = await PlayerIdentityService.getMany(members.map((m) => m.playerId))
    return members.map((m) => PlayerIdentityService.merge(m, identities.get(m.playerId)))
}

/** Miembro de este club vinculado a una cuenta (para "mi jugador" en la web).
 *  El vínculo es global: si el jugador de esa cuenta no juega en este club, no hay miembro. */
const getByUserId = async (userId: string) => {
    const identity = await PlayerIdentityService.getByUserId(userId)
    return identity ? getMerged(identity.playerId) : null
}

const exists = async (playerId: string) => !!(await ClubMemberModel.exists({ playerId }))

/**
 * Solo los campos gestionados desde el panel admin:
 * - `userId` va a la identidad global (una cuenta = un jugador en todos los clubes)
 * - `imageUrl` va a la global por defecto, o a la de este club con `imageScope: "club"`
 */
const adminPatch = async (playerId: string, patch: IClubMemberAdminPatch) => {
    if (!(await exists(playerId))) return null

    if ("userId" in patch) await PlayerIdentityService.setUserId(playerId, patch.userId ?? null)

    if ("imageUrl" in patch) {
        const imageUrl = patch.imageUrl ?? null
        if (patch.imageScope === "club") {
            // `null` quita la del club y vuelve a verse la global
            await ClubMemberModel.updateOne({ playerId }, { $set: { imageUrl } })
        } else {
            await PlayerIdentityService.setImageUrl(playerId, imageUrl)
            // Lo que se pone es lo que se ve: sin foto del club tapando a la global
            await ClubMemberModel.updateOne({ playerId }, { $set: { imageUrl: null } })
        }
    }

    return getMerged(playerId)
}

export { getProfileById, getAll, getByUserId, getMerged, exists, adminPatch }
