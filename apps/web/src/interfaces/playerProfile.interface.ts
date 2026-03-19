import type { IAchievementUnlocked } from "./achievement.interface"
import type { IClubMember } from "./clubMember.interface"
import type { IPlayerStats } from "./playerStats.interface"

export interface IPlayerProfile {
    member: IClubMember
    stats: {
        "official": IPlayerStats,
        "friendly": IPlayerStats
    }
    achievements: IAchievementUnlocked[]
}