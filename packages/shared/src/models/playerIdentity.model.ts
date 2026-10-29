import { Schema } from "mongoose"
import type { IPlayerIdentity } from "../types/playerIdentity.js"
import { sharedDb } from "./sharedDb.js"

const playerIdentitySchema = new Schema<IPlayerIdentity>(
    {
        playerId: { type: String, required: true, unique: true },
        userId: { type: String, default: null },
        imageUrl: { type: String, default: null }
    },
    { timestamps: true, versionKey: false, collection: "players" }
)

// Una cuenta solo puede estar vinculada a un jugador (los null no cuentan)
playerIdentitySchema.index(
    { userId: 1 },
    { unique: true, partialFilterExpression: { userId: { $type: "string" } } }
)

export const PlayerIdentityModel = sharedDb.model<IPlayerIdentity>("players", playerIdentitySchema)
