import type { ITOTW, ITOTWPlayer } from "@trueno-proclub-services/shared"

export default class TotwEntity implements ITOTW {
    weekNumber: number
    weekIso: string
    bestPlayers: ITOTWPlayer[]
    worstPlayers: ITOTWPlayer[]

    constructor(json: any) {
        Object.assign(this, json)
    }
}
