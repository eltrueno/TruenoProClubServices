import { Channel } from 'amqplib';
import { EXCHANGE_NAME } from '@config/rabbitmq.config';
import { IAchievementUnlocked, IAchievementDefinition } from '@interfaces/achievement.interface';

export interface IMilestonePublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class MilestoneEvent {
    constructor(private channel: Channel) { }

    async publish(payload: IMilestonePublishPayload) {
        await this.channel.publish(EXCHANGE_NAME, 'player.achievement.unlock.milestone', Buffer.from(JSON.stringify(payload)), {
            persistent: true,
        });
        console.info(`[Event System] 'player.achievement.unlock.milestone' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name} - Reached: ${payload.reached})`);
    }
}
