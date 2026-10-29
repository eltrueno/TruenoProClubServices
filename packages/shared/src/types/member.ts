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
    /** Foto efectiva del jugador en este club: la propia del club si la hay y,
     *  si no, la global (ver IPlayerIdentity). La resuelve el api. */
    imageUrl?: string | null
    /** De dónde sale `imageUrl` (para el panel admin) */
    imageSource?: ImageScope | null
    /** id del user de Better Auth vinculado. El vínculo es global (IPlayerIdentity):
     *  la misma cuenta es el mismo jugador en todos los clubes. */
    userId?: string | null
    /** timestamp (segundos) del último partido en el que apareció */
    lastSeenAt?: number
    /** fecha de alta del doc (timestamps de mongoose): primera vez que se le vio en el club */
    createdAt?: Date | string
    updatedAt?: Date | string
}

/**
 * Alcance de una foto de jugador:
 * - `global`: la de todos los clubes (IPlayerIdentity)
 * - `club`: solo la de este club; tapa a la global mientras exista
 */
export type ImageScope = "global" | "club"

/** Campos editables desde el panel admin. `imageScope` dice dónde va `imageUrl` (por defecto global). */
export type IClubMemberAdminPatch = Partial<Pick<IClubMember, "imageUrl" | "userId">> & {
    imageScope?: ImageScope
}
