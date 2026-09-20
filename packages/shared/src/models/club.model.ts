import { Schema, model } from "mongoose"
import type { IClub } from "../types/club.js"

const clubSchema = new Schema<IClub>(
    {
        clubId: { type: Number, required: true },
        name: { type: String },
        regionId: { type: Number },
        stats: { type: Schema.Types.Mixed, required: true, default: {} }
    },
    { timestamps: true, collection: "clubs", versionKey: false }
)

clubSchema.index({ clubId: 1 }, { unique: true })

export const ClubModel = model<IClub>("clubs", clubSchema)
