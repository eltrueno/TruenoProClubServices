import { countsForPlayerStats, type IMatchPlayer, type PlayerPosition } from "@trueno-proclub-services/shared"

export default class MatchPlayerEntity implements IMatchPlayer {
    playerId!: string
    playerName!: string
    rating!: number
    redCards!: number
    position!: PlayerPosition
    assists!: number
    goals!: number
    shots!: number
    shotAccuracyPercent!: number
    goalsConceded!: number
    manOfTheMatch!: boolean
    passesMade!: number
    passesSuccess!: number
    passSuccessRate!: number
    tacklesMade!: number
    tacklesSuccess!: number
    tackleSuccessRate!: number
    cleanSheet!: boolean
    secondsPlayed!: number
    minutesPlayed!: number
    saves!: number
    ballDiveSaves!: number
    crossSaves!: number
    goodDirectionSaves!: number
    parrySaves!: number
    punchSaves!: number
    reflexSaves!: number
    matchEventsRaw?: string
    matchEvents?: Record<string, number>
    /** false si apareció con 0 segundos: se muestra, pero no cuenta para stats ni medias */
    played!: boolean

    public constructor(player: IMatchPlayer) {
        Object.assign(this, player)
        if (!(player instanceof MatchPlayerEntity)) {
            this.shotAccuracyPercent = (this.goals / this.shots) * 100
            this.passSuccessRate = (this.passesSuccess / this.passesMade) * 100
            this.tackleSuccessRate = (this.tacklesSuccess / this.tacklesMade) * 100
            this.minutesPlayed = this.secondsPlayed / 60
            this.played = countsForPlayerStats(this)
        }
    }
}
