export interface ITOTWPlayer {
    playerName: string
    avgRating: number
    gamesPlayed: number
    minutesPlayed: number
    position: string,
    shots: number
    goals: number,
    shotAccuracy: number,
    assists: number,
    redCards: number,
    manOfTheMatch: number,
    cleanSheets: number,
    goalsConceded: number,
    saves: number,
    passesMade: number,
    passesSuccess: number,
    passAccuracy: number,
    tacklesMade: number
    tacklesSuccess: number,
    tackleAccuracy: number
}

export interface ITOTW {
    weekNumber: number
    weekIso: string
    bestPlayers: ITOTWPlayer[]
    worstPlayers: ITOTWPlayer[]
}

export interface IMemberTotwAppearances {
    playerName: string
    type: "best" | "worst"
    position: "goalkeeper" | "defender" | "midfielder" | "forward"
    rating: number
    isoWeek: string
}