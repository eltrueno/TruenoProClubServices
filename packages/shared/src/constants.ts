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

export const ACHIEVEMENT_CATEGORIES = [
    "gamesPlayed", "goals", "assists", "redCards", "passesMade", "passesSuccess",
    "manOfTheMatch", "hattricks", "pokers", "cleanSheets", "saves", "minutesPlayed",
    "pass_accuracy", "shot_accuracy", "totwBest", "totwWorst"
] as const
export type AchievementCategory = typeof ACHIEVEMENT_CATEGORIES[number]

export const ACHIEVEMENT_SCOPES = ["cumulative", "match"] as const
export type AchievementScope = typeof ACHIEVEMENT_SCOPES[number]

export const ACHIEVEMENT_TYPES = ["official", "friendly", "general"] as const
export type AchievementType = typeof ACHIEVEMENT_TYPES[number]

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
} as const
export type EventKey = typeof EVENT_KEYS[keyof typeof EVENT_KEYS]

/** Routing key del aviso api → worker para recalcular stats */
export const STATS_RECALCULATE_ROUTING_KEY = EVENT_KEYS.statsRecalculate

/** Roles de usuario (Better Auth `user.role`) */
export enum UserRole {
    visitor = "visitor",
    follower = "follower",
    subscriber = "subscriber",
    vip = "vip",
    mod = "mod",
    admin = "admin"
}
