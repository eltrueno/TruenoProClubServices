import mongoose from "mongoose"
import { LinkRequestModel, PlayerIdentityModel } from "@trueno-proclub-services/shared/models"

/**
 * Migración única por base de club al modelo de identidad global:
 * - el vínculo cuenta <-> jugador sale de `members` y pasa a la base compartida
 * - la foto pasa a ser la global; solo se queda como foto del club si la global ya es otra
 * - las solicitudes de vínculo se copian a la base compartida
 *
 * Queda marcada en `migrations` de la base del club y solo se marca al terminar,
 * así que si falla a medias se reintenta en el siguiente arranque (todo es idempotente).
 * Lo que ya haya en la global (de otro club) manda: nunca se pisa.
 */

const MIGRATION_ID = "shared-player-identity-v1"

interface LegacyMember {
    playerId: string
    userId?: string | null
    imageUrl?: string | null
}

interface MigrationMark {
    _id: string
    at: Date
}

export const migrateToSharedIdentity = async (): Promise<void> => {
    const db = mongoose.connection.db
    if (!db) throw new Error("Mongo no conectado")

    const migrations = db.collection<MigrationMark>("migrations")
    if (await migrations.findOne({ _id: MIGRATION_ID })) return

    const members = db.collection<LegacyMember>("members")
    const legacy = await members
        .find(
            { $or: [{ userId: { $type: "string" } }, { imageUrl: { $type: "string" } }] },
            { projection: { _id: 0, playerId: 1, userId: 1, imageUrl: 1 } }
        )
        .toArray()

    let links = 0
    let images = 0
    let clubImages = 0

    for (const m of legacy) {
        const current = await PlayerIdentityModel.findOne({ playerId: m.playerId }).lean()
        const set: { userId?: string; imageUrl?: string } = {}

        // Una cuenta = un jugador: si esa cuenta ya está en otro, no se duplica
        if (m.userId && !current?.userId && !(await PlayerIdentityModel.exists({ userId: m.userId }))) set.userId = m.userId
        if (m.imageUrl && !current?.imageUrl) set.imageUrl = m.imageUrl

        if (set.userId || set.imageUrl) {
            await PlayerIdentityModel.updateOne(
                { playerId: m.playerId },
                { $set: set, $setOnInsert: { playerId: m.playerId } },
                { upsert: true }
            )
        }
        if (set.userId) links++
        if (set.imageUrl) images++

        const globalImage = set.imageUrl ?? current?.imageUrl ?? null
        if (m.imageUrl && m.imageUrl !== globalImage) clubImages++
        else if (m.imageUrl) await members.updateOne({ playerId: m.playerId }, { $unset: { imageUrl: "" } })
    }

    // El vínculo ya no vive en members
    await members.updateMany({ userId: { $exists: true } }, { $unset: { userId: "" } })

    // Solicitudes de vínculo: se copian sin pisar las que ya estén en la compartida
    const oldRequests = await db.collection("link_requests").find().toArray()
    if (oldRequests.length > 0) {
        await LinkRequestModel.collection.bulkWrite(
            oldRequests.map(({ _id, ...doc }) => ({
                updateOne: { filter: { _id }, update: { $setOnInsert: doc }, upsert: true }
            })),
            { ordered: false }
        )
    }

    await migrations.insertOne({ _id: MIGRATION_ID, at: new Date() })
    console.info(
        `[identity] Migración a la base compartida hecha: ${links} vínculos, ${images} fotos globales, ` +
        `${clubImages} fotos propias del club, ${oldRequests.length} solicitudes copiadas`
    )
}
