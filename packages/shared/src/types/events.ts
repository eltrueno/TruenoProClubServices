import type { IAchievementDefinition, IAchievementUnlocked } from "./achievement.js"
import type { IMatch } from "./match.js"
import type { ITOTW } from "./totw.js"

/** Payloads publicados por el worker en RabbitMQ y consumidos por el bot */
export interface IAchievementEventPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }
export type IMilestoneEventPayload = IAchievementEventPayload
export type IMatchEventPayload = IMatch
export type ITotwEventPayload = ITOTW
