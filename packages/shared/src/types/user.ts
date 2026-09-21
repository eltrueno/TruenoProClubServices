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
    /** privacidad: mostrar nombre / avatar cuando la cuenta aparece vinculada a un jugador (por defecto sí) */
    showPublicName?: boolean | null
    showPublicImage?: boolean | null
}

/** Datos públicos de un usuario (lo que expone `GET /api/public/users`) */
export interface IPublicUser {
    id: string
    /** null si el usuario ha ocultado su nombre */
    name: string | null
    /** null si el usuario ha ocultado su avatar (o no tiene) */
    image: string | null
}
