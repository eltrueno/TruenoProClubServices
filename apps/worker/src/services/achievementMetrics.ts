import { localDay, progressMetrics, type IAchievementProgress, type IMatch, type IMatchPlayer, type Metrics } from "@trueno-proclub-services/shared"

export { localDay, progressMetrics }

/**
 * Las métricas que miran los logros de club (ver ACHIEVEMENT_METRICS en shared). Aquí no hay
 * base de datos: funciones puras sobre un partido, un jugador y su estado, para poder probarlas.
 *
 * Tres orígenes:
 *   - totales del jugador (la suma de sus stats): los pone playerStats.service
 *   - `matchMetrics`: lo que pasa en UN partido (del jugador y del equipo)
 *   - `advanceProgress` + `progressMetrics`: rachas y calendario, que dependen de los
 *     partidos anteriores. Se guarda un estado por jugador y se avanza partido a partido,
 *     SIEMPRE en orden cronológico.
 */
export type { Metrics } from "@trueno-proclub-services/shared"

/** Partido "entero": a partir del minuto 80 (los partidos pueden acabar antes del 90) */
const FULL_MATCH_SECONDS = 80 * 60

// ---------------------------------------------------------------------------------------
// Calendario (en la hora local del club: un partido a las 00:30 es del día siguiente)
// ---------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------
// Un partido
// ---------------------------------------------------------------------------------------

const num = (v: unknown): number => Number(v) || 0
const flag = (v: boolean): number => (v ? 1 : 0)

/** Nuestro equipo y el rival en un partido */
function sides(match: IMatch, clubId: number) {
    const isLocal = Number(match.localClub.id) === Number(clubId)
    return isLocal ? { ours: match.localClub, theirs: match.awayClub } : { ours: match.awayClub, theirs: match.localClub }
}

/** Marcador real del partido visto desde nuestro lado */
export function scoreOf(match: IMatch, clubId: number): { ours: number, theirs: number } {
    const { ours, theirs } = sides(match, clubId)
    return { ours: num(ours.matchStats?.goals), theirs: num(theirs.matchStats?.goals) }
}

/** Métricas de un partido para un jugador nuestro que ha jugado lo suficiente para que cuente */
export function matchMetrics(match: IMatch, player: IMatchPlayer, clubId: number): Metrics {
    const { ours, theirs } = sides(match, clubId)
    const score = scoreOf(match, clubId)
    const win = match.result === "win"
    const loss = match.result === "loose"
    const tie = match.result === "tie"

    const goals = num(player.goals)
    const assists = num(player.assists)
    const shots = num(player.shots)
    const saves = num(player.saves)
    const passesMade = num(player.passesMade)
    const passAccuracy = passesMade > 0 ? Math.floor((num(player.passesSuccess) / passesMade) * 100) : 0
    const tacklesMade = num(player.tacklesMade)
    const tacklesSuccess = num(player.tacklesSuccess)
    const isKeeper = player.position === "goalkeeper"
    const day = localDay(match.timestamp)

    return {
        // --- del jugador: tal cual ---
        goals, assists, shots, saves, tacklesMade, tacklesSuccess,
        redCards: num(player.redCards),
        passesMade,
        passesSuccess: num(player.passesSuccess),
        goalsConceded: num(player.goalsConceded),
        rating: num(player.rating),
        manOfTheMatch: flag(!!player.manOfTheMatch),
        cleanSheets: flag(!!player.cleanSheet),
        // -1 = sin el mínimo de intentos: ni llega a un `threshold` ni clava un `exact: 0`
        pass_accuracy: passesMade >= 10 ? passAccuracy : -1,
        shot_accuracy: shots >= 3 ? Math.floor((goals / shots) * 100) : -1,

        // --- del jugador: combinaciones ---
        gkGoals: isKeeper ? goals : 0,
        gkAssists: isKeeper ? assists : 0,
        defenderGoals: player.position === "defender" ? goals : 0,
        perfectHattrick: flag(goals >= 3 && shots === goals),
        goalAssistMotm: flag(goals >= 1 && assists >= 1 && !!player.manOfTheMatch),
        goalsAndAssists: Math.min(goals, assists),
        cleanSheetSaves: player.cleanSheet ? saves : 0,
        metronome: passesMade >= 50 ? passAccuracy : 0,
        cleanTackles: tacklesMade > 0 && tacklesSuccess === tacklesMade ? tacklesMade : 0,
        goalAndRedCard: flag(goals >= 1 && num(player.redCards) >= 1),
        ghost: flag(!isKeeper && num(player.secondsPlayed) >= FULL_MATCH_SECONDS && shots === 0 && assists === 0 && tacklesMade === 0),
        shotsWithoutGoal: goals === 0 ? shots : 0,
        gkConceded: isKeeper ? num(player.goalsConceded) : 0,
        motmInLoss: flag(loss && !!player.manOfTheMatch),
        soloScorer: goals === score.ours ? goals : 0,

        // --- del equipo ---
        winMargin: win ? score.ours - score.theirs : 0,
        shutoutWinMargin: win && score.theirs === 0 ? score.ours : 0,
        teamGoals: score.ours,
        totalGoals: score.ours + score.theirs,
        lossMargin: loss ? score.theirs - score.ours : 0,
        goallessDraw: flag(tie && score.ours === 0 && score.theirs === 0),
        highScoringDraw: tie && score.ours === score.theirs ? score.ours : 0,
        penaltyWin: flag(win && !!match.winnerByPen),
        dnfWin: flag(win && !!match.winnerByDnf),
        fullSquadWin: flag(win && ours.players.length >= 11),
        outnumberedWin: flag(win && theirs.players.length > 0 && ours.players.length < theirs.players.length),
        playoffWin: flag(win && match.matchType === "playoff"),
        teamScorers: ours.players.filter((p) => num(p.goals) >= 1).length,

        // --- fechas señaladas ---
        christmasMatch: flag(day.month === 12 && (day.day === 24 || day.day === 25)),
        newYearMatch: flag((day.month === 12 && day.day === 31) || (day.month === 1 && day.day === 1)),
        halloweenMatch: flag(day.month === 10 && day.day === 31),
        leapDayMatch: flag(day.month === 2 && day.day === 29),
    }
}

