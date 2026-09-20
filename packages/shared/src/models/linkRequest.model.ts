import { Schema, model } from "mongoose"
import { LINK_REQUEST_STATUS } from "../constants.js"
import type { ILinkRequest } from "../types/linkRequest.js"

const linkRequestSchema = new Schema<ILinkRequest>(
    {
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        userImage: { type: String, default: null },
        playerId: { type: String, required: true, index: true },
        playerName: { type: String, required: true },
        status: { type: String, enum: LINK_REQUEST_STATUS, default: "pending", index: true },
        resolvedAt: { type: Date, default: null },
        resolvedBy: { type: String, default: null }
    },
    {
        timestamps: true,
        versionKey: false,
        collection: "link_requests",
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: any) => { delete ret._id; return ret }
        }
    }
)

export const LinkRequestModel = model<ILinkRequest>("link_requests", linkRequestSchema)
