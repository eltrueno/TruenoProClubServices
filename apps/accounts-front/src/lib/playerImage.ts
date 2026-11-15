import type { IClubMember } from "@trueno-proclub-services/shared"

export const PLAYER_PLACEHOLDER = "/players/placeholder_top_transp.png"

/** Foto del jugador: la URL guardada desde el panel admin o el placeholder */
export const playerImage = (member?: Pick<IClubMember, "imageUrl"> | null): string =>
    member?.imageUrl || PLAYER_PLACEHOLDER

/** Handler @error para <img>: cae al placeholder si el link está roto */
export const onPlayerImageError = (e: Event) => {
    const img = e.target as HTMLImageElement | null
    if (img && !img.src.endsWith(PLAYER_PLACEHOLDER)) img.src = PLAYER_PLACEHOLDER
}
