import MemberDTO from "@dtos/member.dto"
import { upsertMemberInfo } from "@services/member.service"

/**
 * Upserts a member's static info from raw EA API data.
 * Safe to call periodically; never touches stats collections.
 */
async function updateMemberInfo(rawdata: any) {
    try {
        const dto = new MemberDTO(rawdata)
        const response = await upsertMemberInfo(dto)
        return response
    } catch (err) {
        console.error(err)
        throw new Error("ERROR_UPDATING_MEMBER")
    }
}

export { updateMemberInfo }
