import { PlayerIdentityModel } from "@trueno-proclub-services/shared/models"
import type { IClubMember, IPlayerIdentity } from "@trueno-proclub-services/shared"

/**
 * Identidad global de los jugadores (base compartida entre clubes): vínculo con
 * la cuenta y foto por defecto. El api la mezcla con el miembro de su club para
 * que la web siga recibiendo `userId` e `imageUrl` como siempre.
 */

const PROJECTION = { _id: 0, playerId: 1, userId: 1, imageUrl: 1 } as const

const getByPlayerId = async (playerId: string): Promise<IPlayerIdentity | null> =>
    PlayerIdentityModel.findOne({ playerId }, PROJECTION).lean<IPlayerIdentity>()

const getByUserId = async (userId: string): Promise<IPlayerIdentity | null> =>
    PlayerIdentityModel.findOne({ userId }, PROJECTION).lean<IPlayerIdentity>()

/**
 * Identidades de varios jugadores de una vez. Si la base compartida no responde
 * (p. ej. sin permisos todavía), se avisa y se sigue sin ellas: mejor una plantilla
 * sin vínculos que una plantilla rota.
 */
const getMany = async (playerIds: string[]): Promise<Map<string, IPlayerIdentity>> => {
    if (playerIds.length === 0) return new Map()
    try {
        const docs = await PlayerIdentityModel.find({ playerId: { $in: playerIds } }, PROJECTION).lean<IPlayerIdentity[]>()
        return new Map(docs.map((d) => [d.playerId, d]))
    } catch (err) {
        console.warn("[identity] Base compartida no disponible, se sirven miembros sin vínculo ni foto global:", err instanceof Error ? err.message : err)
        return new Map()
    }
}

/** Vincula (o desvincula con `null`) una cuenta. Una cuenta = un jugador: se libera de cualquier otro. */
const setUserId = async (playerId: string, userId: string | null): Promise<void> => {
    if (userId) {
        await PlayerIdentityModel.updateMany({ userId, playerId: { $ne: playerId } }, { $set: { userId: null } })
    }
    await PlayerIdentityModel.updateOne({ playerId }, { $set: { userId }, $setOnInsert: { playerId } }, { upsert: true })
}

const setImageUrl = async (playerId: string, imageUrl: string | null): Promise<void> => {
    await PlayerIdentityModel.updateOne({ playerId }, { $set: { imageUrl }, $setOnInsert: { playerId } }, { upsert: true })
}

type MemberLike = Pick<IClubMember, "playerId" | "imageUrl">

/** Miembro del club + su identidad global, con la forma que espera la web */
const merge = <T extends MemberLike>(member: T, identity: IPlayerIdentity | null | undefined): T & Pick<IClubMember, "userId" | "imageUrl" | "imageSource"> => {
    const clubImage = member.imageUrl ?? null
    const globalImage = identity?.imageUrl ?? null
    return {
        ...member,
        userId: identity?.userId ?? null,
        imageUrl: clubImage ?? globalImage,
        imageSource: clubImage ? "club" : globalImage ? "global" : null
    }
}

export { getByPlayerId, getByUserId, getMany, setUserId, setImageUrl, merge }
