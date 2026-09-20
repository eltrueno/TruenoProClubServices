import { RabbitMQManager } from "../config/rabbitmq.config.js";
import { NewMatchEvent } from "./newMatchEvent.producer.js";
import { MilestoneEvent } from "./milestoneEvent.producer.js";
import { UniqueAchievementEvent } from "./achievementEvent.producer.js";
import { TOTWEvent } from "./totwEvent.producer.js";

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
