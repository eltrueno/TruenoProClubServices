import type { ApiResponse, IClubMember, IClubMemberAdminPatch, ILinkRequest, IPublicUser, ImageScope, UserRole } from "@trueno-proclub-services/shared"
import { AUTH_URL, type ClubLink } from "@/config/site"

/** Error de cualquier llamada: `code` estable (TWITCH_TOKEN_EXPIRED, ALREADY_LINKED…) + `httpStatus` */
export class ApiError extends Error {
    constructor(public readonly code: string, message: string, public readonly httpStatus: number) {
        super(message)
        this.name = "ApiError"
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "DELETE"
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
    /** Cuentas para el panel admin (vincular cuenta ↔ jugador). Solo admins */
    adminUsers: (q?: string) =>
        request<{ status: string; data: IAdminUser[] }>(`${AUTH_URL}/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.data),
    /** Tokens de API para servicios externos. Solo admins */
    apiTokens: () => request<{ status: string; data: IApiToken[] }>(`${AUTH_URL}/api/admin/tokens`).then((r) => r.data),
    /** Crea un token: `token` (en claro) solo viene en esta respuesta */
    createApiToken: (name: string) =>
        request<{ status: string; data: IApiToken & { token: string } }>(`${AUTH_URL}/api/admin/tokens`, { method: "POST", body: { name } }).then((r) => r.data),
    revokeApiToken: (id: string) =>
        request<{ status: string }>(`${AUTH_URL}/api/admin/tokens/${encodeURIComponent(id)}`, { method: "DELETE" }),
}

/** Token de API tal y como lo lista `GET /api/admin/tokens` del auth (sin el token) */
export interface IApiToken {
    id: string
    name: string
    /** principio del token, para reconocerlo */
    hint: string
    createdAt: string
    createdBy: string | null
    lastUsedAt: string | null
}

/** Usuario tal y como lo lista `GET /api/admin/users` del auth */
export interface IAdminUser extends IPublicUser {
    role: UserRole | string
    twitchId: string | null
    discordId: string | null
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

        /** Panel admin (/admin): plantilla, fotos y solicitudes de vinculación de este club */
        admin: {
            patchMember: (playerId: string, patch: IClubMemberAdminPatch) =>
                api<IClubMember>(`/admin/members/${encodeURIComponent(playerId)}`, { method: "PATCH", body: patch }),
            /** Sube la foto ya recortada (PNG 400x450 en data URL) a R2 y la asigna al jugador:
             *  como foto global (todos los clubes) o solo de este club */
            uploadMemberImage: (playerId: string, imageDataUrl: string, scope: ImageScope = "global") =>
                api<IClubMember>(`/admin/members/${encodeURIComponent(playerId)}/image`, { method: "POST", body: { image: imageDataUrl, scope } }),
            /** Descarga una imagen remota vía api (POST a propósito: exige preflight) para pintarla en canvas sin CORS */
            fetchImageViaProxy: async (url: string): Promise<Blob> => {
                const res = await fetch(`${club.apiUrl}/admin/image-proxy`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => null)
                    const code = body?.status?.message || `HTTP_${res.status}`
                    throw new ApiError(code, code, res.status)
                }
                return res.blob()
            },
            /** Pendientes de jugadores de este club (las solicitudes son globales, cada api filtra las suyas) */
            linkRequests: () => api<ILinkRequest[]>("/admin/link-requests"),
            approveLinkRequest: (id: string) =>
                api<{ request: ILinkRequest; member: IClubMember }>(`/admin/link-requests/${encodeURIComponent(id)}/approve`, { method: "POST" }),
            rejectLinkRequest: (id: string) =>
                api<ILinkRequest>(`/admin/link-requests/${encodeURIComponent(id)}/reject`, { method: "POST" }),
        },
    }
}
