import type { AchievementCategory, AchievementMode, AchievementScope, AchievementType } from "../constants.js"

export interface IAchievementDefinition {
    _id: string
    name: string
    description?: string
    category: AchievementCategory
    scope: AchievementScope
    type: AchievementType
    mode: AchievementMode
    step?: number
    threshold?: number
    exact?: number
    /** lo que vale (en los `infinite`, cada hito). Para rankings y la futura economía del canal */
    points: number
}

export interface IAchievementUnlocked {
    playerId: string
    /** gamertag en el momento del desbloqueo */
    playerName: string
    achievementId: string
    reached?: number
    unlockedAt: Date
    matchId?: string
}
