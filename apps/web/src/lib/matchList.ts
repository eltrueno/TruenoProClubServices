import type { MatchResult, MatchType } from "@trueno-proclub-services/shared"
import type ClubMatchEntity from "../model/match/ClubMatchEntity"

/**
 * Página de partidos (/partidos): filtros, resumen de lo filtrado y agrupado por mes. Sin Vue ni DOM
 * (test/matchList.test.ts).
 */

type Match = Pick<ClubMatchEntity, "matchId" | "matchType" | "timestamp" | "result" | "ourClub" | "opponentClub" | "counts">

export interface MatchFilters {
    /** texto: nombre del rival o id del partido */
    query: string
    types: MatchType[]
    /** jugadores que tienen que estar todos en el partido */
    players: string[]
    /** dd/mm/aaaa, vacío = sin límite */
    from: string
    to: string
    /** mínimo de jugadores nuestros en el partido */
    minPlayers: number
}

/** dd/mm/aaaa → fecha (al principio del día, o al final con `end`) */
export function parseDay(value: string, end = false): Date | null {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
    if (!m) return null
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    if (end) d.setHours(23, 59, 59, 999)
    return d
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function filterMatches<T extends Match>(list: T[], f: MatchFilters): T[] {
    const q = norm(f.query.trim())
    const from = f.from ? parseDay(f.from) : null
    const to = f.to ? parseDay(f.to, true) : null
    return list
        .filter((m) => {
            if (q && !norm(m.opponentClub.name).includes(q) && !String(m.matchId).includes(q)) return false
            if (!f.types.includes(m.matchType)) return false
            if (m.ourClub.players.length < f.minPlayers) return false
            if (f.players.length) {
                // Que salgan en el partido (en los nulos nadie "juega" a efectos de stats, pero estuvieron)
                const played = new Set(m.ourClub.players.map((p) => p.playerId))
                if (!f.players.every((id) => played.has(id))) return false
            }
            const when = m.timestamp * 1000
            if (from && when < from.getTime()) return false
            if (to && when > to.getTime()) return false
            return true
        })
        .sort((a, b) => b.timestamp - a.timestamp || b.matchId - a.matchId)
}

export interface Record3 { games: number; wins: number; ties: number; losses: number; goalsFor: number; goalsAgainst: number }

/** Balance de una lista (los nulos no cuentan, como en el resto de la web) */
export function recordOf(list: Match[]): Record3 {
    const r: Record3 = { games: 0, wins: 0, ties: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    for (const m of list) {
        if (!m.counts) continue
        r.games++
        if (m.result === "win") r.wins++
        else if (m.result === "loose") r.losses++
        else r.ties++
        r.goalsFor += m.ourClub.matchStats.goals
        r.goalsAgainst += m.opponentClub.matchStats.goals
    }
    return r
}

/** Racha con la que acaba la lista (la más reciente primero): "4 victorias", "2 derrotas"… */
export function currentStreak(list: Match[]): { result: MatchResult; count: number } | null {
    const counted = list.filter((m) => m.counts)
    if (!counted.length) return null
    const result = counted[0].result
    let count = 0
    for (const m of counted) {
        if (m.result !== result) break
        count++
    }
    return { result, count }
}

export interface MonthGroup<T> { key: string; label: string; record: Record3; items: T[] }

const MONTH = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" })

/**
 * Agrupa por mes, en el orden de la lista. `all` da el balance de cada mes con todos los partidos
 * filtrados (no solo los de la página), para que la cabecera no cambie al pasar de página.
 */
export function groupByMonth<T extends Match>(page: T[], all: T[] = page): MonthGroup<T>[] {
    const keyOf = (m: Match) => {
        const d = new Date(m.timestamp * 1000)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    }
    const allByKey = new Map<string, T[]>()
    for (const m of all) {
        const k = keyOf(m)
        const l = allByKey.get(k)
        if (l) l.push(m)
        else allByKey.set(k, [m])
    }
    const out: MonthGroup<T>[] = []
    for (const m of page) {
        const k = keyOf(m)
        let g = out[out.length - 1]
        if (!g || g.key !== k) {
            const label = MONTH.format(new Date(m.timestamp * 1000))
            g = { key: k, label: label.charAt(0).toUpperCase() + label.slice(1), record: recordOf(allByKey.get(k) ?? []), items: [] }
            out.push(g)
        }
        g.items.push(m)
    }
    return out
}
