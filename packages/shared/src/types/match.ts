import type { MatchResult, MatchType, PlayerPosition } from "../constants.js"

export interface IMatchPlayer {
    playername: string
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
