export interface IPlayerStats {
    playerName: string
    gamesPlayed: number
    minutesPlayed: number
    wins: number
    losses: number
    ties: number
    goals: number
    assists: number
    shots: number
    redCards: number
    passesMade: number
    passesSuccess: number
    ratingSum: number
    tacklesMade: number
    tacklesSuccess: number
    cleanSheets: number
    manOfTheMatch: number
    hattricks: number
    pokers: number
    saves: number
    mostPlayedPosition: string
    playedPositions: Record<string, number>
}
