import type { MatchResult } from "@trueno-proclub-services/shared"
import type ClubMatchEntity from "../model/match/ClubMatchEntity"
import type MatchPlayerEntity from "../model/match/MatchPlayerEntity"

/**
 * Lo que se cuenta de un partido mirando el historial del club: momentos (rachas, récords e hitos
 * de jugadores), cara a cara con ese rival, anterior / siguiente, forma de un jugador y reparto del
 * trabajo del equipo. Sin Vue ni DOM (test/matchInsights.test.ts).
 *
 * Solo cuentan los partidos que cuentan para stats (no nulos) y, de un jugador, los que jugó
 * (`played`). El historial que llega puede venir en cualquier orden.
 */

type Match = Pick<ClubMatchEntity, "matchId" | "timestamp" | "result" | "ourClub" | "opponentClub" | "counts">

const byDate = <T extends { timestamp: number; matchId: number }>(a: T, b: T) => a.timestamp - b.timestamp || a.matchId - b.matchId

/** Partidos que cuentan, del más antiguo al más reciente */
const counted = (matches: Match[]) => matches.filter((m) => m.counts).sort(byDate)

const goalsFor = (m: Match) => m.ourClub.matchStats.goals
const goalsAgainst = (m: Match) => m.opponentClub.matchStats.goals

// ── Anterior / siguiente ──

/** Partido anterior y siguiente (por fecha; también los nulos, que se pueden ver) */
export function neighbours<T extends { matchId: number; timestamp: number }>(matches: T[], matchId: number): { prev: T | null; next: T | null } {
    const sorted = [...matches].sort(byDate)
    const i = sorted.findIndex((m) => m.matchId === matchId)
    if (i < 0) return { prev: null, next: null }
    return { prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null }
}

// ── Momentos: rachas, récords e hitos ──

export type MomentTone = "good" | "bad" | "neutral"
export interface Moment {
    /** para la clave y el icono */
    kind: "streak" | "unbeaten" | "record" | "cleanSheet" | "milestone"
    text: string
    tone: MomentTone
    /** jugador al que se refiere (hitos) */
    playerId?: string
}

const RESULT_WORD: Record<MatchResult, string> = { win: "victoria", tie: "empate", loose: "derrota" }
const ordinal = (n: number) => `${n}.ª`

/** Rachas y récords del equipo hasta este partido (incluido) */
export function teamMoments(matches: Match[], matchId: number): Moment[] {
    const list = counted(matches)
    const i = list.findIndex((m) => m.matchId === matchId)
    if (i < 0) return []
    const match = list[i]
    const before = list.slice(0, i)
    const out: Moment[] = []

    // Racha del mismo resultado
    let streak = 1
    for (let k = i - 1; k >= 0 && list[k].result === match.result; k--) streak++
    if (streak >= 2) {
        const text = match.result === "tie" ? `${streak}.º empate seguido` : `${ordinal(streak)} ${RESULT_WORD[match.result]} seguida`
        out.push({ kind: "streak", text, tone: match.result === "win" ? "good" : match.result === "loose" ? "bad" : "neutral" })
    }

    // Sin perder (solo si no es ya una racha de victorias igual de larga)
    if (match.result !== "loose") {
        let unbeaten = 0
        for (let k = i; k >= 0 && list[k].result !== "loose"; k--) unbeaten++
        if (unbeaten >= 3 && !(match.result === "win" && unbeaten === streak)) out.push({ kind: "unbeaten", text: `${unbeaten} partidos sin perder`, tone: "good" })
    } else {
        // Fin de una racha sin perder
        let unbeaten = 0
        for (let k = i - 1; k >= 0 && list[k].result !== "loose"; k--) unbeaten++
        if (unbeaten >= 3) out.push({ kind: "unbeaten", text: `Se acaba una racha de ${unbeaten} sin perder`, tone: "bad" })
    }

    // Récords (solo con algo de historial detrás, para que el primer partido no sea "récord" de todo)
    if (before.length >= 5) {
        const margin = goalsFor(match) - goalsAgainst(match)
        const bestMargin = Math.max(...before.map((m) => goalsFor(m) - goalsAgainst(m)))
        const worstMargin = Math.min(...before.map((m) => goalsFor(m) - goalsAgainst(m)))
        const mostGoals = Math.max(...before.map(goalsFor))
        if (margin > 0 && margin > bestMargin) out.push({ kind: "record", text: "Mayor goleada de la historia del club", tone: "good" })
        else if (goalsFor(match) > mostGoals) out.push({ kind: "record", text: `Récord de goles en un partido (${goalsFor(match)})`, tone: "good" })
        if (margin < 0 && margin < worstMargin) out.push({ kind: "record", text: "Peor derrota de la historia del club", tone: "bad" })
    }

    // Portería a cero (y cuánto hacía)
    if (goalsAgainst(match) === 0) {
        let since = 0
        for (let k = i - 1; k >= 0 && goalsAgainst(list[k]) > 0; k--) since++
        out.push({ kind: "cleanSheet", text: since >= 5 ? `Portería a cero, la primera en ${since + 1} partidos` : "Portería a cero", tone: "good" })
    }
    return out
}

