import { fixEaEncoding, type IMatch, type IMatchClub, type MatchResult, type MatchType } from "@trueno-proclub-services/shared"
import {
    detectDnf, detectPenalties, getClubScore, getMatchClubIds, getMatchPlayers,
    type IClubMatches
} from "@trueno-proclub-services/eafcapi"
import MatchPlayerDTO from "./matchPlayer.dto.js"
import dotenv from "dotenv"

dotenv.config()
const CLUBID: number = Number(process.env.CLUBID) || 290776

/**
 * Mapea un partido crudo de `clubs/matches` → IMatch.
 * La detección de DNF / penaltis / marcador real vive en eafcapi (parse.ts).
 */
export default class MatchDTO implements IMatch {
    matchId: number
    matchType: MatchType
    timestamp: number
    result: MatchResult
    winnerByDnf: boolean
    winnerByPen: boolean
    localTeam: boolean
    localClub: IMatchClub
    awayClub: IMatchClub

    constructor(raw: IClubMatches & { matchType?: MatchType }) {
        this.matchId = Number(raw.matchId)
        this.timestamp = raw.timestamp
        this.matchType = raw.matchType ?? "league"

        const { ourId, opponentId } = getMatchClubIds(raw, CLUBID)
        this.localTeam = Object.keys(raw.clubs)[0] === ourId

        this.winnerByDnf = detectDnf(raw, [ourId, opponentId])

        // En liga no hay tandas; solo se evalúa en playoff / amistoso.
        const penalties = this.matchType === "league"
            ? { hasPenalties: false as const }
            : detectPenalties(raw, ourId, opponentId)
        this.winnerByPen = penalties.hasPenalties

        const tainted = this.winnerByDnf || this.winnerByPen
        const ourScore = getClubScore(raw, ourId, tainted)
        const opponentScore = getClubScore(raw, opponentId, tainted)
        const ourPens = penalties.hasPenalties ? penalties.scores?.[ourId] ?? 0 : 0
        const opponentPens = penalties.hasPenalties ? penalties.scores?.[opponentId] ?? 0 : 0

        // Resultado: marcador real; si hubo tanda, la decide la tanda. Un DNF lo gana quien se quedó.
        if (this.winnerByDnf) {
            this.result = Number(raw.clubs[ourId]?.goals) === 3 ? "win" : "loose"
        } else if (this.winnerByPen) {
            this.result = ourPens > opponentPens ? "win" : ourPens < opponentPens ? "loose" : "tie"
        } else {
            this.result = ourScore > opponentScore ? "win" : ourScore < opponentScore ? "loose" : "tie"
        }

        const buildClub = (clubId: string, score: number, pens: number): IMatchClub => {
            const aggregate = raw.aggregate?.[clubId] ?? {}
            return {
                id: Number(raw.clubs[clubId]?.details?.clubId ?? clubId),
                name: fixEaEncoding(raw.clubs[clubId]?.details?.name),
                matchStats: {
                    goals: score,
                    shots: Number(aggregate.shots ?? 0),
                    passesMade: Number(aggregate.passattempts ?? 0),
                    passesSuccess: Number(aggregate.passesmade ?? 0),
                    redCards: Number(aggregate.redcards ?? 0),
                    tacklesMade: Number(aggregate.tackleattempts ?? 0),
                    tackleSuccess: Number(aggregate.tacklesmade ?? 0)
                },
                penaltiesScore: this.winnerByPen ? pens : undefined,
                players: getMatchPlayers(raw, clubId).map(({ playerId, player }) => new MatchPlayerDTO(playerId, player))
            }
        }

        const our = buildClub(ourId, ourScore, ourPens)
        const opponent = buildClub(opponentId, opponentScore, opponentPens)
        this.localClub = this.localTeam ? our : opponent
        this.awayClub = this.localTeam ? opponent : our
    }
}
