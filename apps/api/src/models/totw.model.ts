import { Schema, model } from "mongoose"
import { IMemberTotwAppearances, ITOTW } from "@interfaces/totw.interface"

const totwSchema = new Schema<ITOTW>({
    weekNumber: { type: Number, required: true },
    weekIso: { type: String, required: true },
    bestPlayers: [
        {
            playerName: { type: String, required: true },
            avgRating: { type: Number, required: true },
            gamesPlayed: { type: Number, required: true },
            minutesPlayed: { type: Number },
            position: { type: String, enum: ["goalkeeper", "defender", "midfielder", "forward"], required: true },
            shots: { type: Number },
            goals: { type: Number },
            shotAccuracy: { type: Number },
            assists: { type: Number },
            redCards: { type: Number },
            manOfTheMatch: { type: Number },
            cleanSheets: { type: Number },
            goalsConceded: { type: Number },
            saves: { type: Number },
            passesMade: { type: Number },
            passesSuccess: { type: Number },
            passAccuracy: { type: Number },
            tacklesMade: { type: Number },
            tacklesSuccess: { type: Number },
            tackleAccuracy: { type: Number },
            _id: false
        }
    ],
    worstPlayers: [
        {
            playerName: { type: String, required: true },
            avgRating: { type: Number, required: true },
            gamesPlayed: { type: Number, required: true },
            minutesPlayed: { type: Number },
            position: { type: String, enum: ["goalkeeper", "defender", "midfielder", "forward"], required: true },
            shots: { type: Number },
            goals: { type: Number },
            shotAccuracy: { type: Number },
            assists: { type: Number },
            redCards: { type: Number },
            manOfTheMatch: { type: Number },
            cleanSheets: { type: Number },
            goalsConceded: { type: Number },
            saves: { type: Number },
            passesMade: { type: Number },
            passesSuccess: { type: Number },
            passAccuracy: { type: Number },
            tacklesMade: { type: Number },
            tacklesSuccess: { type: Number },
            tackleAccuracy: { type: Number },
            _id: false
        }
    ]
}, { timestamps: true, versionKey: false }).index({ weekIso: 1 }, { unique: true })

const memberTotwAppearancesSchema = new Schema<IMemberTotwAppearances>({
    playerName: { type: String, required: true },
    type: { type: String, enum: ["best", "worst"], required: true },
    position: { type: String, enum: ["goalkeeper", "defender", "midfielder", "forward"], required: true },
    rating: { type: Number, required: true },
    isoWeek: { type: String, required: true }
}, { timestamps: true, versionKey: false }).index({ playerName: 1, isoWeek: 1, type: 1 }, { unique: true })

export const TOTWModel = model<ITOTW>("totw", totwSchema)
export const MemberTotwAppearancesModel = model<IMemberTotwAppearances>("member_totw_appearances", memberTotwAppearancesSchema)