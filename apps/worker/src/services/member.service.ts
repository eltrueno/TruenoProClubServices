import { ClubMemberModel } from "@trueno-proclub-services/shared/models"
import type { IClubMember } from "@trueno-proclub-services/shared"
import MemberDTO from "../dtos/member.dto.js"
import { getClubMembers, TPlatformType } from "@trueno-proclub-services/eafcapi"

/**
 * Upserts the static info of a member from EA API data.
 * Does NOT touch stats.
 */

const cleanObject = (obj: any) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined))

const upsertMemberInfo = async (memberInfo: IClubMember) => {

    const cleanMember = cleanObject(memberInfo)

    const response = await ClubMemberModel.updateOne(
        { playerName: memberInfo.playerName },
        { $set: cleanMember },
        { upsert: true }
    )
    return response
}

/**
 * Syncs all club members' static info from EA API.
 */
const syncMembersFromEA = async (clubId: number, platform: string) => {
    try {
        const EaMembers = await getClubMembers(<TPlatformType>platform, clubId);
        if (EaMembers) {
            console.info("[Member Service] Syncing member info from EA...");
            for (const key in EaMembers) {
                const dto = new MemberDTO(EaMembers[key]);
                await upsertMemberInfo(dto);
            }
            console.info("[Member Service] Member info sync complete");
        }
    } catch (error) {
        console.error("[Member Service] Error syncing members from EA:", error);
    }
}

export { upsertMemberInfo, syncMembersFromEA }

