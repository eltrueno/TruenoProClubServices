import { Schema, model } from "mongoose"
import type { IClubMember } from "../types/member.js"

const clubMemberSchema = new Schema<IClubMember>(
    {
        playerName: { type: String, required: true, unique: true },
        proName: { type: String },
        proPos: { type: Number },
        proHeight: { type: Number },
        proOverall: { type: Number }
    },
    { timestamps: true, versionKey: false }
)

export const ClubMemberModel = model<IClubMember>("members", clubMemberSchema)