// ---------------------------------------------------------------------------------------
// Rachas y calendario
// ---------------------------------------------------------------------------------------

export const emptyProgress = (playerId: string): IAchievementProgress => ({
    playerId,
    winStreak: 0, unbeatenStreak: 0, lossStreak: 0,
    scoringStreak: 0, assistStreak: 0, forwardDrought: 0,
    lastScore: null, sameScoreStreak: 0,
    positionsPlayed: [], positionsScored: [],
    day: null, dayMatches: 0, dayWins: 0, dayLosses: 0, dayGoals: 0, daysPlayed: 0,
    week: null, weekStreak: 0, weekDays: [],
    firstMatchAt: null, lastMatchAt: null, daysSinceLastMatch: 0,
})

const withItem = <T>(list: T[], item: T): T[] => (list.includes(item) ? list : [...list, item])

/** El estado del jugador después de este partido (no modifica el que recibe) */
export function advanceProgress(prev: IAchievementProgress | null | undefined, match: IMatch, player: IMatchPlayer, clubId: number): IAchievementProgress {
    const p = prev ?? emptyProgress(player.playerId)
    const score = scoreOf(match, clubId)
    const scoreKey = `${score.ours}-${score.theirs}`
    const win = match.result === "win"
    const loss = match.result === "loose"
    const goals = num(player.goals)
    const day = localDay(match.timestamp)
    const sameDay = p.day === day.key
    const week = String(day.week)
    const sameWeek = p.week === week
    const followingWeek = p.week !== null && Number(p.week) + 1 === day.week

    return {
        playerId: p.playerId,
        winStreak: win ? p.winStreak + 1 : 0,
        unbeatenStreak: loss ? 0 : p.unbeatenStreak + 1,
        lossStreak: loss ? p.lossStreak + 1 : 0,
        scoringStreak: goals >= 1 ? p.scoringStreak + 1 : 0,
        assistStreak: num(player.assists) >= 1 ? p.assistStreak + 1 : 0,
        // Solo cuentan los partidos de delantero; jugar en otra posición ni suma ni corta
        forwardDrought: player.position !== "forward" ? p.forwardDrought : goals >= 1 ? 0 : p.forwardDrought + 1,
        lastScore: scoreKey,
        sameScoreStreak: p.lastScore === scoreKey ? p.sameScoreStreak + 1 : 1,
        positionsPlayed: withItem(p.positionsPlayed, player.position),
        positionsScored: goals >= 1 ? withItem(p.positionsScored, player.position) : p.positionsScored,
        day: day.key,
        dayMatches: sameDay ? p.dayMatches + 1 : 1,
        dayWins: (sameDay ? p.dayWins : 0) + (win ? 1 : 0),
        dayLosses: (sameDay ? p.dayLosses : 0) + (loss ? 1 : 0),
        dayGoals: (sameDay ? p.dayGoals : 0) + goals,
        daysPlayed: sameDay ? p.daysPlayed : p.daysPlayed + 1,
        week,
        weekStreak: sameWeek ? p.weekStreak : followingWeek ? p.weekStreak + 1 : 1,
        weekDays: sameWeek ? withItem(p.weekDays, day.weekday) : [day.weekday],
        firstMatchAt: p.firstMatchAt ?? match.timestamp,
        lastMatchAt: match.timestamp,
        daysSinceLastMatch: p.lastMatchAt ? Math.max(0, day.index - localDay(p.lastMatchAt).index) : 0,
    }
}
