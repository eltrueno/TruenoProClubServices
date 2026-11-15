import { createHash, randomBytes } from "node:crypto"
import { ObjectId } from "mongodb"
import { db } from "../db/index.js"

/**
 * Tokens de API para servicios externos (de servidor a servidor, fuera de casemuro.stream).
 * Los crea un admin desde el panel. El token solo se enseña al crearlo: aquí se guarda su
 * hash (SHA-256; el token son 32 bytes aleatorios, no hace falta un hash lento).
 */
export const TOKEN_PREFIX = "tpcs_"
const COLLECTION = "api_tokens"
/** `lastUsedAt` se escribe como mucho una vez por minuto y token */
const LAST_USED_EVERY_MS = 60_000

interface ApiTokenDoc {
    _id: ObjectId
    name: string
    tokenHash: string
    /** primeros caracteres, para reconocerlo en el panel */
    hint: string
    createdAt: Date
    createdBy: string | null
    lastUsedAt: Date | null
}

export interface ApiTokenInfo {
    id: string
    name: string
    hint: string
    createdAt: Date
    createdBy: string | null
    lastUsedAt: Date | null
}

const tokens = () => db.collection<ApiTokenDoc>(COLLECTION)
const hash = (token: string) => createHash("sha256").update(token).digest("hex")
const toInfo = (d: ApiTokenDoc): ApiTokenInfo => ({
    id: d._id.toString(),
    name: d.name,
    hint: d.hint,
    createdAt: d.createdAt,
    createdBy: d.createdBy ?? null,
    lastUsedAt: d.lastUsedAt ?? null
})

export const apiTokenService = {
    ensureIndexes: () => tokens().createIndex({ tokenHash: 1 }, { unique: true }),

    async list(): Promise<ApiTokenInfo[]> {
        return (await tokens().find({}).sort({ createdAt: -1 }).toArray()).map(toInfo)
    },

    /** Crea un token. `token` (en claro) solo existe en esta respuesta */
    async create(name: string, createdBy: string | null): Promise<ApiTokenInfo & { token: string }> {
        const token = TOKEN_PREFIX + randomBytes(32).toString("base64url")
        const doc: ApiTokenDoc = {
            _id: new ObjectId(),
            name,
            tokenHash: hash(token),
            hint: token.slice(0, TOKEN_PREFIX.length + 4),
            createdAt: new Date(),
            createdBy,
            lastUsedAt: null
        }
        await tokens().insertOne(doc)
        return { ...toInfo(doc), token }
    },

    /** Revocar = borrar: el token deja de valer en el acto */
    async revoke(id: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false
        return (await tokens().deleteOne({ _id: new ObjectId(id) })).deletedCount === 1
    },

    /** El token si es válido (y apunta su último uso), null si no */
    async verify(token: string): Promise<ApiTokenInfo | null> {
        if (!token.startsWith(TOKEN_PREFIX)) return null
        const doc = await tokens().findOne({ tokenHash: hash(token) })
        if (!doc) return null
        const now = Date.now()
        if (!doc.lastUsedAt || now - doc.lastUsedAt.getTime() > LAST_USED_EVERY_MS) {
            tokens().updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date(now) } })
                .catch((err) => console.error("[api-token] lastUsedAt:", err))
        }
        return toInfo(doc)
    }
}
