/**
 * Configuración de accounts: dónde está el auth y qué clubes hay.
 * La cuenta y el jugador son de la persona, no del club (una cuenta = un EA ID),
 * así que aquí se ven todos los clubes juntos.
 */
const stripSlash = (url: string) => url.replace(/\/+$/, "")

export const SITE_URL = stripSlash(import.meta.env.PUBLIC_SITE_URL || "https://accounts.casemuro.stream")
export const AUTH_URL = stripSlash(import.meta.env.PUBLIC_AUTH_URL || "https://auth.casemuro.stream")

export interface ClubLink {
    id: "city" | "united"
    name: string
    /** web pública del club (fichas de jugador: `${webUrl}/jugador?id=…`) */
    webUrl: string
    /** api del club: por defecto `${webUrl}/api` (Cloudflare lo enruta a su instancia) */
    apiUrl: string
    logo: string
}

const env = import.meta.env
const cityWeb = stripSlash(env.PUBLIC_WEB_URL_CITY || "https://city.casemuro.stream")
const unitedWeb = stripSlash(env.PUBLIC_WEB_URL_UNITED || "https://united.casemuro.stream")

// Mismo orden que el selector de clubes de las webs
const ALL_CLUBS: ClubLink[] = [
    {
        id: "city",
        name: "Casemuro City",
        webUrl: cityWeb,
        apiUrl: stripSlash(env.PUBLIC_API_URL_CITY || `${cityWeb}/api`),
        logo: "/clubs/city.webp",
    },
    {
        id: "united",
        name: "Casemuro United",
        webUrl: unitedWeb,
        apiUrl: stripSlash(env.PUBLIC_API_URL_UNITED || `${unitedWeb}/api`),
        logo: "/clubs/united.webp",
    },
]

// PUBLIC_CLUBS=city deja solo esos (en local, cuando solo se arranca el api de uno)
const only = (env.PUBLIC_CLUBS || "").split(",").map((s) => s.trim()).filter(Boolean)
/** Clubes con los que se habla (sus api): en local puede ser solo uno */
export const CLUBS: ClubLink[] = only.length ? ALL_CLUBS.filter((c) => only.includes(c.id)) : ALL_CLUBS
/** Todos los clubes de la comunidad, para la marca (escudos de la cabecera, pie) */
export const BRAND_CLUBS: ClubLink[] = ALL_CLUBS

/** Colores de marca: el rojo de cada club, de izquierda a derecha */
export const BRAND = { from: "#c80d0d", to: "#b90a34" } as const

/** Redes de Mr Casemuro (las mismas que en el pie de las webs de los clubes) */
export const CASEMURO_SOCIALS = [
    { id: "twitch", label: "Twitch", href: "https://www.twitch.tv/mr_casemuro" },
    { id: "youtube", label: "YouTube", href: "https://www.youtube.com/channel/UC33K1p2-9FwNclOSbQHFSpA/featured" },
    { id: "x", label: "X / Twitter", href: "https://twitter.com/Mr_Casemuro" },
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/mr.casemuro" },
    { id: "tiktok", label: "TikTok", href: "https://www.tiktok.com/@mr.casemuro" },
] as const

/** Redes del desarrollador (el_trueno) */
export const DEV_SOCIALS = [
    { id: "github", label: "GitHub", href: "https://github.com/eltrueno" },
    { id: "x", label: "X / Twitter", href: "https://x.com/elh_trueno" },
    { id: "instagram", label: "Instagram", href: "https://www.instagram.com/rauljimenezgal/" },
] as const
