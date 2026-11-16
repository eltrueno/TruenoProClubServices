import { Schema, model } from "mongoose"
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_METRICS, ACHIEVEMENT_MODES, ACHIEVEMENT_RARITIES, ACHIEVEMENT_SCOPES, ACHIEVEMENT_TYPES } from "../constants.js"
import type { IAchievementDefinition, IAchievementProgress, IAchievementUnlocked } from "../types/achievement.js"

const achievementDefinitionSchema = new Schema<IAchievementDefinition>(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        type: { type: String, enum: ACHIEVEMENT_TYPES, required: true },
        category: { type: String, enum: ACHIEVEMENT_CATEGORIES, required: true },
        points: { type: Number, default: 0 },
        rarity: { type: String, enum: ACHIEVEMENT_RARITIES, required: true },
        hidden: { type: Boolean, default: false },
        metric: { type: String, enum: ACHIEVEMENT_METRICS, required: true },
        scope: { type: String, enum: ACHIEVEMENT_SCOPES, required: true },
        mode: { type: String, enum: ACHIEVEMENT_MODES, required: true },
        step: { type: Number },
        threshold: { type: Number },
        exact: { type: Number }
    },
    { _id: false, timestamps: true, collection: "achievements_definitions" }
)

const achievementUnlockedSchema = new Schema<IAchievementUnlocked>(
    {
        playerId: { type: String, required: true, index: true },
        playerName: { type: String, required: true },
        achievementId: { type: String, required: true, index: true },
        reached: { type: Number },
        unlockedAt: { type: Date, default: Date.now },
        matchId: { type: String }
    },
    { timestamps: true, collection: "achievements_unlocked" }
)

// Evita duplicar un logro único o un mismo hito
achievementUnlockedSchema.index({ playerId: 1, achievementId: 1, reached: 1 }, { unique: true })

export const AchievementDefinitionModel = model<IAchievementDefinition>("achievements_definitions", achievementDefinitionSchema)
export const AchievementUnlockedModel = model<IAchievementUnlocked>("achievements_unlocked", achievementUnlockedSchema)

/** Estado por jugador para los logros de rachas y calendario (ver IAchievementProgress) */
const achievementProgressSchema = new Schema<IAchievementProgress>(
    {
        playerId: { type: String, required: true, unique: true },
        winStreak: { type: Number, default: 0 },
        unbeatenStreak: { type: Number, default: 0 },
        lossStreak: { type: Number, default: 0 },
        scoringStreak: { type: Number, default: 0 },
        assistStreak: { type: Number, default: 0 },
        forwardDrought: { type: Number, default: 0 },
        lastScore: { type: String, default: null },
        sameScoreStreak: { type: Number, default: 0 },
        positionsPlayed: { type: [String], default: [] },
        positionsScored: { type: [String], default: [] },
        day: { type: String, default: null },
        dayMatches: { type: Number, default: 0 },
        dayWins: { type: Number, default: 0 },
        dayLosses: { type: Number, default: 0 },
        dayGoals: { type: Number, default: 0 },
        daysPlayed: { type: Number, default: 0 },
        week: { type: String, default: null },
        weekStreak: { type: Number, default: 0 },
        weekDays: { type: [Number], default: [] },
        firstMatchAt: { type: Number, default: null },
        lastMatchAt: { type: Number, default: null },
        daysSinceLastMatch: { type: Number, default: 0 }
    },
    { timestamps: true, versionKey: false, collection: "achievements_progress" }
)

export const AchievementProgressModel = model<IAchievementProgress>("achievements_progress", achievementProgressSchema)