const MATCH_MILESTONES = [10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500]
const GOAL_MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300]
const crossed = (before: number, now: number, marks: number[]) => marks.filter((m) => before < m && now >= m).pop()

/** Hitos de nuestros jugadores en este partido: debut, partido N, primer gol, gol N, hat-trick, primer MVP… */
export function playerMoments(matches: Match[], matchId: number): Moment[] {
    const list = counted(matches)
    const i = list.findIndex((m) => m.matchId === matchId)
    if (i < 0) return []
    const match = list[i]
    const out: Moment[] = []
    for (const p of match.ourClub.players) {
        if (!p.played) continue
        let games = 0, goals = 0, assists = 0, mvps = 0
        for (const m of list.slice(0, i)) {
            const q = m.ourClub.players.find((x) => x.playerId === p.playerId)
            if (!q?.played) continue
            games++; goals += q.goals; assists += q.assists; mvps += q.manOfTheMatch ? 1 : 0
        }
        const name = p.playerName
        const base = { kind: "milestone" as const, tone: "good" as const, playerId: p.playerId }
        if (games === 0) out.push({ ...base, text: `Debut de ${name} con el club` })
        const gameMark = crossed(games, games + 1, MATCH_MILESTONES)
        if (gameMark) out.push({ ...base, text: `Partido ${gameMark} de ${name}` })
        if (p.goals >= 4) out.push({ ...base, text: `Póker de ${name}` })
        else if (p.goals === 3) out.push({ ...base, text: `Hat-trick de ${name}` })
        if (goals === 0 && p.goals > 0 && games > 0) out.push({ ...base, text: `Primer gol de ${name} con el club` })
        const goalMark = crossed(goals, goals + p.goals, GOAL_MILESTONES)
        if (goalMark) out.push({ ...base, text: `Gol ${goalMark} de ${name}` })
        if (assists === 0 && p.assists > 0 && games > 0) out.push({ ...base, text: `Primera asistencia de ${name}` })
        if (mvps === 0 && p.manOfTheMatch && games > 0) out.push({ ...base, text: `Primer MVP de ${name}` })
    }
    return out
}

// ── Cara a cara con el rival ──

export interface HeadToHead {
    played: number
    wins: number
    ties: number
    losses: number
    goalsFor: number
    goalsAgainst: number
    /** el anterior a este contra el mismo rival */
    previous: Match | null
    /** nuestra mayor victoria contra él */
    biggestWin: Match | null
}

