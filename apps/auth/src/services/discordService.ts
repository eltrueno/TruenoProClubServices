import { ObjectId } from "mongodb"
import { db } from "../db/index.js"
import { readToken } from "./tokenCrypto.js"

/**
 * Cuenta de Discord vinculada a una cuenta de aquí (la vinculación en sí la hace Better Auth,
 * ver packages/auth). Solo se guarda quién es: `discordId` y `discordName` en el usuario.
 * Con eso el bot de la comunidad sabe a quién mencionar.
 */
export const isDiscordEnabled = () => !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET)

export const discordService = {
    /**
     * Justo después de vincular: pide a Discord el nombre de usuario con el token recién
     * guardado y lo apunta en el usuario. Si falla, la vinculación vale igual (sin nombre).
     */
    async completeLink(userId: string, account: { accountId?: string; accessToken?: string | null }): Promise<void> {
        const token = await readToken(account.accessToken)
        if (!token) return
        const res = await fetch("https://discord.com/api/users/@me", {
            headers: { authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) {
            console.warn(`[discord] No se ha podido leer el nombre de usuario (${userId}): HTTP ${res.status}`)
            return
        }
        const profile = (await res.json()) as { id?: string; username?: string; global_name?: string | null }
        const discordName = profile.username || profile.global_name || null
        if (!discordName) return
        // Solo si sigue vinculada esa misma cuenta (pudo desvincularla mientras tanto)
        await db.collection("user").updateOne(
            { _id: new ObjectId(userId), discordId: account.accountId ?? profile.id },
            { $set: { discordName } }
        )
    },

    /** Desvincula Discord: borra la cuenta enlazada (con sus tokens) y los datos del usuario */
    async unlink(userId: string): Promise<boolean> {
        const _id = new ObjectId(userId)
        // Better Auth guarda `userId` como ObjectId; se cubre también el caso de texto
        const deleted = await db.collection("account").deleteMany({ providerId: "discord", userId: { $in: [_id, userId] as any[] } })
        const updated = await db.collection("user").updateOne(
            { _id, discordId: { $nin: [null, ""] } },
            { $set: { discordId: null, discordName: null } }
        )
        return deleted.deletedCount > 0 || updated.modifiedCount > 0
    },
}
