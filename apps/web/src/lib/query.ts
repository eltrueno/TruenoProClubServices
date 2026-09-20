/**
 * Lectura de query string en cliente. La web es 100% estática (GitHub Pages),
 * así que las páginas "dinámicas" (jugador, partido, semana...) reciben sus
 * parámetros por `?id=…` y los componentes los leen aquí. En build (SSR de
 * las islas client:load) no hay `window` y devuelve el valor por defecto.
 */
export function getQueryParam(name: string, fallback = ""): string {
    if (typeof window === "undefined") return fallback
    return new URLSearchParams(window.location.search).get(name) ?? fallback
}

export function hasQueryParam(name: string): boolean {
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).has(name)
}

/** Actualiza la URL sin recargar (para filtros / pestañas) */
export function setQueryParams(params: Record<string, string | null | undefined>, replace = true) {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(params)) {
        if (v === null || v === undefined || v === "") url.searchParams.delete(k)
        else url.searchParams.set(k, v)
    }
    const next = url.pathname + (url.search ? url.search : "") + url.hash
    if (replace) window.history.replaceState(window.history.state, "", next)
    else window.history.pushState(window.history.state, "", next)
}

/** Rutas de la web: un único sitio donde construir enlaces a entidades */
export const routes = {
    player: (playerId: string, tab?: string) => `/jugador?id=${encodeURIComponent(playerId)}${tab ? `&tab=${tab}` : ""}`,
    match: (matchId: number | string, playerId?: string) => `/partido?id=${matchId}${playerId ? `&player=${encodeURIComponent(playerId)}` : ""}`,
    squad: (playerId?: string) => (playerId ? `/plantilla?id=${encodeURIComponent(playerId)}` : "/plantilla"),
    totw: (week?: string, type?: string) => {
        const q = new URLSearchParams()
        if (week) q.set("semana", week)
        if (type) q.set("tipo", type)
        const s = q.toString()
        return `/totw${s ? `?${s}` : ""}`
    },
}
