import { Schema, model } from "mongoose"
import { IClubMember } from "@interfaces/clubMember.interface"

const clubMemberSchema = new Schema<IClubMember>(
    {
        playerName: {
            type: String,
            required: true,
            unique: true
        },
        proName: {
            type: String,
            required: false
        },
        proPos: {
            type: Number,
            required: false
        },
        proHeight: {
            type: Number,
            required: false
        },
        proOverall: {
            type: Number,
            required: false
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
)

const ClubMemberModel = model("members", clubMemberSchema)
export default ClubMemberModel