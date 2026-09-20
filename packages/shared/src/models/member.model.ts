import { Schema, model } from "mongoose"
import type { IClubMember } from "../types/member.js"

const clubMemberSchema = new Schema<IClubMember>(
    {
        playerId: { type: String, required: true, unique: true },
        playerName: { type: String, required: true, index: true },
        nameHistory: { type: [String], default: [] },
        proName: { type: String },
        proPos: { type: Number },
        proHeight: { type: Number },
        proOverall: { type: Number },
        imageUrl: { type: String, default: null },
        userId: { type: String, default: null, index: true },
        lastSeenAt: { type: Number }
    },
    { timestamps: true, versionKey: false }
)

export const ClubMemberModel = model<IClubMember>("members", clubMemberSchema)
