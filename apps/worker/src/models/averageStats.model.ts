import { Schema, model } from "mongoose"
import { IAverageStats } from "@interfaces/averageStats.interface"

const averageStatsSchema = new Schema<IAverageStats>(
    {
        position: {
            type: String,
            required: true,
            enum: ['goalkeeper', 'defender', 'midfielder', 'forward', 'general']
        },
        sampleSize: { type: Number, required: true },
        computedAt: { type: Date, required: true },
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
        ratingAve: { type: Number, required: true, default: 0 },
        goalsPerMatch: { type: Number, required: true, default: 0 },
        assistsPerMatch: { type: Number, required: true, default: 0 },
        winRate: { type: Number, required: true, default: 0 },
        passSuccessRate: { type: Number, required: true, default: 0 },
        tackleSuccessRate: { type: Number, required: true, default: 0 },
        shotSuccessRate: { type: Number, required: true, default: 0 },
        savesPerMatch: { type: Number, required: true, default: 0 },
        cleanSheetsPercent: { type: Number, required: true, default: 0 },
        goalsConcededPerMatch: { type: Number, required: true, default: 0 },
        savesPercent: { type: Number, required: true, default: 0 },
        manOfTheMatchPercent: { type: Number, required: true, default: 0 },
        goalsPlusAssists: { type: Number, required: true, default: 0 },
        goalsPlusAssistsPerMatch: { type: Number, required: true, default: 0 },
        passesMadePerMatch: { type: Number, required: true, default: 0 },
        hattricksPerMatch: { type: Number, required: true, default: 0 },
        pokersPerMatch: { type: Number, required: true, default: 0 },
    },
    {
        timestamps: false,
        versionKey: false
    }
)

averageStatsSchema.index({ position: 1 }, { unique: true })

export const AverageStatsModel = model<IAverageStats>("player_average_stats", averageStatsSchema)