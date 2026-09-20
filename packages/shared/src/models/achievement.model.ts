import { Schema, model } from "mongoose"
import { ACHIEVEMENT_CATEGORIES, ACHIEVEMENT_MODES, ACHIEVEMENT_SCOPES, ACHIEVEMENT_TYPES } from "../constants.js"
import type { IAchievementDefinition, IAchievementUnlocked } from "../types/achievement.js"

const achievementDefinitionSchema = new Schema<IAchievementDefinition>(
    {
        _id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        category: { type: String, enum: ACHIEVEMENT_CATEGORIES, required: true },
        scope: { type: String, enum: ACHIEVEMENT_SCOPES, required: true },
        type: { type: String, enum: ACHIEVEMENT_TYPES, required: true },
        mode: { type: String, enum: ACHIEVEMENT_MODES, required: true },
        step: { type: Number },
        threshold: { type: Number },
        exact: { type: Number }
    },
    { _id: false, timestamps: true }
)

const achievementUnlockedSchema = new Schema<IAchievementUnlocked>(
    {
        playerName: { type: String, required: true, index: true },
        achievementId: { type: String, required: true, index: true },
        reached: { type: Number },
        unlockedAt: { type: Date, default: Date.now },
        matchId: { type: String }
    },
    { timestamps: true }
)

// Evita duplicar un logro único o un mismo hito
achievementUnlockedSchema.index({ playerName: 1, achievementId: 1, reached: 1 }, { unique: true })

export const AchievementDefinitionModel = model<IAchievementDefinition>("achievements_definitions", achievementDefinitionSchema)
export const AchievementUnlockedModel = model<IAchievementUnlocked>("achievements_unlocked", achievementUnlockedSchema)