/** Balance contra el rival de este partido (todos los partidos que cuentan, este incluido) */
export function headToHead(matches: Match[], match: Match): HeadToHead {
    const rivalId = match.opponentClub.id
    const list = counted(matches).filter((m) => m.opponentClub.id === rivalId)
    const i = list.findIndex((m) => m.matchId === match.matchId)
    const previous = (i >= 0 ? list[i - 1] : list.filter((m) => m.timestamp < match.timestamp).pop()) ?? null
    let biggestWin: Match | null = null
    for (const m of list) {
        const d = goalsFor(m) - goalsAgainst(m)
        if (d > 0 && (!biggestWin || d > goalsFor(biggestWin) - goalsAgainst(biggestWin))) biggestWin = m
    }
    return {
        played: list.length,
        wins: list.filter((m) => m.result === "win").length,
        ties: list.filter((m) => m.result === "tie").length,
        losses: list.filter((m) => m.result === "loose").length,
        goalsFor: list.reduce((s, m) => s + goalsFor(m), 0),
        goalsAgainst: list.reduce((s, m) => s + goalsAgainst(m), 0),
        previous,
        biggestWin,
    }
}

// ── Forma y medias de un jugador ──

export interface PlayerForm {
    /** sus últimos partidos (hasta este incluido), del más antiguo al más reciente */
    last: { matchId: number; rating: number; current: boolean }[]
    /** media de nota y por partido en todos sus partidos que cuentan */
    games: number
    ratingAve: number
    perMatch: { goals: number; assists: number; shots: number; passesMade: number; passSuccessRate: number; tacklesMade: number; tackleSuccessRate: number; saves: number }
}

export function playerForm(matches: Match[], matchId: number, playerId: string, size = 5): PlayerForm {
    const list = counted(matches)
    const rows = list
        .map((m) => ({ m, p: m.ourClub.players.find((x) => x.playerId === playerId) }))
        .filter((r): r is { m: Match; p: MatchPlayerEntity } => !!r.p?.played)
    const upTo = rows.findIndex((r) => r.m.matchId === matchId)
    const window = (upTo >= 0 ? rows.slice(0, upTo + 1) : rows).slice(-size)
    const n = rows.length
    const sum = (f: (p: MatchPlayerEntity) => number) => rows.reduce((s, r) => s + f(r.p), 0)
    const rate = (ok: number, tot: number) => (tot ? (ok / tot) * 100 : 0)
    return {
        last: window.map((r) => ({ matchId: r.m.matchId, rating: r.p.rating, current: r.m.matchId === matchId })),
        games: n,
        ratingAve: n ? sum((p) => p.rating) / n : 0,
        perMatch: {
            goals: n ? sum((p) => p.goals) / n : 0,
            assists: n ? sum((p) => p.assists) / n : 0,
            shots: n ? sum((p) => p.shots) / n : 0,
            passesMade: n ? sum((p) => p.passesMade) / n : 0,
            passSuccessRate: rate(sum((p) => p.passesSuccess), sum((p) => p.passesMade)),
            tacklesMade: n ? sum((p) => p.tacklesMade) / n : 0,
            tackleSuccessRate: rate(sum((p) => p.tacklesSuccess), sum((p) => p.tacklesMade)),
            saves: n ? sum((p) => p.saves) / n : 0,
        },
    }
}

// ── Quién llevó el peso ──

export type ShareMetric = "goals" | "shots" | "passesMade" | "tacklesMade"
export interface ShareRow { playerId: string; playerName: string; value: number; share: number }

/** Reparto de una stat entre los jugadores (de más a menos; los que se quedan en 0, fuera) */
export function shareOf(players: MatchPlayerEntity[], metric: ShareMetric): { total: number; rows: ShareRow[] } {
    const total = players.reduce((s, p) => s + (p[metric] ?? 0), 0)
    const rows = players
        .filter((p) => (p[metric] ?? 0) > 0)
        .map((p) => ({ playerId: p.playerId, playerName: p.playerName, value: p[metric], share: total ? p[metric] / total : 0 }))
        .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName))
    return { total, rows }
}
