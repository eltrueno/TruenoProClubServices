import { ClubMemberModel } from "@trueno-proclub-services/shared/models"
import * as PlayerStatsService from "./playerStats.service.js"
import * as AchievementsService from "./achievements.service.js"
import * as TOTWService from "./totw.service.js"

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