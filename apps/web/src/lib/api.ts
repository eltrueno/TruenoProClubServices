import type {
    ApiResponse, IAchievementDefinition, IAverageStats, IClub, IClubMember, IClubMemberAdminPatch, ILinkRequest,
    IMatch, IPlayerProfile, IPlayerStats, IPublicUser, ITOTW, IMemberTotwAppearances
} from "@trueno-proclub-services/shared"

export const API_URL = import.meta.env.PUBLIC_API_URL ?? "https://api.casemurocity.org"
export const AUTH_URL = import.meta.env.PUBLIC_AUTH_URL ?? "https://auth.casemurocity.org"

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
    method?: "GET" | "POST" | "PATCH" | "DELETE"
    body?: TBody
    /** Envía la cookie de sesión (.casemurocity.org). Solo para rutas protegidas. */
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
        // api: { status: { code, message } } · auth: { status: "error", message }
        const code = typeof body?.status?.message === "string" ? body.status.message
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
        /** Jugador vinculado a la cuenta con sesión (null si no hay) */
        getMine: () => api<IClubMember | null>("/members/me", { credentials: true }),
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
        getDefinitions: () => api<IAchievementDefinition[]>("/achievements"),
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

    admin: {
        patchMember: (playerId: string, patch: IClubMemberAdminPatch) =>
            api<IClubMember>(`/admin/members/${encodeURIComponent(playerId)}`, { method: "PATCH", body: patch, credentials: true }),
        /** Sube la foto ya recortada (PNG 400x450 en data URL) a R2 y la asigna al jugador */
        uploadMemberImage: (playerId: string, imageDataUrl: string) =>
            api<IClubMember>(`/admin/members/${encodeURIComponent(playerId)}/image`, { method: "POST", body: { image: imageDataUrl }, credentials: true }),
        /** Descarga una imagen remota vía api (POST a propósito: exige preflight) para pintarla en canvas sin CORS */
        fetchImageViaProxy: async (url: string): Promise<Blob> => {
            const res = await fetch(`${API_URL}/admin/image-proxy`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                const code = body?.status?.message || `HTTP_${res.status}`
                throw new ApiError(code, code, res.status)
            }
            return res.blob()
        },
        linkRequests: () => api<ILinkRequest[]>("/admin/link-requests", { credentials: true }),
        approveLinkRequest: (id: string) =>
            api<{ request: ILinkRequest; member: IClubMember }>(`/admin/link-requests/${encodeURIComponent(id)}/approve`, { method: "POST", credentials: true }),
        rejectLinkRequest: (id: string) =>
            api<ILinkRequest>(`/admin/link-requests/${encodeURIComponent(id)}/reject`, { method: "POST", credentials: true }),
    },
}

/** Rutas propias del auth service (fuera de Better Auth) */
export const authApi = {
    publicUsers: (ids: string[]) =>
        ids.length === 0
            ? Promise.resolve([] as IPublicUser[])
            : request<{ status: string; data: IPublicUser[] }>(AUTH_URL, `/api/public/users?ids=${ids.map(encodeURIComponent).join(",")}`).then((r) => r.data),
    twitchSync: () => request<any>(AUTH_URL, "/api/twitch/sync", { credentials: true }),
    admin: {
        users: (q?: string) =>
            request<{ status: string; data: Array<IPublicUser & { role: string; twitchId: string | null; discordId: string | null }> }>(
                AUTH_URL, `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { credentials: true }
            ).then((r) => r.data),
    },
}
