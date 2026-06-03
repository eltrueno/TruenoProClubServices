import type { IAverageStats } from "@interfaces/averageStats.interface";

export default class AverageStatsEntity implements IAverageStats {
    position: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'general'
    sampleSize: number
    computedAt: Date
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

    constructor(json: any) {
        Object.assign(this, json)
    }
}
