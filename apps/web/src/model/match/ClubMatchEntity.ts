import type { IMatch } from "@/interfaces/match.interface"
import MatchPlayerEntity from "./MatchPlayerEntity"
import type { IMatchPlayer } from "@/interfaces/matchPlayer.interface"
import { Result } from "@/i18n/translations"

export default class ClubMatchEntity implements IMatch {
    matchId: number
    matchType: "league" | "playoff"
    timestamp: number
    result: Result
    winnerByDnf: Boolean
    winnerByPen?: Boolean
    localTeam?: Boolean
    localClub: {
        id: number
        name: string
        matchStats: {
            goals: number,
            shots: number,
            shotSuccessRate: number,
            passesMade: number,
            passesSuccess: number,
            passSuccessRate: number
            redCards: number,
            tacklesMade: number,
            tackleSuccess: number,
            tackleSuccessRate: number
        }
        players: MatchPlayerEntity[]
    }
    awayClub: {
        id: number
        name: string
        matchStats: {
            goals: number,
            shots: number,
            shotSuccessRate: number,
            passesMade: number,
            passesSuccess: number,
            passSuccessRate: number
            redCards: number,
            tacklesMade: number,
            tackleSuccess: number,
            tackleSuccessRate: number
        }
        players: MatchPlayerEntity[]
    }

    constructor(match: IMatch) {
        Object.assign(this, match)

        if (!(match instanceof ClubMatchEntity)) {
            this.localClub.matchStats.shotSuccessRate = (this.localClub.matchStats.goals / this.localClub.matchStats.shots) * 100
            this.localClub.matchStats.passSuccessRate = (this.localClub.matchStats.passesSuccess / this.localClub.matchStats.passesMade) * 100
            this.localClub.matchStats.tackleSuccessRate = (this.localClub.matchStats.tackleSuccess / this.localClub.matchStats.tacklesMade) * 100
            var localPls: MatchPlayerEntity[] = new Array<MatchPlayerEntity>
            for (var p in match.localClub.players) {
                var imatchpl = <IMatchPlayer>match.localClub.players[p]
                localPls.push(new MatchPlayerEntity(imatchpl))
            }
            this.localClub.players = localPls

            this.awayClub.matchStats.shotSuccessRate = (this.awayClub.matchStats.goals / this.awayClub.matchStats.shots) * 100
            this.awayClub.matchStats.passSuccessRate = (this.awayClub.matchStats.passesSuccess / this.awayClub.matchStats.passesMade) * 100
            this.awayClub.matchStats.tackleSuccessRate = (this.awayClub.matchStats.tackleSuccess / this.awayClub.matchStats.tacklesMade) * 100
            var awayPls: MatchPlayerEntity[] = new Array<MatchPlayerEntity>
            for (var p in match.awayClub.players) {
                var imatchpl = <IMatchPlayer>match.awayClub.players[p]
                awayPls.push(new MatchPlayerEntity(imatchpl))
            }
            this.awayClub.players = awayPls
        }
    }
}

