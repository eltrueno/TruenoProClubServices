import { Schema, model } from "mongoose"
import { PLAYER_POSITIONS, TOTW_TYPES } from "../constants.js"
import type { IMemberTotwAppearances, ITOTW, ITOTWPlayer } from "../types/totw.js"

const totwPlayerSchema = new Schema<ITOTWPlayer>(
    {
        playerId: { type: String, required: true },
        playerName: { type: String, required: true },
        avgRating: { type: Number, required: true },
        gamesPlayed: { type: Number, required: true },
        minutesPlayed: { type: Number },
        position: { type: String, enum: PLAYER_POSITIONS, required: true },
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
        tackleAccuracy: { type: Number }
    },
    { _id: false }
)

const totwSchema = new Schema<ITOTW>(
    {
        weekNumber: { type: Number, required: true },
        weekIso: { type: String, required: true },
        bestPlayers: [totwPlayerSchema],
        worstPlayers: [totwPlayerSchema]
    },
    { timestamps: true, versionKey: false, collection: "totw" }
)
totwSchema.index({ weekIso: 1 }, { unique: true })

const memberTotwAppearancesSchema = new Schema<IMemberTotwAppearances>(
    {
        playerId: { type: String, required: true },
        playerName: { type: String, required: true },
        type: { type: String, enum: TOTW_TYPES, required: true },
        position: { type: String, enum: PLAYER_POSITIONS, required: true },
        rating: { type: Number, required: true },
        isoWeek: { type: String, required: true }
    },
    { timestamps: true, versionKey: false, collection: "member_totw_appearances" }
)
memberTotwAppearancesSchema.index({ playerId: 1, isoWeek: 1, type: 1 }, { unique: true })

export const TOTWModel = model<ITOTW>("totw", totwSchema)
export const MemberTotwAppearancesModel = model<IMemberTotwAppearances>("member_totw_appearances", memberTotwAppearancesSchema)
