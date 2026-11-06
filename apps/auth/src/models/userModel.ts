import { ObjectId } from "mongodb"
import { db } from "../db/index.js"

import { User } from "@trueno-proclub-services/auth"
import { UserRole } from "@trueno-proclub-services/shared"

/** Roles que pone un admin a mano: la sincronización con Twitch nunca los toca */
export const PROTECTED_ROLES: string[] = [UserRole.admin, UserRole.mod, UserRole.vip]

export const userModel = {
  /**
   * Guarda el resultado de una sincronización. El rol va aparte y con condición: solo se
   * escribe si el rol que hay EN ESE MOMENTO no es protegido. Así, si un admin le pone
   * `vip` mientras dura la sincronización, no se pisa. Devuelve el rol que queda.
   */
  async applyTwitchSync(userId: string, payload: Partial<User>, role: string): Promise<string> {
    const _id = new ObjectId(userId)
    const users = db.collection("user")
    await users.updateOne({ _id }, { $set: payload })
    const updated = await users.findOneAndUpdate(
      { _id, role: { $nin: PROTECTED_ROLES } },
      { $set: { role } },
      { returnDocument: "after", projection: { role: 1 } }
    )
    if (updated) return updated.role
    const current = await users.findOne({ _id }, { projection: { role: 1 } })
    return current?.role ?? role
  },

  /** Intento de sincronización que no ha salido bien: para no reintentar enseguida */
  markTwitchSyncAttempt(userId: string, at: Date): Promise<any> {
    return db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { twitchSyncAttemptAt: at } }
    )
  },

  /** El token de Twitch ya no sirve: no se vuelve a intentar hasta que inicie sesión de nuevo */
  markTwitchNeedsReauth(userId: string, at: Date): Promise<any> {
    return db.collection("user").updateOne(
      { _id: new ObjectId(userId) },
      { $set: { twitchNeedsReauth: true, twitchSyncAttemptAt: at } }
    )
  },

  /**
   * Usuarios a los que les toca repaso: última sincronización correcta anterior a
   * `staleBefore` y último intento anterior a `retryBefore` (para no machacar a los que
   * fallan). Primero los que llevan más tiempo sin intentarse, así los que fallan siempre
   * no acaparan la pasada. Se saltan los que necesitan volver a iniciar sesión.
   */
  async findTwitchSyncDue(staleBefore: Date, retryBefore: Date, limit: number): Promise<User[]> {
    const docs = await db.collection("user")
      .find({
        twitchId: { $nin: [null, ""] },
        twitchNeedsReauth: { $ne: true },
        $and: [
          { $or: [{ twitchSyncedAt: { $exists: false } }, { twitchSyncedAt: null }, { twitchSyncedAt: { $lt: staleBefore } }] },
          { $or: [{ twitchSyncAttemptAt: { $exists: false } }, { twitchSyncAttemptAt: null }, { twitchSyncAttemptAt: { $lt: retryBefore } }] },
        ],
      })
      .sort({ twitchSyncAttemptAt: 1, twitchSyncedAt: 1 })
      .limit(limit)
      .toArray()
    return docs.map((d) => ({ ...d, id: d._id.toString() }) as unknown as User)
  }
}
