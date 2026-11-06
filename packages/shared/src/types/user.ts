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
    /** "1000" | "2000" | "3000" si es sub (nivel 1/2/3), null si no */
    twitchSubTier?: string | null
    /** última sincronización correcta con Twitch (follow/sub/rol) */
    twitchSyncedAt?: Date | string | null
    /** último intento de sincronizar, haya salido bien o no (para no reintentar enseguida) */
    twitchSyncAttemptAt?: Date | string | null
    /** el token de Twitch ya no sirve (caducado, revocado o sin permisos): hay que volver a iniciar sesión */
    twitchNeedsReauth?: boolean | null
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
