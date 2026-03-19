import { Schema, model } from "mongoose";
import { IAchievementDefinition, IAchievementUnlocked } from "@interfaces/achievement.interface";

const achievementDefinitionSchema = new Schema<IAchievementDefinition>({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    category: {
        type: String,
        enum: ["gamesPlayed", "goals", "assists", "redCards", "passesMade", "passesSuccess", "manOfTheMatch", "hattricks", "pokers", "cleanSheets", "saves", "minutesPlayed", "pass_accuracy", "shot_accuracy", "totwBest", "totwWorst"],
        required: true
    },
    scope: { type: String, enum: ["cumulative", "match"], required: true },
    type: { type: String, enum: ["official", "friendly", "general"], required: true },
    mode: { type: String, enum: ["infinite", "unique"], required: true },
    step: { type: Number },
    threshold: { type: Number },
    exact: { type: Number }
}, { _id: false, timestamps: true });

const achievementUnlockedSchema = new Schema<IAchievementUnlocked>({
    playerName: { type: String, required: true, index: true },
    achievementId: { type: String, required: true, index: true },
    reached: { type: Number },
    unlockedAt: { type: Date, default: Date.now },
    matchId: { type: String }
}, { timestamps: true });

// Compound index to avoid duplicate unlocks of the same unique achievement or same milestone
achievementUnlockedSchema.index({ playerName: 1, achievementId: 1, reached: 1 }, { unique: true });

export const AchievementDefinitionModel = model("achievements_definitions", achievementDefinitionSchema);
export const AchievementUnlockedModel = model("achievements_unlocked", achievementUnlockedSchema);
