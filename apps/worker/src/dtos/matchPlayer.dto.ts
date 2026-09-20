import type { IMatchPlayer, PlayerPosition } from "@trueno-proclub-services/shared"
import { parseMatchEvents, type IMatchClubPlayer } from "@trueno-proclub-services/eafcapi"

const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

const hasCleanSheetFlags = (raw: IMatchClubPlayer) =>
    raw.cleansheetsany !== undefined || raw.cleansheetsdef !== undefined || raw.cleansheetsgk !== undefined

/** Mapea un jugador crudo de `clubs/matches` (con su id, que es la clave del objeto `players`) → IMatchPlayer */
export default class MatchPlayerDTO implements IMatchPlayer {
    playerId: string
    playerName: string
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
    matchEventsRaw?: string
    matchEvents?: Record<string, number>

    constructor(playerId: string, raw: IMatchClubPlayer) {
        this.playerId = playerId
        this.playerName = raw.playername
        this.rating = num(raw.rating)
        this.secondsPlayed = num(raw.secondsPlayed)
        this.redCards = num(raw.redcards)
        this.position = (raw.pos || "midfielder") as PlayerPosition
        this.assists = num(raw.assists)
        this.goals = num(raw.goals)
        this.shots = num(raw.shots)
        this.goalsConceded = num(raw.goalsconceded)
        this.manOfTheMatch = raw.mom === "1"
        this.passesMade = num(raw.passattempts)
        this.passesSuccess = num(raw.passesmade)
        this.tacklesMade = num(raw.tackleattempts)
        this.tacklesSuccess = num(raw.tacklesmade)
        // EA marca la portería a cero por jugador (any/def/gk) según minutos y posición; solo si no viene, caemos a goalsConceded === 0
        this.cleanSheet = hasCleanSheetFlags(raw)
            ? raw.cleansheetsany === "1" || raw.cleansheetsdef === "1" || raw.cleansheetsgk === "1"
            : this.goalsConceded === 0
        this.ballDiveSaves = num(raw.ballDiveSaves)
        this.crossSaves = num(raw.crossSaves)
        this.goodDirectionSaves = num(raw.goodDirectionSaves)
        this.parrySaves = num(raw.parrySaves)
        this.punchSaves = num(raw.punchSaves)
        this.reflexSaves = num(raw.reflexSaves)
        this.saves = num(raw.saves)
        this.matchEventsRaw = raw.match_event_aggregate_0 || undefined
        this.matchEvents = this.matchEventsRaw ? parseMatchEvents(this.matchEventsRaw) : undefined
    }
}
