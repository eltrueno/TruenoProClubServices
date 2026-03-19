import { IMember } from "@interfaces/member.interface"

/**
 * Maps raw EA API members endpoint payload → IMember (static fields only).
 * Called when manually refreshing player info from EA.
 */
export default class MemberDTO implements IMember {
    playerName: string
    proName?: string
    proPos?: number
    proHeight?: number
    proOverall?: number

    constructor(rawdata: any) {
        this.playerName = rawdata.name
        this.proName = rawdata.proName || undefined
        this.proPos = rawdata.proPos ? Number(rawdata.proPos) : undefined
        this.proHeight = rawdata.proHeight ? Number(rawdata.proHeight) : undefined
        this.proOverall = rawdata.proOverall ? Number(rawdata.proOverall) : undefined
    }

}
