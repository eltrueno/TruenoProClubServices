import type { LinkRequestStatus } from "../constants.js"

/**
 * Solicitud de un usuario para vincular su cuenta a un jugador del club.
 * La crea el propio usuario desde "Mi cuenta" y la aprueba/rechaza un admin
 * desde el panel (aprobarla equivale a `PATCH /admin/members/:playerId { userId }`).
 */
export interface ILinkRequest {
    id: string
    userId: string
    /** snapshot del usuario para mostrar en el panel sin ir al auth */
    userName: string
    userImage?: string | null
    playerId: string
    playerName: string
    status: LinkRequestStatus
    createdAt: Date | string
    resolvedAt?: Date | string | null
    /** id del admin que la resolvió */
    resolvedBy?: string | null
}
