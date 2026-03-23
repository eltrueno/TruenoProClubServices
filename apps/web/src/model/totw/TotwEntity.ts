import type { ITOTW, ITOTWPlayer } from "@interfaces/totw.interface";

export default class TotwEntity implements ITOTW {
    weekNumber: number
    weekIso: string
    bestPlayers: ITOTWPlayer[]
    worstPlayers: ITOTWPlayer[]

    constructor(json: any) {
        Object.assign(this, json)
    }
}
