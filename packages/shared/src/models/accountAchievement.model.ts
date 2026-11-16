import { Schema } from "mongoose"
import type { IAccountAchievementUnlocked, IPlayerClubTotals } from "../types/achievement.js"
import { sharedDb } from "./sharedDb.js"

/**
 * Logros de cuenta, en la base compartida por todos los clubes (ver sharedDb.ts).
 *
 * `player_club_totals`: lo que lleva cada jugador en cada club. Cada worker escribe solo las
 * filas de su club; juntas dan los totales "entre clubes" sin que un club lea la base de otro.
 *
 * `account_achievements_unlocked`: los logros de cuenta desbloqueados, por cuenta (`userId`).
 */
const playerClubTotalsSchema = new Schema<IPlayerClubTotals>(
    {
        playerId: { type: String, required: true },
        clubId: { type: Number, required: true },
        gamesPlayed: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        goals: { type: Number, default: 0 },
        assists: { type: Number, default: 0 },
        lastDay: { type: String, default: null },
        achievements: { type: Number, default: 0 },
        points: { type: Number, default: 0 }
    },
    { timestamps: true, versionKey: false, collection: "player_club_totals" }
)
playerClubTotalsSchema.index({ playerId: 1, clubId: 1 }, { unique: true })

const accountAchievementUnlockedSchema = new Schema<IAccountAchievementUnlocked>(
    {
        userId: { type: String, required: true, index: true },
        playerId: { type: String, required: true },
        achievementId: { type: String, required: true },
        reached: { type: Number },
        unlockedAt: { type: Date, default: Date.now }
    },
    { timestamps: true, versionKey: false, collection: "account_achievements_unlocked" }
)
// Evita duplicar un logro único o un mismo hito (también si dos workers evalúan a la vez)
accountAchievementUnlockedSchema.index({ userId: 1, achievementId: 1, reached: 1 }, { unique: true })

export const PlayerClubTotalsModel = sharedDb.model<IPlayerClubTotals>("player_club_totals", playerClubTotalsSchema)
export const AccountAchievementUnlockedModel = sharedDb.model<IAccountAchievementUnlocked>("account_achievements_unlocked", accountAchievementUnlockedSchema)
