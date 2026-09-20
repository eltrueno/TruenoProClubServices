import MemberInfoDTO from "../dtos/member.dto.js"
import { upsertMemberInfo } from "../services/member.service.js"
import type { IClubMemberStats } from "@trueno-proclub-services/eafcapi"

/**
 * Upserts a member's static info from raw EA API data.
 * Safe to call periodically; never touches stats collections.
 */
async function updateMemberInfo(rawdata: IClubMemberStats) {
    try {
        return await upsertMemberInfo(new MemberInfoDTO(rawdata))
    } catch (err) {
        console.error(err)
        throw new Error("ERROR_UPDATING_MEMBER")
    }
}

export { updateMemberInfo }
