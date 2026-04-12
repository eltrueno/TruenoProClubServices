import { RabbitMQManager } from '@config/rabbitmq.config';
import { IAchievementUnlocked, IAchievementDefinition } from '@interfaces/achievement.interface';

export interface IAchievementPublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class UniqueAchievementEvent {
    constructor(private mqManager: RabbitMQManager) { }

    async publish(payload: IAchievementPublishPayload) {
        /*await this.mqManager.publish('player.achievement.unlock.onetime', payload);
        console.info(`[Event System] 'player.achievement.unlock.onetime' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name})`);
        */
    }
}

