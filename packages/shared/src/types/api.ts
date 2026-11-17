import type { IAccountAchievementUnlocked, IAchievementDefinition, IAchievementUnlocked } from "./achievement.js"
import type { IAchievementProgressValue } from "../achievementMetrics.js"
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
    /** cuánto le falta para cada logro de club que aún no tiene (o para el siguiente escalón de un hito) */
    progress: Record<string, IAchievementProgressValue>
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
    /** cuánto le falta para cada logro de cuenta que aún no tiene (solo los que dependen del juego) */
    progress: Record<string, IAchievementProgressValue>
}

/**
 * Definición tal y como la devuelven `/achievements` y `/achievements/account`, con cuánta gente
 * lo tiene: jugadores del club con algún partido que cuente (club) o cuentas vinculadas (cuenta).
 */
export type IAchievementDefinitionWithStats = IAchievementDefinition & {
    unlockedCount: number
    /** 0-100, con un decimal */
    unlockedPercent: number
    /** sobre cuántos se calcula el porcentaje (jugadores del club o cuentas vinculadas) */
    outOf: number
}
