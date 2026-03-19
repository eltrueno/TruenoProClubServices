import { IMatchPlayer } from "@interfaces/matchPlayer.interface"

export default class MatchPlayerDTO implements IMatchPlayer {
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

    constructor(rawdata?: any) {
        this.playername = rawdata.playername,
            this.rating = Number(rawdata.rating)
        this.secondsPlayed = Number(rawdata.secondsPlayed)
        this.redCards = Number(rawdata.redcards)
        this.position = rawdata.pos
        this.assists = Number(rawdata.assists)
        this.goals = Number(rawdata.goals)
        this.shots = Number(rawdata.shots)
        this.goalsConceded = Number(rawdata.goalsconceded)
        this.manOfTheMatch = Boolean(Number(rawdata.mom))
        this.passesMade = Number(rawdata.passattempts),
            this.passesSuccess = Number(rawdata.passesmade),
            this.tacklesMade = Number(rawdata.tackleattempts)
        this.tacklesSuccess = Number(rawdata.tacklesmade)
        this.cleanSheet = Boolean(this.goalsConceded === 0)
        this.ballDiveSaves = Number(rawdata.ballDiveSaves)
        this.crossSaves = Number(rawdata.crossSaves)
        this.goodDirectionSaves = Number(rawdata.goodDirectionSaves)
        this.parrySaves = Number(rawdata.parrySaves)
        this.punchSaves = Number(rawdata.punchSaves)
        this.reflexSaves = Number(rawdata.reflexSaves)
        this.saves = Number(rawdata.saves)
    }


}