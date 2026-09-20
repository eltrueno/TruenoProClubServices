import type { UserRole } from "../constants.js"

/** Usuario de Better Auth tal y como lo devuelve `get-session` (campos que usa el resto del sistema) */
export interface IAuthUser {
    id: string
    name: string
    email: string
    image?: string | null
    role?: UserRole | string | null
    twitchId?: string | null
    discordId?: string | null
    twitchFollowing?: boolean | null
    twitchSub?: boolean | null
}

/** Datos públicos de un usuario (lo que expone `GET /api/public/users`) */
export interface IPublicUser {
    id: string
    name: string
    image: string | null
}
