import type { ApiResponse, IClubMember, ILinkRequest, UserRole } from "@trueno-proclub-services/shared"
import { AUTH_URL, type ClubLink } from "@/config/site"

/** Error de cualquier llamada: `code` estable (TWITCH_TOKEN_EXPIRED, ALREADY_LINKED…) + `httpStatus` */
export class ApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly httpStatus: number) {
        super(message)
        this.name = "ApiError"
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "DELETE"
    body?: unknown
}

/** Todas las llamadas llevan la cookie de sesión (.casemuro.stream) */
async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    let res: Response
    try {
        res = await fetch(url, {
            method: options.method ?? "GET",
            credentials: "include",
            headers: options.body ? { "Content-Type": "application/json" } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined,
        })
    } catch (e) {
        throw new ApiError("CONNECTION_REFUSED", e instanceof Error ? e.message : "Network error", 0)
    }

    const text = await res.text()
    let body: any = {}
    try { body = text ? JSON.parse(text) : {} } catch { body = {} }
    if (!res.ok) {
        // auth: { status: "error", message, code? } · api: { status: { code, message } }
        const code = typeof body?.code === "string" ? body.code
            : typeof body?.status?.message === "string" ? body.status.message
                : typeof body?.message === "string" ? body.message
                    : `HTTP_${res.status}`
        throw new ApiError(code, typeof body?.message === "string" ? body.message : code, res.status)
    }
    return body as T
}

export interface ITwitchSyncResult {
    status: "success"
    twitchFollowing: boolean
    twitchSub: boolean
    twitchSubTier: string | null
    role: UserRole | string
    twitchSyncedAt?: string
    partial?: boolean
}

/** Rutas propias del servicio de auth (fuera de Better Auth) */
export const authApi = {
    twitchSync: () => request<ITwitchSyncResult>(`${AUTH_URL}/api/twitch/sync`),
}

/**
 * Api de un club. Cada club tiene el suyo, pero la vinculación cuenta ↔ jugador y las
 * solicitudes viven en la base compartida: cualquiera de los dos las ve igual.
 */
export const clubApi = (club: ClubLink) => {
    const api = <T>(path: string, options?: RequestOptions) =>
        request<ApiResponse<T>>(`${club.apiUrl}${path}`, options).then((r) => r.response as T)
    return {
        members: () => api<IClubMember[]>("/members"),
        /** Jugador vinculado a la cuenta, si juega en este club (null si no) */
        mine: () => api<IClubMember | null>("/members/me"),
        myLinkRequest: () => api<ILinkRequest | null>("/members/me/link-request"),
        requestLink: (playerId: string) => api<ILinkRequest>("/members/me/link-request", { method: "POST", body: { playerId } }),
        cancelLinkRequest: () => api<{ cancelled: boolean }>("/members/me/link-request", { method: "DELETE" }),
        /** Suelta el jugador vinculado y retira la solicitud pendiente (antes de borrar la cuenta) */
        unlinkMe: () => api<{ unlinked: boolean }>("/members/me/identity", { method: "DELETE" }),
    }
}
