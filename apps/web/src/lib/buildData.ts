import type { IClub, IClubMember, IMatch, IMatchClub, IPlayerStats, ITOTW } from "@trueno-proclub-services/shared"
import { CLUB } from "@/config/club"

/**
 * Datos de la api leídos al compilar, solo para el HTML estático (en el frontmatter de las páginas).
 *
 * Las partes con datos se pintan en el navegador (client:only), así que el HTML llegaba casi vacío
 * a los buscadores que no ejecutan JS. Con esto, cada una lleva al lado un resumen con los datos
 * reales del momento del build dentro de <noscript>: solo lo ve quien no ejecuta JS (esos
 * buscadores); con JS el navegador no lo pinta y la web se ve exactamente igual que siempre.
 *
 * Si la api no responde, todo devuelve null y la página sale como antes (sin respaldo): el build
 * nunca falla por esto.
 */

/** La api del club con dominio: en el build no hay "/api" relativo al que llamar */
const BUILD_API = (() => {
    const url = CLUB.apiUrl
    if (/^https?:\/\//.test(url)) return url
    return `${CLUB.siteUrl || CLUB.webUrl}${url}`
})()

const cache = new Map<string, Promise<unknown>>()

/** GET a la api ({ status, response }) con tiempo máximo; null si falla. Una vez por build y ruta */
function get<T>(path: string): Promise<T | null> {
    if (!cache.has(path)) {
        cache.set(path, (async () => {
            try {
                const res = await fetch(`${BUILD_API}${path}`, { signal: AbortSignal.timeout(10_000) })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const body = await res.json()
                return (body?.response ?? null) as T | null
            } catch (e) {
                console.warn(`[buildData] ${BUILD_API}${path}: ${e instanceof Error ? e.message : e}`)
                return null
            }
        })())
    }
    return cache.get(path) as Promise<T | null>
}

export const buildClub = () => get<IClub>("/club")

/** Los últimos `limit` partidos, del más nuevo al más viejo */
export const buildLatestMatches = (limit: number) => get<IMatch[]>(`/matches/ordered?limit=${limit}`)

export const buildLatestTotw = () => get<ITOTW>("/totw/latest")

export interface RosterEntry {
    playerId: string
    name: string
    /** la posición en la que más ha jugado (clave en inglés: forward, goalkeeper…) */
    position: string | null
    gamesPlayed: number
    overall?: number
}

/** La plantilla: cada jugador con su posición principal, de más a menos partidos */
export async function buildRoster(): Promise<RosterEntry[] | null> {
    const [members, stats] = await Promise.all([
        get<IClubMember[]>("/members"),
        get<{ official: IPlayerStats[]; friendly: IPlayerStats[] }>("/members/stats"),
    ])
    if (!members?.length) return null

    // Partidos por jugador y posición (oficiales + amistosos)
    const games = new Map<string, Map<string, number>>()
    for (const s of [...(stats?.official ?? []), ...(stats?.friendly ?? [])]) {
        const byPos = games.get(s.playerId) ?? new Map<string, number>()
        byPos.set(s.position, (byPos.get(s.position) ?? 0) + (s.gamesPlayed ?? 0))
        games.set(s.playerId, byPos)
    }

    return members
        .map((m) => {
            const byPos = [...(games.get(m.playerId) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1])
            return {
                playerId: m.playerId,
                name: m.playerName,
                position: byPos[0]?.[0] ?? null,
                gamesPlayed: byPos.reduce((sum, [, n]) => sum + n, 0),
                overall: m.proOverall,
            }
        })
        .filter((p) => p.gamesPlayed > 0)
        .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
}

/** Nuestro club y el rival en un partido (igual que ClubMatchEntity.ourClub / opponentClub) */
export function matchSides(m: IMatch): { ours: IMatchClub; rival: IMatchClub } {
    return m.localTeam ? { ours: m.localClub, rival: m.awayClub } : { ours: m.awayClub, rival: m.localClub }
}

const RESULT_LABEL: Record<string, string> = { win: "Victoria", tie: "Empate", loose: "Derrota" }
export const resultLabel = (result: string) => RESULT_LABEL[result] ?? result

/** "12 nov 2026" */
export const formatDay = (seconds: number) =>
    new Date(seconds * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" })
