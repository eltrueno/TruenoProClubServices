import type { AveragePosition, PlayerPosition } from "../constants.js"

/** Acumulado de stats de un jugador en una posición (una colección por tipo: oficial / amistoso) */
export interface IPlayerStats {
    playerName: string
    position: PlayerPosition
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

/** Medias del club por posición, calculadas por el worker a partir de IPlayerStats */
export interface IAverageStats extends Omit<IPlayerStats, "playerName" | "position"> {
    position: AveragePosition
    sampleSize: number
    computedAt: Date

    ratingAve: number
    goalsPerMatch: number
    assistsPerMatch: number
    winRate: number
    passSuccessRate: number
    tackleSuccessRate: number
    shotSuccessRate: number
    savesPerMatch: number
    cleanSheetsPercent: number
    goalsConcededPerMatch: number
    savesPercent: number
    manOfTheMatchPercent: number
    goalsPlusAssists: number
    goalsPlusAssistsPerMatch: number
    passesMadePerMatch: number
    hattricksPerMatch: number
    pokersPerMatch: number
}
