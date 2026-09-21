import type { IClubMember } from "@trueno-proclub-services/shared"

export default class ClubMemberEntity implements IClubMember {
    playerId!: string
    playerName!: string
    nameHistory: string[] = []
    proName?: string
    proPos?: number
    proHeight?: number
    proOverall?: number
    imageUrl?: string | null
    userId?: string | null
    lastSeenAt?: number
    createdAt?: Date | string
    updatedAt?: Date | string

    constructor(member: IClubMember) {
        Object.assign(this, member)
    }
}
