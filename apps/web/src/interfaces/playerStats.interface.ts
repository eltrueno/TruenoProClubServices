export interface IPlayerStats {
    playerName: string
    position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward'
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
    goalsConceded: number
    manOfTheMatch: number
    hattricks: number
    pokers: number
    saves: number
}
