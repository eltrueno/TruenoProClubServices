import type { IAchievementUnlocked } from "./achievement.js"
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
    achievements: IAchievementUnlocked[]
    totw: IMemberTotwAppearances[]
}
