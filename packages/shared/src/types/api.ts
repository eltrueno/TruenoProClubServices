import type { IAccountAchievementUnlocked, IAchievementDefinition, IAchievementUnlocked } from "./achievement.js"
import type { IClubMember } from "./member.js"
import type { IPlayerStats } from "./playerStats.js"
import type { IMemberTotwAppearances } from "./totw.js"

/** Envoltorio de respuesta que devuelve la REST API */
export interface ApiResponse<T> {
    status: {
        code: number
        message: string
    }
    response: T
}

/** GET /members/:player */
export interface IPlayerProfile {
    member: IClubMember
    stats: {
        official: IPlayerStats[]
        friendly: IPlayerStats[]
    }
    /** logros de club del jugador en este club, con la definición embebida */
    achievements: (IAchievementUnlocked & { definition?: Omit<IAchievementDefinition, "_id"> })[]
    /** logros de cuenta y puntos (null si el jugador no tiene cuenta vinculada) */
    account: IAccountAchievements | null
    totw: IMemberTotwAppearances[]
}

/** Logros de cuenta de una persona y sus puntos (GET /members/:playerId y /members/me/achievements) */
export interface IAccountAchievements {
    userId: string | null
    achievements: (IAccountAchievementUnlocked & { definition?: Omit<IAchievementDefinition, "_id"> })[]
    points: {
        /** de los logros de cuenta */
        account: number
        /** de los logros de club, por club */
        clubs: { clubId: number, points: number, achievements: number }[]
        total: number
    }
}
