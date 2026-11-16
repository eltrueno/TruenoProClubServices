import type {
    AchievementCategory, AchievementMetric, AchievementMode, AchievementRarity, AchievementScope, AchievementType
} from "../constants.js"

export interface IAchievementDefinition {
    _id: string
    name: string
    description?: string
    /** de quién es: del jugador en un club, o de la cuenta (común a todos los clubes) */
    type: AchievementType
    /** apartado en el que se enseña */
    category: AchievementCategory
    /** lo que vale (en los `infinite`, cada hito). Para rankings y la futura economía del canal */
    points: number
    /** sale de los puntos (`rarityFromPoints`) */
    rarity: AchievementRarity
    /** oculto: sin conseguirlo se ve que existe, pero no qué es (`isHiddenAchievement`) */
    hidden: boolean
    /** qué se mide */
    metric: AchievementMetric
    scope: AchievementScope
    mode: AchievementMode
    step?: number
    threshold?: number
    exact?: number
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

/**
 * Estado de un jugador en un club que hace falta para los logros de rachas y de calendario
 * (lo que no sale de sumar stats). El worker lo actualiza con cada partido que cuenta, en
 * orden, y lo rehace desde cero en los recálculos.
 */
export interface IAchievementProgress {
    playerId: string
    winStreak: number
    unbeatenStreak: number
    lossStreak: number
    /** partidos seguidos marcando / asistiendo */
    scoringStreak: number
    assistStreak: number
    /** partidos seguidos de delantero sin marcar */
    forwardDrought: number
    /** partidos seguidos con el mismo marcador (p. ej. "2-1") */
    lastScore: string | null
    sameScoreStreak: number
    positionsPlayed: string[]
    positionsScored: string[]
    /** día (YYYY-MM-DD, hora local del club) del último partido y lo hecho ese día */
    day: string | null
    dayMatches: number
    dayWins: number
    dayLosses: number
    dayGoals: number
    /** días distintos en los que ha jugado */
    daysPlayed: number
    /** semana ISO del último partido, semanas seguidas jugando y días de esa semana (1 = lunes … 7 = domingo) */
    week: string | null
    weekStreak: number
    weekDays: number[]
    firstMatchAt: number | null
    lastMatchAt: number | null
    /** días entre el último partido y el anterior */
    daysSinceLastMatch: number
}

/**
 * Lo que lleva un jugador en un club, resumido para los logros de cuenta (base compartida).
 * Cada worker mantiene las filas de su club.
 */
export interface IPlayerClubTotals {
    playerId: string
    clubId: number
    gamesPlayed: number
    wins: number
    goals: number
    assists: number
    /** día (YYYY-MM-DD, hora local) de su último partido en este club */
    lastDay: string | null
    /** logros de club desbloqueados (cada hito cuenta) y los puntos que suman */
    achievements: number
    points: number
    updatedAt?: Date | string
}

/** Logro de cuenta desbloqueado (base compartida). Es de la cuenta: no se pierde al desvincularse */
export interface IAccountAchievementUnlocked {
    userId: string
    /** jugador vinculado a la cuenta cuando se desbloqueó */
    playerId: string
    achievementId: string
    reached?: number
    unlockedAt: Date
}
