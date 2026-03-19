import { createConnection } from '@config/rabbitmq.config';
import { NewMatchEvent } from '@events/newMatchEvent.producer';
import { MilestoneEvent } from '@events/milestoneEvent.producer';
import { UniqueAchievementEvent } from '@events/achievementEvent.producer';

let matchProducer: NewMatchEvent
let milestoneProducer: MilestoneEvent
let uniqueAchievementProducer: UniqueAchievementEvent

export async function setupRabbitmqProducers() {
    const { channel } = await createConnection()

    matchProducer = new NewMatchEvent(channel)
    milestoneProducer = new MilestoneEvent(channel)
    uniqueAchievementProducer = new UniqueAchievementEvent(channel)
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
