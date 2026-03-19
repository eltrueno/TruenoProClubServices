import { Schema, model } from "mongoose"
import { IMember } from "@interfaces/member.interface"

const memberSchema = new Schema<IMember>(
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

const MemberModel = model("members", memberSchema)
export default MemberModel
