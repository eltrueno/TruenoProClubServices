import { ObjectId } from "mongodb"
import { db } from "../db"

export interface PublicUser {
    id: string
    name: string
    image: string | null
}

export const MAX_IDS_PER_REQUEST = 50

type SyncResult =
    | { ok: true; data: PublicUser[] }
    | { ok: false; error: { code: "NO_VALID_IDS" | "TOO_MANY_IDS" } }

export const publicUserService = {
    async getPublicUsersByIds(rawIds: string[]): Promise<SyncResult> {
        if (rawIds.length > MAX_IDS_PER_REQUEST) {
            return { ok: false, error: { code: "TOO_MANY_IDS" } }
        }

        const validIds = rawIds.filter((id) => ObjectId.isValid(id))
        if (validIds.length === 0) {
            return { ok: false, error: { code: "NO_VALID_IDS" } }
        }

        const users = await db
            .collection("user")
            .find(
                { _id: { $in: validIds.map((id) => new ObjectId(id)) } },
                { projection: { name: 1, image: 1 } }
            )
            .toArray()

        const data: PublicUser[] = users.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            image: u.image ?? null,
        }))

        return { ok: true, data }
    },
}