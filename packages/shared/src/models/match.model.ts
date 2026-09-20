import { Schema, model } from "mongoose"
import { MATCH_RESULTS, MATCH_TYPES, PLAYER_POSITIONS } from "../constants.js"
import type { IMatch, IMatchClub, IMatchPlayer } from "../types/match.js"

const matchPlayerSchema = new Schema<IMatchPlayer>(
    {
        playername: { type: String },
        rating: { type: Number },
        secondsPlayed: { type: Number },
        redCards: { type: Number },
        position: { type: String, enum: PLAYER_POSITIONS },
        assists: { type: Number },
        goals: { type: Number },
        shots: { type: Number },
        goalsConceded: { type: Number },
        manOfTheMatch: { type: Boolean },
        passesMade: { type: Number },
        passesSuccess: { type: Number },
        tacklesMade: { type: Number },
        tacklesSuccess: { type: Number },
        cleanSheet: { type: Boolean },
        ballDiveSaves: { type: Number },
        crossSaves: { type: Number },
        goodDirectionSaves: { type: Number },
        parrySaves: { type: Number },
        punchSaves: { type: Number },
        reflexSaves: { type: Number },
        saves: { type: Number }
    },
    { _id: false }
)

const matchClubSchema = new Schema<IMatchClub>(
    {
        id: { type: Number, required: true },
        name: { type: String, required: true },
        matchStats: {
            goals: { type: Number, required: true },
            shots: { type: Number, required: true },
            passesMade: { type: Number, required: true },
            passesSuccess: { type: Number, required: true },
            redCards: { type: Number, required: true },
            tacklesMade: { type: Number, required: true },
            tackleSuccess: { type: Number, required: true }
        },
        players: { type: [matchPlayerSchema], required: true }
    },
    { _id: false }
)

export type MatchDocument = IMatch & { _id: number }

// _id === matchId (lo fija el worker al insertar); matchId se mantiene como campo consultable.
const matchSchema = new Schema<MatchDocument>(
    {
        _id: { type: Number },
        matchId: { type: Number, required: true },
        matchType: { type: String, enum: MATCH_TYPES, required: true },
        timestamp: { type: Number, required: true },
        result: { type: String, enum: MATCH_RESULTS, required: true },
        winnerByDnf: { type: Boolean, required: true },
        winnerByPen: { type: Boolean, default: false },
        localTeam: { type: Boolean, default: true },
        localClub: { type: matchClubSchema, required: true },
        awayClub: { type: matchClubSchema, required: true }
    },
    { timestamps: true, versionKey: false }
)

matchSchema.index({ matchId: 1 }, { unique: true })
matchSchema.index({ timestamp: -1 })

export const MatchModel = model<MatchDocument>("matches", matchSchema)
