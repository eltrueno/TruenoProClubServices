import type { IClubMember, PlayerPosition } from "@trueno-proclub-services/shared"
import PlayerStatsEntity from "../model/PlayerStatsEntity"
import type { MatchScope } from "./matchScope"

/**
 * La plantilla: cada jugador con sus stats agregadas (en el ámbito elegido: oficiales, amistosos
 * o todos), sus posiciones de más a menos jugada, y cómo filtrarla y ordenarla.
 * Sin Vue ni DOM, para poder probarlo (test/squad.test.ts).
 */

/** Partidos para contar como "habitual"; los demás van plegados en "Han pasado por el club" */
export const REGULAR_MIN_GAMES = 10

export interface SquadPlayer {
    member: IClubMember
    stats: PlayerStatsEntity
    /** de más a menos partidos en el ámbito elegido */
    positions: PlayerPosition[]
}

export type SquadSortKey = "partidos" | "goles" | "asistencias" | "ga" | "valoracion" | "victorias" | "mvp" | "porterias" | "rojas"

export interface SquadSort {
    key: SquadSortKey
    /** en el desplegable */
    label: string
    /** debajo del número grande de la carta */
    unit: string
    value: (s: PlayerStatsEntity) => number
    decimals?: number
    suffix?: string
}

export const SQUAD_SORTS: SquadSort[] = [
    { key: "partidos", label: "Partidos", unit: "partidos", value: (s) => s.gamesPlayed },
    { key: "goles", label: "Goles", unit: "goles", value: (s) => s.goals },
    { key: "asistencias", label: "Asistencias", unit: "asistencias", value: (s) => s.assists },
    { key: "ga", label: "Goles + asistencias", unit: "G+A", value: (s) => s.goalsPlusAssists },
    { key: "valoracion", label: "Valoración", unit: "valoración", value: (s) => s.ratingAve, decimals: 1 },
    { key: "victorias", label: "% de victorias", unit: "victorias", value: (s) => s.winRate, suffix: "%" },
    { key: "mvp", label: "MVP", unit: "MVP", value: (s) => s.manOfTheMatch },
    { key: "porterias", label: "Porterías a cero", unit: "a cero", value: (s) => s.cleanSheets },
    { key: "rojas", label: "Tarjetas rojas", unit: "rojas", value: (s) => s.redCards },
]
export const DEFAULT_SORT: SquadSortKey = "partidos"
export const sortByKey = (key: string | null | undefined) => SQUAD_SORTS.find((s) => s.key === key) ?? SQUAD_SORTS[0]

/** El valor de una stat listo para enseñar ("7,4", "70%") */
export function formatStat(sort: Pick<SquadSort, "decimals" | "suffix">, value: number): string {
    const n = sort.decimals ? value.toLocaleString("es-ES", { minimumFractionDigits: sort.decimals, maximumFractionDigits: sort.decimals }) : String(Math.round(value))
    return `${n}${sort.suffix ?? ""}`
}

/** Une miembros y stats (un doc por jugador y posición) en el ámbito elegido. Solo quien ha jugado */
export function buildSquad(members: IClubMember[], stats: { official: PlayerStatsEntity[]; friendly: PlayerStatsEntity[] }, scope: MatchScope): SquadPlayer[] {
    const docs = scope === "official" ? stats.official : scope === "friendly" ? stats.friendly : [...stats.official, ...stats.friendly]
    const byPlayer = new Map<string, PlayerStatsEntity[]>()
    for (const d of docs) {
        if (!d.playerId) continue
        const list = byPlayer.get(d.playerId) ?? []
        list.push(d)
        byPlayer.set(d.playerId, list)
    }
    const squad: SquadPlayer[] = []
    for (const member of members) {
        const list = byPlayer.get(member.playerId)
        if (!list?.length) continue
        const aggregated = PlayerStatsEntity.aggregate(list)
        if (!aggregated.gamesPlayed) continue
        const games = new Map<string, number>()
        for (const d of list) games.set(d.position, (games.get(d.position) ?? 0) + d.gamesPlayed)
        const positions = [...games.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p as PlayerPosition)
        squad.push({ member, stats: aggregated, positions })
    }
    return squad
}

/** Sin tildes ni mayúsculas, para buscar */
const normalize = (text: string | undefined | null) => (text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

export interface SquadFilter {
    search: string
    /** posición en la que ha jugado (principal o no); null = todas */
    position: PlayerPosition | null
}

export function filterSquad(squad: SquadPlayer[], { search, position }: SquadFilter): SquadPlayer[] {
    const q = normalize(search.trim())
    return squad.filter((p) =>
        (!position || p.positions.includes(position)) &&
        (!q || normalize(p.member.playerName).includes(q) || normalize(p.member.proName).includes(q) ||
            (p.member.nameHistory ?? []).some((n) => normalize(n).includes(q))))
}

/** Ordena por una stat; a igualdad, más partidos primero y después por nombre (orden estable) */
export function sortSquad(squad: SquadPlayer[], key: SquadSortKey, direction: "asc" | "desc"): SquadPlayer[] {
    const sort = sortByKey(key)
    const factor = direction === "asc" ? 1 : -1
    const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true })
    return [...squad].sort((a, b) =>
        factor * (sort.value(a.stats) - sort.value(b.stats)) ||
        b.stats.gamesPlayed - a.stats.gamesPlayed ||
        collator.compare(a.member.playerName, b.member.playerName))
}

export const isRegular = (p: SquadPlayer) => p.stats.gamesPlayed >= REGULAR_MIN_GAMES
