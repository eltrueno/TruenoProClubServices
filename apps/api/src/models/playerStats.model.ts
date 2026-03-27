import { Schema, model } from "mongoose"
import { IPlayerStats } from "@interfaces/playerStats.interface"

const playerStatsSchema = new Schema<IPlayerStats>(
    {
        playerName: {
            type: String,
            required: true,
            unique: true
        },
        gamesPlayed: { type: Number, required: true, default: 0 },
        minutesPlayed: { type: Number, required: true, default: 0 },
        wins: { type: Number, required: true, default: 0 },
        losses: { type: Number, required: true, default: 0 },
        ties: { type: Number, required: true, default: 0 },
        goals: { type: Number, required: true, default: 0 },
        assists: { type: Number, required: true, default: 0 },
        shots: { type: Number, required: true, default: 0 },
        redCards: { type: Number, required: true, default: 0 },
        passesMade: { type: Number, required: true, default: 0 },
        passesSuccess: { type: Number, required: true, default: 0 },
        ratingSum: { type: Number, required: true, default: 0 },
        tacklesMade: { type: Number, required: true, default: 0 },
        tacklesSuccess: { type: Number, required: true, default: 0 },
        cleanSheets: { type: Number, required: true, default: 0 },
        goalsConceded: { type: Number, required: true, default: 0 },
        manOfTheMatch: { type: Number, required: true, default: 0 },
        hattricks: { type: Number, required: true, default: 0 },
        pokers: { type: Number, required: true, default: 0 },
        saves: { type: Number, required: true, default: 0 },
        mostPlayedPosition: { type: String, required: true, default: "unknown" },
        playedPositions: {
            type: Map,
            of: Number,
            required: true,
            default: {}
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
)

export const PlayerStatsOfficialModel = model("member_stats_officials", playerStatsSchema)
export const PlayerStatsFriendlyModel = model("member_stats_friendlies", playerStatsSchema)
