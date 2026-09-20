import { ClubMemberModel } from "@trueno-proclub-services/shared/models"
import { compactObject, type IMatch } from "@trueno-proclub-services/shared"
import MemberInfoDTO from "../dtos/member.dto.js"
import { getClubMembers, type TPlatformType } from "@trueno-proclub-services/eafcapi"

/**
 * Da de alta / actualiza a los miembros de nuestro club a partir de un partido.
 * Es la única fuente del `playerId` (EA solo lo da aquí), así que la membresía
 * la definen los partidos: quien juega, existe. Mantiene el último nombre visto
 * y el histórico de nombres.
 */
const upsertMembersFromMatch = async (match: IMatch, clubId: number) => {
    const isLocal = Number(match.localClub.id) === Number(clubId)
    const ourPlayers = isLocal ? match.localClub.players : match.awayClub.players

    for (const player of ourPlayers) {
        if (!player.playerId) continue
        await ClubMemberModel.updateOne(
            { playerId: player.playerId },
            {
                $set: { playerName: player.playerName },
                $max: { lastSeenAt: match.timestamp },
                $addToSet: { nameHistory: player.playerName },
                $setOnInsert: { playerId: player.playerId }
            },
            { upsert: true }
        )
    }
}

/**
 * Enriquecimiento desde `members/stats` de EA (proName, proOverall, ...).
 * Este endpoint no trae id: se casa por `playerName`. Solo se escriben los
 * campos con valor; uno vacío nunca pisa un dato bueno.
 */
const upsertMemberInfo = async (info: MemberInfoDTO) => {
    const { playerName, ...fields } = info
    const toSet = compactObject({ ...fields })
    if (Object.keys(toSet).length === 0) return null

    return ClubMemberModel.updateOne(
        { playerName },
        { $set: toSet }
    )
}

const syncMembersFromEA = async (clubId: number, platform: string) => {
    try {
        const eaMembers = await getClubMembers(<TPlatformType>platform, clubId)
        if (!eaMembers || !Array.isArray(eaMembers) || eaMembers.length === 0) {
            console.warn("[Member Service] EA returned no members, skipping enrichment")
            return
        }
        console.info("[Member Service] Enriching member info from EA...")
        let matched = 0
        for (const raw of eaMembers) {
            const dto = new MemberInfoDTO(raw)
            if (!dto.playerName) continue
            const res = await upsertMemberInfo(dto)
            if (res?.matchedCount) matched++
        }
        console.info(`[Member Service] Member info sync complete (${matched}/${eaMembers.length} matched by name)`)
    } catch (error) {
        console.error("[Member Service] Error syncing members from EA:", error)
    }
}

export { upsertMembersFromMatch, upsertMemberInfo, syncMembersFromEA }
