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
        // Foto propia de este club: tapa a la global (PlayerIdentityModel) mientras exista.
        // El vínculo con la cuenta ya no vive aquí, es global (ver PlayerIdentityModel).
        imageUrl: { type: String, default: null },
        lastSeenAt: { type: Number }
    },
    { timestamps: true, versionKey: false, collection: "members" }
)

export const ClubMemberModel = model<IClubMember>("members", clubMemberSchema)
