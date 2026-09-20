import type { IAchievementUnlocked, IClubMember, IMemberTotwAppearances, IPlayerProfile, IAchievementDefinition } from "@trueno-proclub-services/shared"
import PlayerStatsEntity from "./PlayerStatsEntity"

/** Logro desbloqueado tal y como lo devuelve /members/:id (con la definición embebida) */
export type UnlockedAchievement = IAchievementUnlocked & { definition?: Omit<IAchievementDefinition, "_id"> }

export default class PlayerProfileEntity implements IPlayerProfile {
    member!: IClubMember
    stats: { official: PlayerStatsEntity[]; friendly: PlayerStatsEntity[] } = { official: [], friendly: [] }
    achievements: UnlockedAchievement[] = []
    totw: IMemberTotwAppearances[] = []
    playedPositions: Record<string, number> = {}
    mostPlayedPosition: string = ""

    constructor(member: IClubMember, stats: IPlayerProfile["stats"] | undefined, achievements: UnlockedAchievement[], totw: IMemberTotwAppearances[]) {
        this.member = member
        if (stats) {
            this.stats = {
                friendly: (stats.friendly || []).map((s) => new PlayerStatsEntity(s)),
                official: (stats.official || []).map((s) => new PlayerStatsEntity(s))
            }
            const positions: Record<string, number> = {}
            for (const s of [...this.stats.official, ...this.stats.friendly]) {
                if (s.position) positions[s.position] = (positions[s.position] || 0) + s.gamesPlayed
            }
            this.playedPositions = positions
            this.mostPlayedPosition = Object.entries(positions).sort(([, a], [, b]) => b - a)[0]?.[0] ?? ""
        }
        this.achievements = achievements || []
        this.totw = totw || []
    }
}
