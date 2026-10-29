/**
 * Identidad global de un jugador de EA, común a todos los clubes (vive en la
 * base compartida, no en la de cada club). `playerId` es el personaId de EA,
 * el mismo juegue donde juegue, así que lo que es de la persona va aquí:
 * - la cuenta vinculada (una cuenta = un jugador, en todos los clubes)
 * - la foto por defecto (cada club puede taparla con la suya, ver IClubMember)
 */
export interface IPlayerIdentity {
    playerId: string
    /** id del user de Better Auth vinculado */
    userId: string | null
    /** foto por defecto del jugador */
    imageUrl: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
}
