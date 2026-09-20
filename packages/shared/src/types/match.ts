import type { MatchResult, MatchType, PlayerPosition } from "../constants.js"

export interface IMatchPlayer {
    /** personaId de EA */
    playerId: string
    /** gamertag en el momento del partido */
    playerName: string
    rating: number
    secondsPlayed: number
    redCards: number
    position: PlayerPosition
    assists: number
    goals: number
    shots: number
    goalsConceded: number
    manOfTheMatch: boolean
    passesMade: number
    passesSuccess: number
    tacklesMade: number
    tacklesSuccess: number
    cleanSheet: boolean
    ballDiveSaves: number
    crossSaves: number
    goodDirectionSaves: number
    parrySaves: number
    punchSaves: number
    reflexSaves: number
    saves: number
    /** `match_event_aggregate_0` de EA tal cual ("code:count,...") */
    matchEventsRaw?: string
    /** `matchEventsRaw` parseado: código de evento → veces */
    matchEvents?: Record<string, number>
}

export interface IMatchClubStats {
    goals: number
    shots: number
    passesMade: number
    passesSuccess: number
    redCards: number
    tacklesMade: number
    tackleSuccess: number
}

export interface IMatchClub {
    id: number
    name: string
    matchStats: IMatchClubStats
    /** goles en la tanda de penaltis, solo si `winnerByPen` */
    penaltiesScore?: number
    players: IMatchPlayer[]
}

export interface IMatch {
    matchId: number
    matchType: MatchType
    timestamp: number
    result: MatchResult
    winnerByDnf: boolean
    winnerByPen?: boolean
    localTeam?: boolean
    localClub: IMatchClub
    awayClub: IMatchClub
}
