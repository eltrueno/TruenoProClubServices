import type { IAchievementUnlocked } from "@/interfaces/achievement.interface";
import type { IClubMember } from "@/interfaces/clubMember.interface";
import type { IPlayerStats } from "@/interfaces/playerStats.interface";
import type { IPlayerProfile } from "@/interfaces/playerProfile.interface";
import PlayerStatsEntity from "./PlayerStatsEntity";
import type { IMemberTotwAppearances } from "@/interfaces/totw.interface";

export default class PlayerProfileEntity implements IPlayerProfile {
    member!: IClubMember
    stats: {
        "official": IPlayerStats,
        "friendly": IPlayerStats
    } = {
            official: {} as IPlayerStats,
            friendly: {} as IPlayerStats
        }
    achievements: IAchievementUnlocked[] = []
    totw: IMemberTotwAppearances[] = []

    constructor(member: IClubMember, stats: { "official": IPlayerStats, "friendly": IPlayerStats }, achievements: IAchievementUnlocked[], totw: IMemberTotwAppearances[]) {
        this.member = member
        if (stats) {
            this.stats = {
                friendly: new PlayerStatsEntity(stats.friendly),
                official: new PlayerStatsEntity(stats.official)
            }
        }
        this.achievements = achievements || []
        this.totw = totw || []

        function fixEncoding(str: string) {
            return new TextDecoder("utf-8").decode(
                new Uint8Array([...str].map(c => c.charCodeAt(0)))
            );
        }
        if (this.member.proName) this.member.proName = fixEncoding(this.member.proName);
    }
}