import { Channel } from 'amqplib';
import { EXCHANGE_NAME } from '@config/rabbitmq.config';
import { IAchievementUnlocked, IAchievementDefinition } from '@interfaces/achievement.interface';

export interface IAchievementPublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class UniqueAchievementEvent {
    constructor(private channel: Channel) { }

    async publish(payload: IAchievementPublishPayload) {
        await this.channel.publish(EXCHANGE_NAME, 'player.achievement.unlock.onetime', Buffer.from(JSON.stringify(payload)), {
            persistent: true,
        });
        console.info(`[Event System] 'player.achievement.unlock.onetime' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name})`);
    }
}
