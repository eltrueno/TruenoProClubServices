import type { IAchievementUnlocked } from "@/interfaces/achievement.interface";
import type { IClubMember } from "@/interfaces/clubMember.interface";
import type { IPlayerStats } from "@/interfaces/playerStats.interface";
import type { IPlayerProfile } from "@/interfaces/playerProfile.interface";
import PlayerStatsEntity from "./PlayerStatsEntity";

export default class PlayerProfileEntity implements IPlayerProfile {
    member: IClubMember
    stats: {
        "official": IPlayerStats,
        "friendly": IPlayerStats
    }
    achievements: IAchievementUnlocked[]

    constructor(member: IClubMember, stats: { "official": IPlayerStats, "friendly": IPlayerStats }, achievements: IAchievementUnlocked[]) {
        Object.assign(this.member, member)
        this.stats.friendly = new PlayerStatsEntity(stats.friendly)
        this.stats.official = new PlayerStatsEntity(stats.official)
        Object.assign(this.achievements, achievements)
    }
}