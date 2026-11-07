/**
 * A dónde volver después de iniciar sesión (`/login?redirect=…`).
 *
 * Solo se aceptan rutas de esta misma web y webs de la comunidad (casemuro.stream y
 * sus subdominios, por https). Cualquier otra cosa se ignora: si no, el enlace de
 * login serviría para mandar a alguien a una web de fuera con apariencia de venir
 * de aquí (open redirect). En local también se admite localhost.
 */
const COMMUNITY_DOMAIN = "casemuro.stream"

export function isAllowedRedirect(raw: string | null | undefined, here: string = typeof window !== "undefined" ? window.location.origin : ""): boolean {
    if (!raw) return false
    // Rutas propias: "/algo", pero no "//otra-web.com" (eso es una URL absoluta sin esquema)
    if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return true
    let url: URL
    try {
        url = new URL(raw)
    } catch {
        return false
    }
    if (here && url.origin === here) return true
    const host = url.hostname.toLowerCase()
    const isLocal = (h: string) => h === "localhost" || h === "127.0.0.1"
    // localhost solo vale cuando accounts también corre en local (desarrollo)
    if (isLocal(host)) {
        const hereHost = here ? new URL(here).hostname.toLowerCase() : ""
        return isLocal(hereHost) && (url.protocol === "http:" || url.protocol === "https:")
    }
    if (url.protocol !== "https:") return false
    return host === COMMUNITY_DOMAIN || host.endsWith(`.${COMMUNITY_DOMAIN}`)
}

/** La URL de vuelta si es válida; si no, la página de la cuenta */
export function safeRedirect(raw: string | null | undefined, fallback = "/"): string {
    return isAllowedRedirect(raw) ? (raw as string) : fallback
}

/** "city.casemuro.stream" para enseñar a dónde se vuelve (null si es una ruta de aquí) */
export function redirectHost(raw: string | null | undefined): string | null {
    if (!raw || raw.startsWith("/")) return null
    try {
        return new URL(raw).host
    } catch {
        return null
    }
}

export function readQuery(name: string): string | null {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get(name)
}
