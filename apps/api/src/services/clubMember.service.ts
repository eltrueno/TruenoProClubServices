import ClubMemberModel from "@models/clubMember.model"
import * as PlayerStatsService from "@services/playerStats.service"
import * as AchievementsService from "@services/achievements.service"
import * as TOTWService from "@services/totw.service"

const getProfileByName = async (playername: string) => {
    const [member, playerStats, playerAchievements, totwAppearances] = await Promise.all([
        ClubMemberModel.findOne({ playerName: playername }, { _id: 0 }),
        PlayerStatsService.getByName(playername),
        AchievementsService.getUnlockedByPlayerName(playername),
        TOTWService.getAppearancesByPlayer(playername)
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
    const response = await ClubMemberModel.find({}, { _id: 0 })
    return response
}

export { getProfileByName, getAll }