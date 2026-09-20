import { finiteNumberOrUndefined, fixEaEncoding, nonEmptyStringOrUndefined, positiveNumberOrUndefined } from "@trueno-proclub-services/shared"
import type { IClubMemberStats } from "@trueno-proclub-services/eafcapi"

/**
 * Info estática que aporta `members/stats` de EA. Este endpoint NO trae el
 * playerId, solo el nombre: se casa con el miembro por `playerName`.
 * Los campos vacíos / "0" quedan undefined para no pisar datos buenos en DB.
 */
export default class MemberInfoDTO {
    playerName: string
    proName?: string
    proPos?: number
    proHeight?: number
    proOverall?: number

    constructor(raw: IClubMemberStats) {
        this.playerName = fixEaEncoding(raw.name)
        this.proName = nonEmptyStringOrUndefined(fixEaEncoding(raw.proName))
        this.proPos = finiteNumberOrUndefined(raw.proPos)
        this.proHeight = positiveNumberOrUndefined(raw.proHeight)
        this.proOverall = positiveNumberOrUndefined(raw.proOverall)
    }
}
