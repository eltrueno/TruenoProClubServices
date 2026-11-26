/**
 * Constantes y enums compartidos por api, worker, web y bot.
 * Los arrays `as const` sirven tanto para los `enum` de mongoose como para
 * derivar los tipos literales (ver types/*).
 */

export const PLAYER_POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const
export type PlayerPosition = typeof PLAYER_POSITIONS[number]

export const AVERAGE_POSITIONS = [...PLAYER_POSITIONS, "general"] as const
export type AveragePosition = typeof AVERAGE_POSITIONS[number]

export const MATCH_TYPES = ["league", "playoff", "friendly"] as const
export type MatchType = typeof MATCH_TYPES[number]

export const MATCH_RESULTS = ["win", "tie", "loose"] as const
export type MatchResult = typeof MATCH_RESULTS[number]

/**
 * Minutos de juego (en segundos, tiempo de partido) por debajo de los cuales algo no cuenta:
 * - un jugador que juega menos no suma ese partido a sus stats, medias, logros ni TOTW;
 * - un partido en el que nadie (de ninguno de los dos equipos) llega es nulo: se guarda y se ve,
 *   pero no cuenta para nada. Ver `countsForPlayerStats` e `isShortMatch`.
 */
export const MIN_SECONDS_PLAYED = 15 * 60

/** Quién marcó un partido como nulo: el worker por los minutos (`auto`) o un admin a mano */
export const MATCH_VOIDED_BY = ["auto", "admin"] as const
export type MatchVoidedBy = typeof MATCH_VOIDED_BY[number]

/**
 * Qué mide un logro. El worker calcula estas métricas para el jugador (ver
 * apps/worker/src/services/achievementMetrics.ts) y la definición solo dice cuál mira y
 * cuánto hace falta (`step`, `threshold` o `exact`).
 */
export const ACHIEVEMENT_METRICS = [
    // --- acumuladas: totales del jugador en el club (oficiales + amistosos) ---
    "gamesPlayed", "wins", "losses", "ties", "goals", "assists", "shots", "redCards", "passesMade", "passesSuccess",
    "tacklesMade", "tacklesSuccess", "manOfTheMatch", "hattricks", "pokers", "cleanSheets", "goalsConceded", "saves", "minutesPlayed",
    // --- acumuladas: rachas y calendario (estado que se va actualizando partido a partido) ---
    "winStreak", "unbeatenStreak", "lossStreak", "scoringStreak", "assistStreak", "forwardDrought", "sameScoreStreak",
    "positionsPlayed", "positionsScored",
    "dayMatches", "dayPerfectWins", "dayAllLosses", "dayGoals", "daysPlayed", "weekStreak", "weekDaysPlayed", "weekendPlayed",
    "daysSinceLastMatch", "daysSinceFirstMatch",
    // --- de un partido: del jugador ---
    "rating", "lowRating", "pass_accuracy", "shot_accuracy", "debutGoal", "hattrickMotm", "oneNilWinner",
    "gkGoals", "gkAssists", "defenderGoals", "perfectHattrick", "goalAssistMotm", "goalsAndAssists", "cleanSheetSaves",
    "metronome", "cleanTackles", "goalAndRedCard", "ghost", "shotsWithoutGoal", "gkConceded", "motmInLoss", "soloScorer",
    // --- de un partido: del equipo ---
    "winMargin", "shutoutWinMargin", "teamGoals", "totalGoals", "lossMargin", "goallessDraw", "highScoringDraw",
    "penaltyWin", "dnfWin", "fullSquadWin", "outnumberedWin", "playoffWin", "teamScorers", "oneNilSaves", "robbery",
    // --- de un partido: fechas señaladas ---
    "christmasMatch", "newYearMatch", "halloweenMatch", "leapDayMatch",
    // --- equipo de la semana ---
    "totwBest", "totwWorst",
    // --- de cuenta (los evalúa el worker con los datos del auth y los totales entre clubes) ---
    "playerLinked", "discordLinked", "twitchFollower", "twitchSub", "twitchSubHighTier", "fullPack", "accountAgeDays",
    "clubsPlayed", "minGamesPerClub", "clubsScored", "minGoalsPerClub", "sameDayClubs",
    "totalGamesPlayed", "totalGoalsScored", "totalAssists", "totalWins", "clubAchievements", "clubPoints"
] as const
export type AchievementMetric = typeof ACHIEVEMENT_METRICS[number]

