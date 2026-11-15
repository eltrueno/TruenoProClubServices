import type { IAchievementDefinition, IAchievementUnlocked } from "./achievement.js"
import type { IMatch } from "./match.js"
import type { ITOTW } from "./totw.js"

/** Payloads publicados por el worker en RabbitMQ y consumidos por el bot */
export interface IAchievementEventPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }
export type IMilestoneEventPayload = IAchievementEventPayload
export type IMatchEventPayload = IMatch
export type ITotwEventPayload = ITOTW

/**
 * Del api al worker (exchange `events`, routing key `STATS_RECALCULATE_ROUTING_KEY`): un admin ha
 * cambiado algo que afecta a las stats (p. ej. ha marcado un partido como nulo) y el worker tiene
 * que recalcular stats, logros y medias. Si llegan varios seguidos basta con un recálculo.
 */
export interface IStatsRecalculatePayload {
    /** ISO: el worker se salta los avisos anteriores a su último recálculo */
    requestedAt: string
    requestedBy: string | null
    reason: string
    matchId?: number
}
