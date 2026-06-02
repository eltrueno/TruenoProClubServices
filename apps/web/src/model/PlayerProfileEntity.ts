import type { IAchievementUnlocked } from "@/interfaces/achievement.interface";
import type { IClubMember } from "@/interfaces/clubMember.interface";

import type { IPlayerProfile } from "@/interfaces/playerProfile.interface";
import PlayerStatsEntity from "./PlayerStatsEntity";
import type { IMemberTotwAppearances } from "@/interfaces/totw.interface";

export default class PlayerProfileEntity implements IPlayerProfile {
    member!: IClubMember
    stats: {
        "official": PlayerStatsEntity[],
        "friendly": PlayerStatsEntity[]
    } = {
            official: [],
            friendly: []
        }
    achievements: IAchievementUnlocked[] = []
    totw: IMemberTotwAppearances[] = []
    playedPositions: Record<string, number> = {}
    mostPlayedPosition: string = ''

    constructor(member: IClubMember, stats: { "official": any[], "friendly": any[] }, achievements: IAchievementUnlocked[], totw: IMemberTotwAppearances[]) {
        this.member = member
        if (stats) {
            this.stats = {
                friendly: (stats.friendly || []).map(s => new PlayerStatsEntity(s)),
                official: (stats.official || []).map(s => new PlayerStatsEntity(s))
            }

            // Compute playedPositions from all stats (official + friendly)
            const positions: Record<string, number> = {}
            for (const s of [...this.stats.official, ...this.stats.friendly]) {
                if (s.position) {
                    positions[s.position] = (positions[s.position] || 0) + s.gamesPlayed
                }
            }
            this.playedPositions = positions
            this.mostPlayedPosition = Object.entries(positions)
                .sort(([, a], [, b]) => b - a)[0]?.[0] ?? ''
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