/** `cumulative`: sobre el acumulado o el estado del jugador. `match`: sobre un partido concreto */
export const ACHIEVEMENT_SCOPES = ["cumulative", "match"] as const
export type AchievementScope = typeof ACHIEVEMENT_SCOPES[number]

/**
 * De quién es el logro: `club` (del jugador en un club, con todos sus partidos, oficiales y
 * amistosos juntos) o `account` (de la cuenta, común a todos los clubes; hace falta tener la
 * cuenta vinculada al jugador).
 */
export const ACHIEVEMENT_TYPES = ["club", "account"] as const
export type AchievementType = typeof ACHIEVEMENT_TYPES[number]

/** Apartado en el que se enseña el logro (solo para agruparlos en pantalla) */
export const ACHIEVEMENT_CATEGORIES = [
    "milestones", "matches", "attack", "performance", "defense", "discipline", "team", "streaks", "expert", "curiosities",
    "account", "global", "collection"
] as const
export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number]

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
    milestones: "Hitos",
    matches: "Partidos y victorias",
    attack: "Goles y asistencias",
    performance: "Partidazos",
    defense: "Portería y defensa",
    discipline: "Tarjetas",
    team: "De equipo",
    streaks: "Rachas",
    expert: "Para expertos",
    curiosities: "Curiosidades",
    account: "Tu cuenta",
    global: "Entre clubes",
    collection: "Colección"
}

/**
 * Rareza: sale de los puntos (así nunca se contradicen). En los hitos que se repiten, de los
 * puntos de cada escalón.
 */
export const ACHIEVEMENT_RARITIES = ["common", "rare", "epic", "legendary"] as const
export type AchievementRarity = typeof ACHIEVEMENT_RARITIES[number]

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
    common: "Común",
    rare: "Raro",
    epic: "Épico",
    legendary: "Legendario"
}

/** Hasta 10 puntos común, hasta 25 raro, hasta 50 épico y por encima legendario */
/**
 * Logros ocultos: mientras no se consiguen, la web enseña que existen pero no qué son.
 * Lo son las curiosidades y los legendarios.
 */
export const isHiddenAchievement = (category: AchievementCategory, rarity: AchievementRarity): boolean =>
    category === "curiosities" || rarity === "legendary"

export const rarityFromPoints = (points: number): AchievementRarity =>
    points <= 10 ? "common" : points <= 25 ? "rare" : points <= 50 ? "epic" : "legendary"

export const ACHIEVEMENT_MODES = ["infinite", "unique"] as const
export type AchievementMode = typeof ACHIEVEMENT_MODES[number]

export const TOTW_TYPES = ["best", "worst"] as const
export type TotwType = typeof TOTW_TYPES[number]

/** Estados de una solicitud de vinculación cuenta ↔ jugador */
export const LINK_REQUEST_STATUS = ["pending", "approved", "rejected"] as const
export type LinkRequestStatus = typeof LINK_REQUEST_STATUS[number]

/** Routing keys del exchange `events` de RabbitMQ */
export const EVENT_KEYS = {
    matchNew: "match.new",
    achievementMilestone: "player.achievement.unlock.milestone",
    achievementOneTime: "player.achievement.unlock.onetime",
    totwNew: "totw.new",
    /** api → worker: recalcular stats, logros y medias (IStatsRecalculatePayload) */
    statsRecalculate: "stats.recalculate",
    /** api → worker: sincronizar ya con EA (ISyncNowPayload) */
    syncNow: "sync.now",
} as const
export type EventKey = typeof EVENT_KEYS[keyof typeof EVENT_KEYS]

/** Routing key del aviso api → worker para recalcular stats */
export const STATS_RECALCULATE_ROUTING_KEY = EVENT_KEYS.statsRecalculate
/** Routing key del aviso api → worker para sincronizar ya */
export const SYNC_NOW_ROUTING_KEY = EVENT_KEYS.syncNow

/** Roles de usuario (Better Auth `user.role`) */
export enum UserRole {
    visitor = "visitor",
    follower = "follower",
    subscriber = "subscriber",
    vip = "vip",
    mod = "mod",
    admin = "admin"
}
