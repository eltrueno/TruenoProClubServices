import type { PlayerPosition, TotwType } from "../constants.js"

export interface ITOTWPlayer {
    playerName: string
    avgRating: number
    gamesPlayed: number
    minutesPlayed: number
    position: PlayerPosition
    shots: number
    goals: number
    shotAccuracy: number
    assists: number
    redCards: number
    manOfTheMatch: number
    cleanSheets: number
    goalsConceded: number
    saves: number
    passesMade: number
    passesSuccess: number
    passAccuracy: number
    tacklesMade: number
    tacklesSuccess: number
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
    type: TotwType
    position: PlayerPosition
    rating: number
    isoWeek: string
}
