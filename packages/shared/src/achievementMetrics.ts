import type { AchievementMetric } from "./constants.js"
import type { IAchievementDefinition, IAchievementProgress, IPlayerClubTotals } from "./types/achievement.js"

/**
 * Métricas de los logros que se calculan igual en el worker (para desbloquearlos) y en el api
 * (para enseñar cuánto le falta a cada uno). Funciones puras, sin base de datos.
 */
export type Metrics = Partial<Record<AchievementMetric, number>>

// ---------------------------------------------------------------------------------------
// Calendario (en la hora local del club: un partido a las 00:30 es del día siguiente)
// ---------------------------------------------------------------------------------------

// En el navegador no hay `process` (este paquete también lo usa la web)
const TIME_ZONE = (typeof process !== "undefined" ? process.env?.TZ : undefined) || "Europe/Madrid"
const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

export interface LocalDay {
    /** YYYY-MM-DD */
    key: string
    month: number
    day: number
    /** días desde 1970-01-01, para restar fechas */
    index: number
    /** semanas (de lunes a domingo) desde 1970, para saber si dos semanas son seguidas */
    week: number
    /** 1 = lunes … 7 = domingo */
    weekday: number
}

export function localDay(timestampSeconds: number): LocalDay {
    const key = dateFormat.format(new Date(timestampSeconds * 1000))
    const [y, m, d] = key.split("-").map(Number)
    const index = Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
    // 1970-01-01 fue jueves: el lunes de esa semana es el día -3
    return { key, month: m, day: d, index, week: Math.floor((index + 3) / 7), weekday: ((index + 3) % 7 + 7) % 7 + 1 }
}

/** Lo que miran los logros a partir del estado */
export function progressMetrics(p: IAchievementProgress): Metrics {
    return {
        winStreak: p.winStreak,
        unbeatenStreak: p.unbeatenStreak,
        lossStreak: p.lossStreak,
        scoringStreak: p.scoringStreak,
        assistStreak: p.assistStreak,
        forwardDrought: p.forwardDrought,
        sameScoreStreak: p.sameScoreStreak,
        positionsPlayed: p.positionsPlayed.length,
        positionsScored: p.positionsScored.length,
        dayMatches: p.dayMatches,
        dayPerfectWins: p.dayWins === p.dayMatches ? p.dayWins : 0,
        dayAllLosses: p.dayLosses === p.dayMatches ? p.dayLosses : 0,
        dayGoals: p.dayGoals,
        daysPlayed: p.daysPlayed,
        weekStreak: p.weekStreak,
        weekDaysPlayed: p.weekDays.length,
        weekendPlayed: p.weekDays.includes(6) && p.weekDays.includes(7) ? 1 : 0,
        daysSinceLastMatch: p.daysSinceLastMatch,
        daysSinceFirstMatch: p.firstMatchAt && p.lastMatchAt ? localDay(p.lastMatchAt).index - localDay(p.firstMatchAt).index : 0,
    }
}

// ---------------------------------------------------------------------------------------
// Cuenta (entre clubes)
// ---------------------------------------------------------------------------------------

/** Lo que hace falta de una cuenta (de `GET /api/v1/accounts` del auth) */
export interface AccountInfo {
    id: string
    twitchFollowing?: boolean
    twitchSub?: boolean
    twitchSubTier?: string | null
    discordId?: string | null
    createdAt?: string | Date | null
}

const secondLargest = (values: number[]): number => [...values].sort((a, b) => b - a)[1] ?? 0

/**
 * Lo que miran los logros de cuenta. `account` es null si no se ha podido preguntar al auth:
 * entonces solo salen las métricas de juego y las de la cuenta se quedan sin valor (no se
 * desbloquean, pero tampoco se da por hecho que no es sub).
 */
export function accountMetrics(account: AccountInfo | null, clubs: Pick<IPlayerClubTotals, "gamesPlayed" | "wins" | "goals" | "assists" | "lastDay" | "achievements" | "points">[], now = new Date()): Metrics {
    const sum = (f: "gamesPlayed" | "wins" | "goals" | "assists" | "achievements" | "points") => clubs.reduce((acc, c) => acc + (Number(c[f]) || 0), 0)
    const played = clubs.filter((c) => c.gamesPlayed > 0)
    const days = new Map<string, number>()
    for (const c of played) if (c.lastDay) days.set(c.lastDay, (days.get(c.lastDay) ?? 0) + 1)

    const metrics: Metrics = {
        // Solo se evalúa a quien tiene la cuenta vinculada
        playerLinked: 1,
        clubsPlayed: played.length,
        // "en cada uno de dos clubes": lo que lleva en su segundo club con más
        minGamesPerClub: secondLargest(clubs.map((c) => c.gamesPlayed)),
        clubsScored: clubs.filter((c) => c.goals > 0).length,
        minGoalsPerClub: secondLargest(clubs.map((c) => c.goals)),
        sameDayClubs: Math.max(0, ...days.values()),
        totalGamesPlayed: sum("gamesPlayed"),
        totalGoalsScored: sum("goals"),
        totalAssists: sum("assists"),
        totalWins: sum("wins"),
        clubAchievements: sum("achievements"),
        clubPoints: sum("points"),
    }
    if (!account) return metrics

    const follower = !!account.twitchFollowing
    const sub = !!account.twitchSub
    const discord = !!account.discordId
    const created = account.createdAt ? new Date(account.createdAt).getTime() : NaN
    return {
        ...metrics,
        discordLinked: discord ? 1 : 0,
        twitchFollower: follower ? 1 : 0,
        twitchSub: sub ? 1 : 0,
        twitchSubHighTier: sub && ["2000", "3000"].includes(String(account.twitchSubTier)) ? 1 : 0,
        fullPack: discord && follower && sub ? 1 : 0,
        accountAgeDays: Number.isFinite(created) ? Math.floor((now.getTime() - created) / 86_400_000) : 0,
    }
}

// ---------------------------------------------------------------------------------------
// Progreso hacia un logro
// ---------------------------------------------------------------------------------------

export interface IAchievementProgressValue {
    /** lo que lleva */
    current: number
    /** lo que hace falta (en los hitos, el siguiente escalón) */
    target: number
}

/**
 * Cuánto le falta para un logro que aún no tiene (o para el siguiente escalón de un hito), o
 * null si no tiene sentido una barra: logros de un partido, los de "clavar" un valor (`exact`)
 * y los de sí/no (un objetivo de 1, como "conecta Discord").
 */
export function achievementProgress(
    def: Pick<IAchievementDefinition, "scope" | "mode" | "metric" | "step" | "threshold" | "exact">,
    metrics: Metrics,
    lastReached = 0
): IAchievementProgressValue | null {
    if (def.scope !== "cumulative" || def.exact !== undefined) return null
    const value = metrics[def.metric]
    if (value === undefined) return null
    if (def.mode === "infinite") {
        const step = def.step ?? 0
        if (!(step > 0)) return null
        const target = Math.max(lastReached, Math.floor(value / step) * step) + step
        return { current: Math.max(0, value), target }
    }
    const target = def.threshold ?? 1
    if (target <= 1) return null
    return { current: Math.min(Math.max(0, value), target), target }
}
