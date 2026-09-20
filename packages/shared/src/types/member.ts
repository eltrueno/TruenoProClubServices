/**
 * Miembro del club. La clave es `playerId` (personaId de EA, estable aunque
 * el jugador cambie de nombre). El doc se crea/actualiza desde los partidos;
 * los campos `pro*` los enriquece `members/stats` de EA por nombre.
 */
export interface IClubMember {
    playerId: string
    /** último gamertag visto para este playerId */
    playerName: string
    /** todos los gamertags con los que se ha visto a este jugador */
    nameHistory: string[]
    proName?: string
    proPos?: number
    proHeight?: number
    proOverall?: number
    /** link a la foto del jugador (gestionado desde el panel admin) */
    imageUrl?: string | null
    /** id del user de Better Auth vinculado (gestionado desde el panel admin) */
    userId?: string | null
    /** timestamp del último partido en el que apareció */
    lastSeenAt?: number
}

/** Campos editables desde el panel admin */
export type IClubMemberAdminPatch = Partial<Pick<IClubMember, "imageUrl" | "userId">>
