import type { IMatch, MatchResult, MatchType } from "@trueno-proclub-services/shared"
import MatchPlayerEntity from "./MatchPlayerEntity"

export interface ClubMatchSide {
    id: number
    name: string
    matchStats: {
        goals: number
        shots: number
        shotSuccessRate: number
        passesMade: number
        passesSuccess: number
        passSuccessRate: number
        redCards: number
        tacklesMade: number
        tackleSuccess: number
        tackleSuccessRate: number
    }
    /** goles en la tanda, solo si winnerByPen */
    penaltiesScore?: number
    players: MatchPlayerEntity[]
}

export default class ClubMatchEntity implements IMatch {
    matchId!: number
    matchType!: MatchType
    timestamp!: number
    result!: MatchResult
    winnerByDnf!: boolean
    winnerByPen?: boolean
    localTeam?: boolean
    localClub!: ClubMatchSide
    awayClub!: ClubMatchSide

    constructor(match: IMatch) {
        Object.assign(this, match)
        if (match instanceof ClubMatchEntity) return

        for (const side of [this.localClub, this.awayClub]) {
            const s = side.matchStats
            s.shotSuccessRate = (s.goals / s.shots) * 100
            s.passSuccessRate = (s.passesSuccess / s.passesMade) * 100
            s.tackleSuccessRate = (s.tackleSuccess / s.tacklesMade) * 100
            side.players = (side.players ?? []).map((p) => new MatchPlayerEntity(p))
        }
    }

    /** Nuestro lado del partido (según localTeam) */
    get ourClub(): ClubMatchSide {
        return this.localTeam ? this.localClub : this.awayClub
    }

    get opponentClub(): ClubMatchSide {
        return this.localTeam ? this.awayClub : this.localClub
    }
}
