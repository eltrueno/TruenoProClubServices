export interface IMatchPlayer {
    playername: string
    rating: number
    secondsPlayed: number
    redCards: number
    position: "midfielder" | "forward" | "defender" | "goalkeeper"
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