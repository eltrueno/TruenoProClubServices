import { RabbitMQManager } from '@config/rabbitmq.config';
import { IAchievementUnlocked, IAchievementDefinition } from '@interfaces/achievement.interface';

export interface IMilestonePublishPayload extends IAchievementUnlocked, Omit<IAchievementDefinition, "_id"> { }

export class MilestoneEvent {
    constructor(private mqManager: RabbitMQManager) { }

    async publish(payload: IMilestonePublishPayload) {
        /*await this.mqManager.publish('player.achievement.unlock.milestone', payload);
        console.info(`[Event System] 'player.achievement.unlock.milestone' event published for ${payload.playerName}: ${payload.achievementId} (${payload.name} - Reached: ${payload.reached})`);
        */
    }
}

