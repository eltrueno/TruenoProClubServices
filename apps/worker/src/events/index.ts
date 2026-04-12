import { RabbitMQManager } from '@config/rabbitmq.config';
import { NewMatchEvent } from '@events/newMatchEvent.producer';
import { MilestoneEvent } from '@events/milestoneEvent.producer';
import { UniqueAchievementEvent } from '@events/achievementEvent.producer';
import { TOTWEvent } from '@events/totwEvent.producer';

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
