import { RabbitMQManager } from "../config/rabbitmq.config.js";
import { NewMatchEvent } from "./newMatchEvent.producer.js";
import { MilestoneEvent } from "./milestoneEvent.producer.js";
import { UniqueAchievementEvent } from "./achievementEvent.producer.js";
import { TOTWEvent } from "./totwEvent.producer.js";
import { STATS_RECALCULATE_ROUTING_KEY, type IStatsRecalculatePayload } from "@trueno-proclub-services/shared";
import { handleStatsRecalculate } from "../services/voidMatches.service.js";
import { runExclusive } from "../utils/exclusive.js";

let mqManager: RabbitMQManager
let matchProducer: NewMatchEvent
let milestoneProducer: MilestoneEvent
let uniqueAchievementProducer: UniqueAchievementEvent
let totwProducer: TOTWEvent

export async function setupRabbitmqProducers() {
    mqManager = new RabbitMQManager()
    await mqManager.connect()

    matchProducer = new NewMatchEvent(mqManager)
    milestoneProducer = new MilestoneEvent(mqManager)
    uniqueAchievementProducer = new UniqueAchievementEvent(mqManager)
    totwProducer = new TOTWEvent(mqManager)
}

/**
 * Avisos que el worker escucha (del api). Cola propia y durable: si el worker está parado, los
 * avisos esperan a que vuelva. El recálculo va por la misma cola que la sincronización.
 */
export async function setupRabbitmqConsumers(clubId: number) {
    if (!mqManager) throw new Error('RabbitMQ not initialized');
    await mqManager.consume('worker.stats-recalculate', STATS_RECALCULATE_ROUTING_KEY, (content) =>
        runExclusive(() => handleStatsRecalculate(clubId, content as IStatsRecalculatePayload)))
}

export function getMatchProducer() {
    if (!matchProducer) throw new Error('Match Producer not initialized');
    return matchProducer;
}

export function getMilestoneProducer() {
    if (!milestoneProducer) throw new Error('Milestone Producer not initialized');
    return milestoneProducer;
}

export function getAchievementProducer() {
    if (!uniqueAchievementProducer) throw new Error('Achievement Producer not initialized');
    return uniqueAchievementProducer;
}

export function getTOTWProducer() {
    if (!totwProducer) throw new Error('TOTW Producer not initialized');
    return totwProducer;
}
