import type {
    ApiResponse, IAchievementDefinition, IAverageStats, IClub, IClubMember, ILinkRequest,
    IMatch, IPlayerProfile, IPlayerStats, IPublicUser, ITOTW, IMemberTotwAppearances
} from "@trueno-proclub-services/shared"
import { CLUB } from "@/config/club"

// Cada club tiene su propio api; el auth es común. Ambos salen de la config del club (ver config/club.ts)
export const API_URL = CLUB.apiUrl
export const AUTH_URL = CLUB.authUrl

/** Error tipado de cualquier llamada: `code` estable (ERROR_NOT_FOUND, UNAUTHORIZED…) + `httpStatus` */
export class ApiError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly httpStatus: number
    ) {
        super(message)
        this.name = "ApiError"
    }
}

interface RequestOptions<TBody = unknown> {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
    body?: TBody
    /** Envía la cookie de sesión*/
    credentials?: boolean
}

async function request<T, TBody = unknown>(base: string, path: string, options: RequestOptions<TBody> = {}): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${base}${path}`, {
            method: options.method ?? "GET",
            credentials: options.credentials ? "include" : "same-origin",
            headers: options.body ? { "Content-Type": "application/json" } : undefined,
            body: options.body ? JSON.stringify(options.body) : undefined
        })
    } catch (e) {
        throw new ApiError("CONNECTION_REFUSED", e instanceof Error ? e.message : "Network error", 0)
    }

    const text = await res.text()
    const body = text ? JSON.parse(text) : {}
    if (!res.ok) {
        // api: { status: { code, message } } · auth: { status: "error", message, code? }
        // El `code` del auth va primero: su `message` es texto legible, no un código estable
        const code = typeof body?.code === "string" ? body.code
            : typeof body?.status?.message === "string" ? body.status.message
                : typeof body?.message === "string" ? body.message
                    : `HTTP_${res.status}`
        throw new ApiError(code, code, res.status)
    }
    return body as T
}

/** Envoltorio `{ status, response }` del api */
const api = <T>(path: string, options?: RequestOptions) =>
    request<ApiResponse<T>>(API_URL, path, options).then((r) => r.response)

export const tpcsApi = {
    club: () => request<{ status: number; response?: IClub }>(API_URL, "/club").then((r) => r.response ?? null),

    members: {
        getAll: () => api<IClubMember[]>("/members"),
        getProfile: (playerId: string) => api<IPlayerProfile>(`/members/${encodeURIComponent(playerId)}`),
        getAllStats: () => api<{ official: IPlayerStats[]; friendly: IPlayerStats[] }>("/members/stats"),
        getStatsByType: (type: "official" | "friendly") => api<IPlayerStats[]>(`/members/stats/${type}`),
        /** Jugador vinculado a la cuenta con sesión, si juega en este club (null si no) */
        getMine: () => api<IClubMember | null>("/members/me", { credentials: true }),
        /** EA ID vinculado a la cuenta (juegue o no en este club) y su miembro aquí, en una sola petición */
        getMyIdentity: () => api<{ playerId: string | null; member?: IClubMember | null }>("/members/me/identity", { credentials: true }),
        /** Solicitud de vinculación pendiente de la cuenta con sesión (null si no hay) */
        getMyLinkRequest: () => api<ILinkRequest | null>("/members/me/link-request", { credentials: true }),
        requestLink: (playerId: string) => api<ILinkRequest>("/members/me/link-request", { method: "POST", body: { playerId }, credentials: true }),
        cancelLinkRequest: () => api<{ cancelled: boolean }>("/members/me/link-request", { method: "DELETE", credentials: true }),
    },

    matches: {
        getAll: () => api<IMatch[]>("/matches"),
        getLatest: (limit?: number) => api<IMatch[]>(`/matches/ordered${limit ? `?limit=${limit}` : ""}`),
        getLatestByType: (type: string, limit?: number) => api<IMatch[]>(`/matches/ordered/${type}${limit ? `?limit=${limit}` : ""}`),
        getByPlayer: (playerId: string, limit?: number) => api<IMatch[]>(`/matches/player/${encodeURIComponent(playerId)}${limit ? `?limit=${limit}` : ""}`),
        getById: (matchId: number | string) => api<IMatch>(`/matches/${matchId}`),
    },

    achievements: {
        /** Logros de club (los de este club) */
        getDefinitions: () => api<IAchievementDefinition[]>("/achievements"),
        /** Logros de cuenta (comunes a todos los clubes) */
        getAccountDefinitions: () => api<IAchievementDefinition[]>("/achievements/account"),
    },

    totw: {
        getAll: () => api<ITOTW[]>("/totw"),
        getLatest: () => api<ITOTW>("/totw/latest"),
        getByWeek: (week: string) => api<ITOTW>(`/totw/${encodeURIComponent(week)}`),
        getSchedule: () => api<{ cron: string; timezone: string; nextDate: string | null }>("/totw/schedule"),
        getAppearances: () => api<IMemberTotwAppearances[]>("/totw/appearances"),
    },

    averages: {
        getAll: () => api<IAverageStats[]>("/playeraverages"),
        getByPosition: (position: string) => api<IAverageStats>(`/playeraverages/${position}`),
    },

    /** Lo poco de admin que queda en la web (el panel está en accounts) */
    admin: {
        /** Partido nulo a mano (true/false) o vuelta al automático (null). Las stats las recalcula el worker
         *  al recibir el aviso (`queued`); `unavailable` = RabbitMQ no respondió y no se han recalculado */
        setMatchVoided: (matchId: number, voided: boolean | null) =>
            api<{ match: IMatch; recalculation: "queued" | "unavailable" }>(`/admin/matches/${matchId}/voided`, { method: "PUT", body: { voided }, credentials: true }),
    },
}

// ---- Respuestas del auth service (rutas propias, fuera de Better Auth) ----

/** Resultado de `GET /api/twitch/sync` */

interface AuthListResponse<T> {
    status: string
    data: T
}

/** Rutas propias del auth service (fuera de Better Auth) */
export const authApi = {
    publicUsers: (ids: string[]) =>
        ids.length === 0
            ? Promise.resolve([] as IPublicUser[])
            : request<AuthListResponse<IPublicUser[]>>(AUTH_URL, `/api/public/users?ids=${ids.map(encodeURIComponent).join(",")}`).then((r) => r.data),
}
