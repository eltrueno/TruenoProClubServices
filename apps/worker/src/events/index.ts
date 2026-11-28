import type { MqConnection } from "@trueno-proclub-services/mq";
import { createMqConnection } from "../config/rabbitmq.config.js";
import { setupRpc } from "./rpc.js";
import { NewMatchEvent } from "./newMatchEvent.producer.js";
import { MilestoneEvent } from "./milestoneEvent.producer.js";
import { UniqueAchievementEvent } from "./achievementEvent.producer.js";
import { TOTWEvent } from "./totwEvent.producer.js";
import { STATS_RECALCULATE_ROUTING_KEY, type IStatsRecalculatePayload } from "@trueno-proclub-services/shared";
import { handleStatsRecalculate } from "../services/voidMatches.service.js";
import { runExclusive } from "../utils/exclusive.js";

let mqManager: MqConnection
let matchProducer: NewMatchEvent
let milestoneProducer: MilestoneEvent
let uniqueAchievementProducer: UniqueAchievementEvent
let totwProducer: TOTWEvent

export async function setupRabbitmqProducers() {
    mqManager = createMqConnection()
    await mqManager.start()

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
    // RPC con el api (ping, sincronizar / recalcular desde el panel, mantenimientos): cola propia, aparte de los avisos
    await setupRpc(mqManager, clubId)
    await mqManager.consume('worker.stats-recalculate', STATS_RECALCULATE_ROUTING_KEY, (content) =>
        runExclusive(() => handleStatsRecalculate(clubId, content as IStatsRecalculatePayload), "recalculate"))
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
